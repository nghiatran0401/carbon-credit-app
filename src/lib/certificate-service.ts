import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";
import type { Certificate, Order, User, CarbonCredit, Forest } from "../types";

// Helper function to convert Prisma Date to string
function convertPrismaDates(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  const converted = { ...obj };
  for (const [key, value] of Object.entries(converted)) {
    if (value instanceof Date) {
      converted[key] = value.toISOString();
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      converted[key] = convertPrismaDates(value);
    } else if (Array.isArray(value)) {
      converted[key] = value.map((item) => (typeof item === "object" && item !== null ? convertPrismaDates(item) : item));
    }
  }
  return converted;
}

const prisma = new PrismaClient();

export interface CertificateData {
  certificateId: string;
  orderId: number;
  userId: number;
  userName: string;
  userEmail: string;
  forestName: string;
  forestType: string;
  totalCredits: number;
  totalValue: number;
  purchaseDate: string;
  certificateHash: string;
  items: Array<{
    certification: string;
    vintage: number;
    quantity: number;
    pricePerCredit: number;
    subtotal: number;
  }>;
}

export class CertificateService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  }

  /**
   * Generate a certificate for a completed order
   */
  async generateCertificate(orderId: number): Promise<Certificate> {
    // Get order with all related data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            carbonCredit: {
              include: {
                forest: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== "Completed") {
      throw new Error(`Order ${orderId} is not completed`);
    }

    // Check if certificate already exists
    const existingCertificate = await (prisma as any).certificate.findUnique({
      where: { orderId },
    });

    if (existingCertificate) {
      return convertPrismaDates(existingCertificate);
    }

    // Prepare certificate data
    const certificateData = this.prepareCertificateData(order);

    // Generate certificate hash
    const certificateHash = this.generateCertificateHash(certificateData);

    // Create certificate in database
    const certificate = await (prisma as any).certificate.create({
      data: {
        orderId,
        certificateHash,
        metadata: certificateData as any,
        status: "active",
      },
    });

    return convertPrismaDates(certificate);
  }

  /**
   * Prepare certificate data from order
   */
  private prepareCertificateData(order: any): CertificateData {
    const items = order.items.map((item: any) => ({
      certification: item.carbonCredit.certification,
      vintage: item.carbonCredit.vintage,
      quantity: item.quantity,
      pricePerCredit: item.pricePerCredit,
      subtotal: item.subtotal,
    }));

    const certificateId = `CC-${order.id}-${Date.now()}`;

    return {
      certificateId,
      orderId: order.id,
      userId: order.userId,
      userName: `${order.user.firstName} ${order.user.lastName}`,
      userEmail: order.user.email,
      forestName: order.items[0]?.carbonCredit?.forest?.name || "Unknown Forest",
      forestType: order.items[0]?.carbonCredit?.forest?.type || "Unknown Type",
      totalCredits: order.totalCredits,
      totalValue: order.totalPrice,
      purchaseDate: order.createdAt.toISOString(),
      certificateHash: "", // Will be set after generation
      items,
    };
  }

  /**
   * Generate SHA-256 hash of certificate data
   */
  private generateCertificateHash(data: CertificateData): string {
    const dataString = JSON.stringify({
      certificateId: data.certificateId,
      orderId: data.orderId,
      userId: data.userId,
      totalCredits: data.totalCredits,
      totalValue: data.totalValue,
      purchaseDate: data.purchaseDate,
    });

    return crypto.createHash("sha256").update(dataString).digest("hex");
  }

  /**
   * Get certificate by ID
   */
  async getCertificateById(certificateId: string): Promise<Certificate | null> {
    const certificate = await (prisma as any).certificate.findUnique({
      where: { id: certificateId },
      include: {
        order: {
          include: {
            user: true,
            items: {
              include: {
                carbonCredit: {
                  include: {
                    forest: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return certificate ? convertPrismaDates(certificate) : null;
  }

  /**
   * Get certificate by order ID
   */
  async getCertificateByOrderId(orderId: number): Promise<Certificate | null> {
    const certificate = await (prisma as any).certificate.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            user: true,
            items: {
              include: {
                carbonCredit: {
                  include: {
                    forest: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return certificate ? convertPrismaDates(certificate) : null;
  }

  /**
   * Get all certificates for a user
   */
  async getUserCertificates(userId: number): Promise<Certificate[]> {
    const certificates = await (prisma as any).certificate.findMany({
      where: {
        order: {
          userId,
        },
      },
      include: {
        order: {
          include: {
            user: true,
            items: {
              include: {
                carbonCredit: {
                  include: {
                    forest: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return certificates.map(convertPrismaDates);
  }
}

// Export singleton instance
export const certificateService = new CertificateService();
