import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetHeader, mockConstructEvent, mockPayment, mockOrder } = vi.hoisted(() => {
  const mockPayment = {
    id: 1,
    orderId: 1,
    stripeSessionId: 'cs_test_123',
    stripePaymentIntentId: null as string | null,
    amount: 2100,
    currency: 'USD',
    status: 'PENDING' as const,
    method: 'card',
    createdAt: new Date(),
    updatedAt: new Date(),
    failureReason: null as string | null,
  };
  const mockOrder = {
    id: 1,
    userId: 1,
    status: 'COMPLETED',
    totalPrice: 21,
    paidAt: new Date(),
    items: [{ id: 1, quantity: 2, carbonCredit: { id: 1 } }],
  };
  return {
    mockGetHeader: vi.fn(),
    mockConstructEvent: vi.fn(),
    mockPayment,
    mockOrder,
  };
});

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({ get: mockGetHeader })),
}));

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  })),
}));

vi.mock('@/lib/env', () => ({
  env: {
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    payment: {
      findFirst: vi.fn().mockResolvedValue(mockPayment),
      update: vi.fn().mockResolvedValue({ ...mockPayment, status: 'SUCCEEDED' }),
    },
    order: {
      update: vi.fn().mockResolvedValue(mockOrder),
    },
    orderHistory: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
    },
    cartItem: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
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

import { POST } from '@/app/api/webhook/route';

const webhookRequest = (body: string, signature: string | null = 'stripe_sig_xxx') => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (signature) headers['stripe-signature'] = signature;
  return new NextRequest('http://localhost/api/webhook', {
    method: 'POST',
    headers,
    body,
  });
};

describe('Webhook API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHeader.mockImplementation((name: string) =>
      name === 'stripe-signature' ? 'stripe_sig_xxx' : null,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('successfully handles checkout.session.completed event', async () => {
    const sessionPayload = {
      id: 'cs_test_123',
      amount_total: 2100,
      currency: 'usd',
      payment_intent: 'pi_xxx',
    };
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: sessionPayload },
    });

    const req = webhookRequest(JSON.stringify({ type: 'checkout.session.completed' }));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockConstructEvent).toHaveBeenCalled();
  });

  it('successfully handles payment_intent.payment_failed event', async () => {
    const paymentIntentPayload = {
      id: 'pi_xxx',
      last_payment_error: { message: 'Card declined' },
    };
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: paymentIntentPayload },
    });

    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce({
      ...mockPayment,
      stripePaymentIntentId: 'pi_xxx',
    });

    const req = webhookRequest(JSON.stringify({ type: 'payment_intent.payment_failed' }));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockConstructEvent).toHaveBeenCalled();
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    mockGetHeader.mockImplementationOnce(() => null);

    const req = webhookRequest('{}');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toBe('No signature found');
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when webhook signature verification fails', async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });

    const req = webhookRequest(JSON.stringify({ type: 'checkout.session.completed' }));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toBe('Webhook signature verification failed');
  });

  it('handles unknown event types gracefully', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: {} },
    });

    const req = webhookRequest(JSON.stringify({ type: 'customer.subscription.deleted' }));
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
