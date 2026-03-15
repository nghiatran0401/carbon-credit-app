import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockSession, mockDriver } = vi.hoisted(() => {
  const mockSession = {
    run: vi.fn().mockResolvedValue({
      records: [{ get: vi.fn().mockReturnValue(1) }],
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const mockDriver = {
    session: vi.fn().mockReturnValue(mockSession),
    close: vi.fn().mockResolvedValue(undefined),
    verifyConnectivity: vi.fn().mockResolvedValue(undefined),
  };
  return { mockSession, mockDriver };
});

vi.mock('neo4j-driver', () => ({
  default: {
    driver: vi.fn().mockReturnValue(mockDriver),
    auth: { basic: vi.fn().mockReturnValue({}) },
  },
}));

import { getNeo4jService } from '@/lib/neo4j-service';

const validEnv = {
  NEO4J_URI: 'bolt://localhost:7687',
  NEO4J_USER: 'neo4j',
  NEO4J_PASSWORD: 'secret',
};

describe('neo4j-service', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.run.mockResolvedValue({
      records: [{ get: vi.fn().mockReturnValue(1) }],
    });
    mockSession.close.mockResolvedValue(undefined);
    mockDriver.session.mockReturnValue(mockSession);
    mockDriver.close.mockResolvedValue(undefined);
    for (const key of Object.keys(validEnv)) {
      savedEnv[key] = process.env[key];
      process.env[key] = validEnv[key as keyof typeof validEnv];
    }
  });

  afterEach(() => {
    for (const key of Object.keys(savedEnv)) {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  describe('getNeo4jService()', () => {
    it('throws when env vars are missing', () => {
      delete process.env.NEO4J_URI;
      delete process.env.NEO4J_USER;
      delete process.env.NEO4J_PASSWORD;
      vi.resetModules();
      return import('@/lib/neo4j-service').then(({ getNeo4jService: getService }) => {
        expect(() => getService()).toThrow(
          'Neo4j configuration missing. Set NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD environment variables.',
        );
      });
    });

    it('returns same instance on multiple calls (singleton)', () => {
      const service1 = getNeo4jService();
      const service2 = getNeo4jService();
      expect(service1).toBe(service2);
    });
  });

  describe('testConnection()', () => {
    it('returns true on successful connection', async () => {
      const service = getNeo4jService();
      mockSession.run.mockResolvedValueOnce({
        records: [{ get: vi.fn().mockReturnValue(1) }],
      });

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockSession.run).toHaveBeenCalledWith('RETURN 1 as test');
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('returns false on connection failure', async () => {
      const service = getNeo4jService();
      mockSession.run.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await service.testConnection();

      expect(result).toBe(false);
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('initializeSchema()', () => {
    it('runs constraint and index creation queries', async () => {
      const service = getNeo4jService();
      mockSession.run.mockResolvedValue({ records: [] });

      await service.initializeSchema();

      expect(mockSession.run).toHaveBeenCalled();
      const calls = mockSession.run.mock.calls;
      const queryStrings = calls.map((c: unknown[]) => c[0] as string);
      expect(
        queryStrings.some(
          (q: string) => q.includes('User') && q.includes('REQUIRE u.id IS UNIQUE'),
        ),
      ).toBe(true);
      expect(
        queryStrings.some(
          (q: string) => q.includes('CarbonCredit') && q.includes('REQUIRE c.id IS UNIQUE'),
        ),
      ).toBe(true);
      expect(
        queryStrings.some(
          (q: string) => q.includes('Order') && q.includes('REQUIRE o.id IS UNIQUE'),
        ),
      ).toBe(true);
      expect(
        queryStrings.some(
          (q: string) => q.includes('Forest') && q.includes('REQUIRE f.id IS UNIQUE'),
        ),
      ).toBe(true);
      expect(
        queryStrings.some(
          (q: string) => q.includes('Certificate') && q.includes('REQUIRE cert.id IS UNIQUE'),
        ),
      ).toBe(true);
      expect(queryStrings.some((q: string) => q.includes('user_email_index'))).toBe(true);
      expect(queryStrings.some((q: string) => q.includes('credit_serial_index'))).toBe(true);
      expect(queryStrings.some((q: string) => q.includes('order_date_index'))).toBe(true);
      expect(mockSession.close).toHaveBeenCalled();
    });

    it("continues when a query fails with 'already exists'", async () => {
      const service = getNeo4jService();
      mockSession.run
        .mockResolvedValueOnce({ records: [] })
        .mockRejectedValueOnce(new Error('Constraint already exists'))
        .mockResolvedValue({ records: [] });

      await expect(service.initializeSchema()).resolves.not.toThrow();
      expect(mockSession.run.mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe('getSession()', () => {
    it('returns a session from the driver', () => {
      const service = getNeo4jService();
      const session = service.getSession();
      expect(session).toBe(mockSession);
      expect(mockDriver.session).toHaveBeenCalled();
    });
  });

  describe('close()', () => {
    it('closes the driver', async () => {
      const service = getNeo4jService();
      await service.close();
      expect(mockDriver.close).toHaveBeenCalled();
    });
  });
});
