import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockRates } = vi.hoisted(() => ({
  mockRates: [
    { id: 1, fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.92 },
    { id: 2, fromCurrency: 'USD', toCurrency: 'GBP', rate: 0.79 },
  ],
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    exchangeRate: {
      findMany: vi.fn().mockResolvedValue(mockRates),
    },
  },
}));

import { GET } from '@/app/api/exchange-rates/route';

describe('Exchange Rates API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/exchange-rates', () => {
    it('returns all exchange rates', async () => {
      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
      expect(data[0]).toMatchObject({ fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.92 });
      expect(data[1]).toMatchObject({ fromCurrency: 'USD', toCurrency: 'GBP', rate: 0.79 });
    });

    it('handles empty results', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.exchangeRate.findMany).mockResolvedValueOnce([]);

      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([]);
    });

    it('handles errors gracefully', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.exchangeRate.findMany).mockRejectedValueOnce(new Error('Database error'));

      const res = await GET();
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to fetch exchange rates' });
    });
  });
});
