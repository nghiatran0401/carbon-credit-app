import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockOrder, mockVerifyWebhookSignature } = vi.hoisted(() => ({
  mockOrder: {
    id: 1,
    orderCode: 17400001234,
    userId: 1,
    status: 'PENDING',
    totalPrice: 21,
    paidAt: null as Date | null,
    items: [{ id: 1, quantity: 2, carbonCredit: { id: 1 } }],
  },
  mockVerifyWebhookSignature: vi.fn().mockResolvedValue({
    orderCode: 17400001234,
    amount: 2100,
    description: 'Carbon Credits',
    reference: 'ref_123',
    transactionDateTime: '2026-02-22T10:00:00Z',
    paymentLinkId: 'pl_test_123',
    code: '00',
    desc: 'Success',
    accountNumber: '1234567890',
    accountName: 'Test',
    currency: 'USD',
  }),
}));

vi.mock('@/lib/env', () => ({
  env: {
    PAYOS_CLIENT_ID: 'test-client-id',
    PAYOS_API_KEY: 'test-api-key',
    PAYOS_CHECKSUM_KEY: 'test-checksum-key',
    NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: vi.fn().mockResolvedValue(mockOrder),
      update: vi.fn().mockResolvedValue({ ...mockOrder, status: 'COMPLETED', paidAt: new Date() }),
    },
    orderHistory: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
    },
    cartItem: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock('@/lib/payment-service', () => ({
  paymentService: {
    processPayOSWebhook: vi.fn().mockResolvedValue({ processed: true }),
  },
}));

vi.mock('@/lib/payos-service', () => ({
  getPayOSService: vi.fn().mockReturnValue({
    verifyWebhookSignature: mockVerifyWebhookSignature,
  }),
}));

vi.mock('@/lib/certificate-service', () => ({
  certificateService: {
    generateCertificate: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/notification-service', () => ({
  notificationService: {
    createOrderNotification: vi.fn().mockResolvedValue(undefined),
    createPaymentNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/order-audit-middleware', () => ({
  orderAuditMiddleware: {
    ensureOrderAudit: vi.fn().mockResolvedValue({ created: false, exists: true }),
  },
}));

vi.mock('@/lib/carbon-movement-service', () => ({
  carbonMovementService: {
    trackOrderMovement: vi.fn().mockResolvedValue(undefined),
  },
}));

import { POST, GET } from '@/app/api/webhook/route';

const payosWebhookPayload = {
  code: '00',
  desc: 'Success',
  success: true,
  data: {
    orderCode: 17400001234,
    amount: 2100,
    description: 'Carbon Credits',
    reference: 'ref_123',
    transactionDateTime: '2026-02-22T10:00:00Z',
    paymentLinkId: 'pl_test_123',
    code: '00',
    desc: 'Success',
    accountNumber: '1234567890',
    accountName: 'Test',
    currency: 'USD',
  },
  signature: 'valid_sig_xxx',
};

const webhookRequest = (body: string) =>
  new NextRequest('http://localhost/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

describe('Webhook API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('successfully handles a payOS payment success webhook', async () => {
    const req = webhookRequest(JSON.stringify(payosWebhookPayload));
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.orderCode).toBe(17400001234);
  });

  it('returns 200 for empty body (validation request)', async () => {
    const req = webhookRequest('');
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe('Webhook endpoint is active');
  });

  it('returns 400 for invalid JSON', async () => {
    const req = webhookRequest('not json');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid JSON');
  });

  it('returns 401 when webhook signature verification fails', async () => {
    mockVerifyWebhookSignature.mockRejectedValueOnce(new Error('Invalid signature'));

    const req = webhookRequest(JSON.stringify(payosWebhookPayload));
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid signature');
  });

  it('returns 200 when order is not found (prevents retries)', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(null);

    const req = webhookRequest(JSON.stringify(payosWebhookPayload));
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toMatch(/order not found/i);
  });

  it('handles already-processed webhooks gracefully', async () => {
    const { paymentService } = await import('@/lib/payment-service');
    vi.mocked(paymentService.processPayOSWebhook).mockResolvedValueOnce({ processed: false });

    const req = webhookRequest(JSON.stringify(payosWebhookPayload));
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe('Webhook already processed');
  });

  it('GET returns health check info', async () => {
    const req = new NextRequest('http://localhost/api/webhook', { method: 'GET' });
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toMatch(/PayOS webhook endpoint/);
  });
});
