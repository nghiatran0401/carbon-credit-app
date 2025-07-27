import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/certificates/route";
import { certificateService } from "@/lib/certificate-service";

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

// Mock certificate service
vi.mock("@/lib/certificate-service", () => ({
  certificateService: {
    generateCertificate: vi.fn(),
    getCertificateById: vi.fn(),
    getCertificateByOrderId: vi.fn(),
    getUserCertificates: vi.fn(),
  },
}));

const mockRequest = (body: any, method = "POST", searchParams?: Record<string, string>) => {
  const url = new URL("http://localhost/api/certificates");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
};

describe("Certificate API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/certificates", () => {
    it("should fetch certificate by ID", async () => {
      const mockCertificate = {
        id: "test-cert-id",
        orderId: 1,
        certificateHash: "test-hash",
        issuedAt: "2024-01-01T00:00:00.000Z",
        status: "active",
        metadata: {
          userName: "Test User",
          userEmail: "test@example.com",
          forestName: "Test Forest",
          totalCredits: 10,
          totalValue: 150.0,
        },
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      vi.mocked(certificateService.getCertificateById).mockResolvedValue(mockCertificate);

      const request = mockRequest({}, "GET", { id: "test-cert-id" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCertificate);
      expect(certificateService.getCertificateById).toHaveBeenCalledWith("test-cert-id");
    });

    it("should fetch certificate by order ID", async () => {
      const mockCertificate = {
        id: "test-cert-id",
        orderId: 1,
        certificateHash: "test-hash",
        issuedAt: "2024-01-01T00:00:00.000Z",
        status: "active",
        metadata: {
          userName: "Test User",
          userEmail: "test@example.com",
          forestName: "Test Forest",
          totalCredits: 10,
          totalValue: 150.0,
        },
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      vi.mocked(certificateService.getCertificateByOrderId).mockResolvedValue(mockCertificate);

      const request = mockRequest({}, "GET", { orderId: "1" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCertificate);
      expect(certificateService.getCertificateByOrderId).toHaveBeenCalledWith(1);
    });

    it("should fetch user certificates", async () => {
      const mockCertificates = [
        {
          id: "cert-1",
          orderId: 1,
          certificateHash: "hash-1",
          issuedAt: "2024-01-01T00:00:00.000Z",
          status: "active",
          metadata: {
            userName: "Test User",
            userEmail: "test@example.com",
            forestName: "Test Forest",
            totalCredits: 10,
            totalValue: 150.0,
          },
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "cert-2",
          orderId: 2,
          certificateHash: "hash-2",
          issuedAt: "2024-01-02T00:00:00.000Z",
          status: "active",
          metadata: {
            userName: "Test User",
            userEmail: "test@example.com",
            forestName: "Another Forest",
            totalCredits: 5,
            totalValue: 75.0,
          },
          createdAt: "2024-01-02T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
      ];

      vi.mocked(certificateService.getUserCertificates).mockResolvedValue(mockCertificates);

      const request = mockRequest({}, "GET", { userId: "1" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCertificates);
      expect(certificateService.getUserCertificates).toHaveBeenCalledWith(1);
    });

    it("should return 404 when certificate not found by ID", async () => {
      vi.mocked(certificateService.getCertificateById).mockResolvedValue(null);

      const request = mockRequest({}, "GET", { id: "non-existent" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Certificate not found");
    });

    it("should return 404 when certificate not found by order ID", async () => {
      vi.mocked(certificateService.getCertificateByOrderId).mockResolvedValue(null);

      const request = mockRequest({}, "GET", { orderId: "999" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Certificate not found");
    });

    it("should return 400 when no parameters provided", async () => {
      const request = mockRequest({}, "GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing id, orderId, or userId parameter");
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(certificateService.getCertificateById).mockRejectedValue(new Error("Database error"));

      const request = mockRequest({}, "GET", { id: "test-id" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });
  });

  describe("POST /api/certificates", () => {
    it("should generate certificate successfully", async () => {
      const mockCertificate = {
        id: "new-cert-id",
        orderId: 1,
        certificateHash: "new-hash",
        issuedAt: "2024-01-01T00:00:00.000Z",
        status: "active",
        metadata: {
          userName: "Test User",
          userEmail: "test@example.com",
          forestName: "Test Forest",
          totalCredits: 10,
          totalValue: 150.0,
        },
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      vi.mocked(certificateService.generateCertificate).mockResolvedValue(mockCertificate);

      const request = mockRequest({ orderId: 1 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCertificate);
      expect(certificateService.generateCertificate).toHaveBeenCalledWith(1);
    });

    it("should return 400 when orderId is missing", async () => {
      const request = mockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing orderId");
    });

    it("should handle certificate generation errors", async () => {
      vi.mocked(certificateService.generateCertificate).mockRejectedValue(new Error("Order not found"));

      const request = mockRequest({ orderId: 999 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Order not found");
    });
  });
});
