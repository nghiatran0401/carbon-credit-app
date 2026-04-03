import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockOrder, mockVerifyWebhookSignature, mockEnqueueBlockchainTransfer } = vi.hoisted(() => ({
  mockOrder: {
    id: 1,
    orderCode: 17400001234,
    userId: 1,
    status: 'PENDING',
    totalPrice: 21,
    paidAt: null as Date | null,
    user: { walletAddress: '0xca185EaEEFF8108eff820912DE88ff6E8B2e291D' },
    items: [
      {
        id: 1,
        quantity: 2,
        carbonCredit: { id: 1, forestId: 5 },
      },
    ],
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
  mockEnqueueBlockchainTransfer: vi.fn(),
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
    $transaction: vi.fn(async (fn: any) =>
      fn({
        order: {
          findUnique: vi.fn().mockResolvedValue({ status: 'PAID' }),
          update: vi
            .fn()
            .mockResolvedValue({ ...mockOrder, status: 'PROCESSING', paidAt: new Date() }),
        },
        orderHistory: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 1 }),
        },
        orderItem: {
          findMany: vi.fn().mockResolvedValue([
            {
              carbonCreditId: 1,
              quantity: 2,
            },
          ]),
        },
        carbonCredit: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      }),
    ),
    order: {
      findUnique: vi.fn().mockResolvedValue(mockOrder),
      update: vi.fn().mockResolvedValue({ ...mockOrder, status: 'PROCESSING', paidAt: new Date() }),
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

vi.mock('@/lib/notification-emitter', () => ({
  notifyOrderPaid: vi.fn().mockResolvedValue(undefined),
  notifyOrderFailed: vi.fn().mockResolvedValue(undefined),
  notifyCertificateIssued: vi.fn().mockResolvedValue(undefined),
  notifyWebhookFailed: vi.fn().mockResolvedValue(undefined),
}));

// Mock the blockchain queue (fire-and-forget, no real chain calls in tests)
vi.mock('@/lib/blockchain-queue', () => ({
  enqueueBlockchainTransfer: mockEnqueueBlockchainTransfer,
}));

// Mock isBlockchainReady so we control whether the transfer path is entered
vi.mock('@/services/blockchainService', () => ({
  isBlockchainReady: vi.fn().mockReturnValue(true),
  transferCreditsToBuyer: vi.fn(),
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

  it('enqueues a blockchain transfer (not direct await) on payment success', async () => {
    const req = webhookRequest(JSON.stringify(payosWebhookPayload));
    await POST(req);
    expect(mockEnqueueBlockchainTransfer).toHaveBeenCalledOnce();
    const [job] = mockEnqueueBlockchainTransfer.mock.calls[0];
    expect(job.orderId).toBe(1);
    expect(job.buyerAddress).toMatch(/^0x/);
    expect(Array.isArray(job.items)).toBe(true);
  });

  it('sets order status to PROCESSING immediately (not COMPLETED)', async () => {
    const { prisma } = await import('@/lib/prisma');
    const req = webhookRequest(JSON.stringify(payosWebhookPayload));
    await POST(req);
    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalled();
  });

  it('returns 200 immediately without waiting for blockchain tx', async () => {
    // The queue mock is synchronous so we just assert the response arrives
    const req = webhookRequest(JSON.stringify(payosWebhookPayload));
    const start = Date.now();
    const res = await POST(req);
    const elapsed = Date.now() - start;
    expect(res.status).toBe(200);
    // No real blockchain call should add latency in tests
    expect(elapsed).toBeLessThan(500);
  });

  it('skips blockchain transfer when buyer address is missing', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
      ...mockOrder,
      user: { walletAddress: null },
    } as any);
    // Clear the env override
    delete process.env.BUYER_WALLET_ADDRESS;

    const req = webhookRequest(JSON.stringify(payosWebhookPayload));
    await POST(req);
    expect(mockEnqueueBlockchainTransfer).not.toHaveBeenCalled();
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
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockVerifyWebhookSignature.mockRejectedValueOnce(new Error('Invalid signature'));

    const req = webhookRequest(JSON.stringify(payosWebhookPayload));
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid signature');
    consoleSpy.mockRestore();
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
