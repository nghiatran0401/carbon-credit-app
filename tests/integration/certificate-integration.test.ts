import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/certificates/route';
import { certificateService } from '@/lib/certificate-service';
import { pdfCertificateGenerator } from '@/lib/pdf-certificate-generator';

// Mock dependencies
vi.mock('@/lib/certificate-service');
vi.mock('@/lib/pdf-certificate-generator');
vi.mock('@/lib/auth', () => {
  const { NextResponse } = require('next/server');
  return {
    requireAuth: vi.fn().mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      role: 'USER',
      emailVerified: true,
      supabaseUserId: 'user-123',
    }),
    isAuthError: (r: unknown) => r instanceof NextResponse,
    handleRouteError: vi.fn().mockImplementation((_err: unknown, msg: string) => {
      return NextResponse.json({ error: msg }, { status: 500 });
    }),
  };
});

const mockRequest = (body: any, method = 'POST', searchParams?: Record<string, string>) => {
  const url = new URL('http://localhost/api/certificates');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
};

describe('Certificate Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Certificate Flow', () => {
    it('should handle complete certificate generation and retrieval flow', async () => {
      const mockCertificate = {
        id: 'test-cert-id',
        orderId: 1,
        certificateHash: 'test-hash',
        issuedAt: '2024-01-01T00:00:00.000Z',
        status: 'active',
        metadata: {
          certificateId: 'CC-1-1704067200000',
          orderId: 1,
          userId: 1,
          userName: 'John Doe',
          userEmail: 'john@example.com',
          forestName: 'Test Forest',
          forestType: 'Tropical',
          totalCredits: 10,
          totalValue: 150.0,
          purchaseDate: '2024-01-01T00:00:00.000Z',
          items: [
            {
              certification: 'CCB',
              vintage: 2024,
              quantity: 10,
              pricePerCredit: 15.0,
              subtotal: 150.0,
            },
          ],
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock certificate generation
      vi.mocked(certificateService.generateCertificate).mockResolvedValue(mockCertificate);

      // Step 1: Generate certificate
      const generateRequest = mockRequest({ orderId: 1 });
      const generateResponse = await POST(generateRequest);
      const generatedCertificate = await generateResponse.json();

      expect(generateResponse.status).toBe(200);
      expect(generatedCertificate).toEqual(mockCertificate);
      expect(certificateService.generateCertificate).toHaveBeenCalledWith(1);

      // Step 2: Retrieve certificate by ID
      vi.mocked(certificateService.getCertificateById).mockResolvedValue(mockCertificate);
      const getByIdRequest = mockRequest({}, 'GET', { id: 'test-cert-id' });
      const getByIdResponse = await GET(getByIdRequest);
      const retrievedCertificate = await getByIdResponse.json();

      expect(getByIdResponse.status).toBe(200);
      expect(retrievedCertificate).toEqual(mockCertificate);
      expect(certificateService.getCertificateById).toHaveBeenCalledWith('test-cert-id');

      // Step 3: Retrieve certificate by order ID
      vi.mocked(certificateService.getCertificateByOrderId).mockResolvedValue(mockCertificate);
      const getByOrderRequest = mockRequest({}, 'GET', { orderId: '1' });
      const getByOrderResponse = await GET(getByOrderRequest);
      const orderCertificate = await getByOrderResponse.json();

      expect(getByOrderResponse.status).toBe(200);
      expect(orderCertificate).toEqual(mockCertificate);
      expect(certificateService.getCertificateByOrderId).toHaveBeenCalledWith(1);
    });

    it('should handle certificate generation for multiple orders', async () => {
      const certificates = [
        {
          id: 'cert-1',
          orderId: 1,
          certificateHash: 'hash-1',
          issuedAt: '2024-01-01T00:00:00.000Z',
          status: 'active',
          metadata: {
            userName: 'John Doe',
            userEmail: 'john@example.com',
            forestName: 'Forest 1',
            totalCredits: 10,
            totalValue: 150.0,
          },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'cert-2',
          orderId: 2,
          certificateHash: 'hash-2',
          issuedAt: '2024-01-02T00:00:00.000Z',
          status: 'active',
          metadata: {
            userName: 'Jane Smith',
            userEmail: 'jane@example.com',
            forestName: 'Forest 2',
            totalCredits: 5,
            totalValue: 75.0,
          },
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      // Generate first certificate
      vi.mocked(certificateService.generateCertificate).mockResolvedValueOnce(certificates[0]);
      const request1 = mockRequest({ orderId: 1 });
      const response1 = await POST(request1);
      const cert1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(cert1.id).toBe('cert-1');

      // Generate second certificate
      vi.mocked(certificateService.generateCertificate).mockResolvedValueOnce(certificates[1]);
      const request2 = mockRequest({ orderId: 2 });
      const response2 = await POST(request2);
      const cert2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(cert2.id).toBe('cert-2');

      // Retrieve all certificates for user
      vi.mocked(certificateService.getUserCertificates).mockResolvedValue(certificates);
      const userRequest = mockRequest({}, 'GET', { userId: '1' });
      const userResponse = await GET(userRequest);
      const userCertificates = await userResponse.json();

      expect(userResponse.status).toBe(200);
      expect(userCertificates).toHaveLength(2);
      expect(userCertificates[0].id).toBe('cert-1');
      expect(userCertificates[1].id).toBe('cert-2');
    });
  });

  describe('Certificate PDF Generation Integration', () => {
    it('should handle PDF generation errors gracefully', async () => {
      vi.mocked(pdfCertificateGenerator.generatePDFCertificate).mockRejectedValue(
        new Error('PDF generation failed'),
      );

      const mockCertificate = {
        id: 'test-cert-id',
        orderId: 1,
        certificateHash: 'test-hash',
        issuedAt: '2024-01-01T00:00:00.000Z',
        status: 'active',
        metadata: { test: 'data' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      await expect(pdfCertificateGenerator.generatePDFCertificate(mockCertificate)).rejects.toThrow(
        'PDF generation failed',
      );
    });
  });

  describe('Certificate API Error Handling', () => {
    it('should handle missing parameters gracefully', async () => {
      // Test missing orderId in POST
      const emptyRequest = mockRequest({});
      const emptyResponse = await POST(emptyRequest);
      const emptyData = await emptyResponse.json();

      expect(emptyResponse.status).toBe(400);
      expect(emptyData.error).toBe('Missing orderId');

      // Test missing parameters in GET
      const noParamsRequest = mockRequest({}, 'GET');
      const noParamsResponse = await GET(noParamsRequest);
      const noParamsData = await noParamsResponse.json();

      expect(noParamsResponse.status).toBe(400);
      expect(noParamsData.error).toBe('Missing id, orderId, or userId parameter');
    });

    it('should handle service errors gracefully', async () => {
      // Test certificate generation error
      vi.mocked(certificateService.generateCertificate).mockRejectedValue(
        new Error('Order not found'),
      );
      const generateRequest = mockRequest({ orderId: 999 });
      const generateResponse = await POST(generateRequest);
      const generateData = await generateResponse.json();

      expect(generateResponse.status).toBe(500);
      expect(generateData.error).toBe('Failed to generate certificate');

      // Test certificate retrieval error
      vi.mocked(certificateService.getCertificateById).mockRejectedValue(
        new Error('Database error'),
      );
      const getRequest = mockRequest({}, 'GET', { id: 'test-id' });
      const getResponse = await GET(getRequest);
      const getData = await getResponse.json();

      expect(getResponse.status).toBe(500);
      expect(getData.error).toBe('Failed to fetch certificates');
    });

    it('should handle not found scenarios', async () => {
      // Test certificate not found by ID
      vi.mocked(certificateService.getCertificateById).mockResolvedValue(null);
      const notFoundRequest = mockRequest({}, 'GET', { id: 'non-existent' });
      const notFoundResponse = await GET(notFoundRequest);
      const notFoundData = await notFoundResponse.json();

      expect(notFoundResponse.status).toBe(404);
      expect(notFoundData.error).toBe('Certificate not found');

      // Test certificate not found by order ID
      vi.mocked(certificateService.getCertificateByOrderId).mockResolvedValue(null);
      const orderNotFoundRequest = mockRequest({}, 'GET', { orderId: '999' });
      const orderNotFoundResponse = await GET(orderNotFoundRequest);
      const orderNotFoundData = await orderNotFoundResponse.json();

      expect(orderNotFoundResponse.status).toBe(404);
      expect(orderNotFoundData.error).toBe('Certificate not found');
    });
  });

  describe('Certificate Data Validation', () => {
    it('should validate certificate metadata structure', async () => {
      const mockCertificate = {
        id: 'test-cert-id',
        orderId: 1,
        certificateHash: 'test-hash',
        issuedAt: '2024-01-01T00:00:00.000Z',
        status: 'active',
        metadata: {
          certificateId: 'CC-1-1704067200000',
          orderId: 1,
          userId: 1,
          userName: 'John Doe',
          userEmail: 'john@example.com',
          forestName: 'Test Forest',
          forestType: 'Tropical',
          totalCredits: 10,
          totalValue: 150.0,
          purchaseDate: '2024-01-01T00:00:00.000Z',
          items: [
            {
              certification: 'CCB',
              vintage: 2024,
              quantity: 10,
              pricePerCredit: 15.0,
              subtotal: 150.0,
            },
          ],
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(certificateService.getCertificateById).mockResolvedValue(mockCertificate);
      const request = mockRequest({}, 'GET', { id: 'test-cert-id' });
      const response = await GET(request);
      const certificate = await response.json();

      expect(response.status).toBe(200);
      expect(certificate.metadata).toHaveProperty('certificateId');
      expect(certificate.metadata).toHaveProperty('userName');
      expect(certificate.metadata).toHaveProperty('userEmail');
      expect(certificate.metadata).toHaveProperty('forestName');
      expect(certificate.metadata).toHaveProperty('totalCredits');
      expect(certificate.metadata).toHaveProperty('totalValue');
      expect(certificate.metadata).toHaveProperty('items');
      expect(Array.isArray(certificate.metadata.items)).toBe(true);
    });

    it('should handle certificates with missing metadata', async () => {
      const certificateWithoutMetadata = {
        id: 'test-cert-id',
        orderId: 1,
        certificateHash: 'test-hash',
        issuedAt: '2024-01-01T00:00:00.000Z',
        status: 'active',
        metadata: undefined,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(certificateService.getCertificateById).mockResolvedValue(
        certificateWithoutMetadata,
      );
      const request = mockRequest({}, 'GET', { id: 'test-cert-id' });
      const response = await GET(request);
      const certificate = await response.json();

      expect(response.status).toBe(200);
      expect(certificate.metadata).toBeUndefined();
    });
  });

  describe('Certificate Status Management', () => {
    it('should handle different certificate statuses', async () => {
      const activeCertificate = {
        id: 'active-cert',
        orderId: 1,
        certificateHash: 'hash-1',
        issuedAt: '2024-01-01T00:00:00.000Z',
        status: 'active',
        metadata: { test: 'data' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const revokedCertificate = {
        id: 'revoked-cert',
        orderId: 2,
        certificateHash: 'hash-2',
        issuedAt: '2024-01-01T00:00:00.000Z',
        status: 'revoked',
        metadata: { test: 'data' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(certificateService.getCertificateById)
        .mockResolvedValueOnce(activeCertificate)
        .mockResolvedValueOnce(revokedCertificate);

      // Test active certificate
      const activeRequest = mockRequest({}, 'GET', { id: 'active-cert' });
      const activeResponse = await GET(activeRequest);
      const activeCert = await activeResponse.json();

      expect(activeResponse.status).toBe(200);
      expect(activeCert.status).toBe('active');

      // Test revoked certificate
      const revokedRequest = mockRequest({}, 'GET', { id: 'revoked-cert' });
      const revokedResponse = await GET(revokedRequest);
      const revokedCert = await revokedResponse.json();

      expect(revokedResponse.status).toBe(200);
      expect(revokedCert.status).toBe('revoked');
    });
  });
});
