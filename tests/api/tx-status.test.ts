import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockOrderProcessing = {
  id: 42,
  status: 'PROCESSING',
  transactionHash: null as string | null,
};

const mockOrderCompleted = {
  id: 42,
  status: 'COMPLETED',
  transactionHash: '0xabc123def456',
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from '@/app/api/orders/tx-status/route';

function makeRequest(orderCode: string | null) {
  const url = orderCode
    ? `http://localhost/api/orders/tx-status?orderCode=${orderCode}`
    : 'http://localhost/api/orders/tx-status';
  return new NextRequest(url, { method: 'GET' });
}

describe('GET /api/orders/tx-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when orderCode is missing', async () => {
    const req = makeRequest(null);
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/orderCode/i);
  });

  it('returns 404 when order is not found', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(null);

    const req = makeRequest('99999999');
    const res = await GET(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/not found/i);
  });

  it('returns PROCESSING status with null transactionHash while pending', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(mockOrderProcessing as any);

    const req = makeRequest('17400001234');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('PROCESSING');
    expect(data.transactionHash).toBeNull();
    expect(data.explorerUrl).toBeNull();
  });

  it('returns transactionHash and explorerUrl once confirmed', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(mockOrderCompleted as any);

    const req = makeRequest('17400001234');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('COMPLETED');
    expect(data.transactionHash).toBe('0xabc123def456');
    expect(data.explorerUrl).toContain('0xabc123def456');
    expect(data.explorerUrl).toContain('etherscan.io');
  });

  it('returns correct orderId in response', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(mockOrderCompleted as any);

    const req = makeRequest('17400001234');
    const res = await GET(req);
    const data = await res.json();
    expect(data.orderId).toBe(42);
  });
});
