import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/certificates/route';
import { certificateService } from '@/lib/certificate-service';
import type { Certificate } from '@/types';

const mockOrderFindUnique = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
    },
  },
}));

vi.mock('@/lib/certificate-service', () => ({
  certificateService: {
    generateCertificate: vi.fn(),
    getCertificateById: vi.fn(),
    getCertificateByOrderId: vi.fn(),
    getUserCertificates: vi.fn(),
  },
}));

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

describe('Certificate API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/certificates', () => {
    it('should fetch certificate by ID', async () => {
      const mockCertificate = {
        id: 'test-cert-id',
        orderId: 1,
        certificateHash: 'test-hash',
        issuedAt: '2024-01-01T00:00:00.000Z',
        status: 'active',
        order: { userId: 1 },
        metadata: {
          userName: 'Test User',
          userEmail: 'test@example.com',
          forestName: 'Test Forest',
          totalCredits: 10,
          totalValue: 150.0,
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      } as unknown as Certificate;

      vi.mocked(certificateService.getCertificateById).mockResolvedValue(mockCertificate);

      const request = mockRequest({}, 'GET', { id: 'test-cert-id' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCertificate);
      expect(certificateService.getCertificateById).toHaveBeenCalledWith('test-cert-id');
    });

    it('should fetch certificate by order ID', async () => {
      const mockCertificate = {
        id: 'test-cert-id',
        orderId: 1,
        certificateHash: 'test-hash',
        issuedAt: '2024-01-01T00:00:00.000Z',
        status: 'active',
        metadata: {
          userName: 'Test User',
          userEmail: 'test@example.com',
          forestName: 'Test Forest',
          totalCredits: 10,
          totalValue: 150.0,
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockOrderFindUnique.mockResolvedValue({ userId: 1 });
      vi.mocked(certificateService.getCertificateByOrderId).mockResolvedValue(mockCertificate);

      const request = mockRequest({}, 'GET', { orderId: '1' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCertificate);
      expect(certificateService.getCertificateByOrderId).toHaveBeenCalledWith(1);
    });

    it('should fetch user certificates', async () => {
      const mockCertificates = [
        {
          id: 'cert-1',
          orderId: 1,
          certificateHash: 'hash-1',
          issuedAt: '2024-01-01T00:00:00.000Z',
          status: 'active',
          metadata: {
            userName: 'Test User',
            userEmail: 'test@example.com',
            forestName: 'Test Forest',
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
            userName: 'Test User',
            userEmail: 'test@example.com',
            forestName: 'Another Forest',
            totalCredits: 5,
            totalValue: 75.0,
          },
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      vi.mocked(certificateService.getUserCertificates).mockResolvedValue(mockCertificates);

      const request = mockRequest({}, 'GET', { userId: '1' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCertificates);
      expect(certificateService.getUserCertificates).toHaveBeenCalledWith(1);
    });

    it('should return 404 when certificate not found by ID', async () => {
      vi.mocked(certificateService.getCertificateById).mockResolvedValue(null);

      const request = mockRequest({}, 'GET', { id: 'non-existent' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Certificate not found');
    });

    it('should return 404 when certificate not found by order ID', async () => {
      mockOrderFindUnique.mockResolvedValue({ userId: 1 });
      vi.mocked(certificateService.getCertificateByOrderId).mockResolvedValue(null);

      const request = mockRequest({}, 'GET', { orderId: '999' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Certificate not found');
    });

    it('should return 400 when no parameters provided', async () => {
      const request = mockRequest({}, 'GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing id, orderId, or userId parameter');
    });

    it('should return 403 when user does not own the certificate', async () => {
      const otherUserCert = {
        id: 'other-cert',
        orderId: 5,
        order: { userId: 999 },
        certificateHash: 'hash',
        status: 'active',
        issuedAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      } as unknown as Certificate;
      vi.mocked(certificateService.getCertificateById).mockResolvedValue(otherUserCert);

      const request = mockRequest({}, 'GET', { id: 'other-cert' });
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(certificateService.getCertificateById).mockRejectedValue(
        new Error('Database error'),
      );

      const request = mockRequest({}, 'GET', { id: 'test-id' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch certificates');
    });
  });

  describe('POST /api/certificates', () => {
    it('should generate certificate successfully', async () => {
      const mockCertificate = {
        id: 'new-cert-id',
        orderId: 1,
        certificateHash: 'new-hash',
        issuedAt: '2024-01-01T00:00:00.000Z',
        status: 'active',
        metadata: {
          userName: 'Test User',
          userEmail: 'test@example.com',
          forestName: 'Test Forest',
          totalCredits: 10,
          totalValue: 150.0,
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockOrderFindUnique.mockResolvedValue({ userId: 1 });
      vi.mocked(certificateService.generateCertificate).mockResolvedValue(mockCertificate);

      const request = mockRequest({ orderId: 1 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCertificate);
      expect(certificateService.generateCertificate).toHaveBeenCalledWith(1);
    });

    it('should return 400 when orderId is missing', async () => {
      const request = mockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing or invalid orderId');
    });

    it('should handle certificate generation errors', async () => {
      mockOrderFindUnique.mockResolvedValue({ userId: 1 });
      vi.mocked(certificateService.generateCertificate).mockRejectedValue(
        new Error('Order not found'),
      );

      const request = mockRequest({ orderId: 999 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate certificate');
    });
  });
});
