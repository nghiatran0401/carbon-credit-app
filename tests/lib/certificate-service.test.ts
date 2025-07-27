import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Prisma
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    order: {
      findUnique: vi.fn(),
    },
    certificate: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  })),
}));

// Import after mocking
import { CertificateService } from "@/lib/certificate-service";

describe("CertificateService", () => {
  let certificateService: CertificateService;

  beforeEach(() => {
    vi.clearAllMocks();
    certificateService = new CertificateService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("certificate hash generation", () => {
    it("should generate consistent hash for same data", () => {
      const data1 = {
        certificateId: "CC-1-123",
        orderId: 1,
        userId: 1,
        totalCredits: 10,
        totalValue: 150.0,
        purchaseDate: "2024-01-01T00:00:00.000Z",
      };

      const data2 = {
        certificateId: "CC-1-123",
        orderId: 1,
        userId: 1,
        totalCredits: 10,
        totalValue: 150.0,
        purchaseDate: "2024-01-01T00:00:00.000Z",
      };

      // Access the private method through the service instance
      const service = certificateService as any;
      const hash1 = service.generateCertificateHash(data1);
      const hash2 = service.generateCertificateHash(data2);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash format
    });

    it("should generate different hashes for different data", () => {
      const data1 = {
        certificateId: "CC-1-123",
        orderId: 1,
        userId: 1,
        totalCredits: 10,
        totalValue: 150.0,
        purchaseDate: "2024-01-01T00:00:00.000Z",
      };

      const data2 = {
        certificateId: "CC-1-123",
        orderId: 1,
        userId: 1,
        totalCredits: 20, // Different value
        totalValue: 150.0,
        purchaseDate: "2024-01-01T00:00:00.000Z",
      };

      const service = certificateService as any;
      const hash1 = service.generateCertificateHash(data1);
      const hash2 = service.generateCertificateHash(data2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("certificate data preparation", () => {
    it("should prepare certificate data correctly", () => {
      const mockOrder = {
        id: 1,
        userId: 1,
        status: "Completed",
        totalCredits: 10,
        totalPrice: 150.0,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        user: {
          id: 1,
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
        items: [
          {
            id: 1,
            carbonCreditId: 1,
            quantity: 10,
            pricePerCredit: 15.0,
            subtotal: 150.0,
            carbonCredit: {
              id: 1,
              certification: "CCB",
              vintage: 2024,
              forest: {
                id: 1,
                name: "Test Forest",
                type: "Tropical",
              },
            },
          },
        ],
      };

      const service = certificateService as any;
      const result = service.prepareCertificateData(mockOrder);

      expect(result).toEqual(
        expect.objectContaining({
          orderId: 1,
          userId: 1,
          userName: "John Doe",
          userEmail: "john@example.com",
          forestName: "Test Forest",
          forestType: "Tropical",
          totalCredits: 10,
          totalValue: 150.0,
          items: expect.arrayContaining([
            expect.objectContaining({
              certification: "CCB",
              vintage: 2024,
              quantity: 10,
              pricePerCredit: 15.0,
              subtotal: 150.0,
            }),
          ]),
        })
      );
    });

    it("should handle missing forest data gracefully", () => {
      const mockOrder = {
        id: 1,
        userId: 1,
        status: "Completed",
        totalCredits: 10,
        totalPrice: 150.0,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        user: {
          id: 1,
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
        items: [
          {
            id: 1,
            carbonCreditId: 1,
            quantity: 10,
            pricePerCredit: 15.0,
            subtotal: 150.0,
            carbonCredit: {
              id: 1,
              certification: "CCB",
              vintage: 2024,
              forest: null,
            },
          },
        ],
      };

      const service = certificateService as any;
      const result = service.prepareCertificateData(mockOrder);

      expect(result).toEqual(
        expect.objectContaining({
          forestName: "Unknown Forest",
          forestType: "Unknown Type",
        })
      );
    });
  });

  describe("service instantiation", () => {
    it("should create service instance with correct base URL", () => {
      expect(certificateService).toBeInstanceOf(CertificateService);

      const service = certificateService as any;
      expect(service.baseUrl).toBeDefined();
    });
  });
});
