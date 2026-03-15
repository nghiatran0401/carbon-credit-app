import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockClient = {
  set: vi.fn(),
  get: vi.fn(),
  scan: vi.fn(),
  history: vi.fn(),
  verifiedGet: vi.fn(),
  currentState: vi.fn(),
  initClient: vi.fn().mockResolvedValue(undefined),
  shutdown: vi.fn().mockResolvedValue(undefined),
};

vi.mock('immudb-node', () => ({
  default: vi.fn(() => mockClient),
}));

import ImmudbService, { getImmudbService, type TransactionHash } from '@/lib/immudb-service';

const validEnv = {
  IMMUDB_HOST: 'localhost',
  IMMUDB_PORT: '3322',
  IMMUDB_USERNAME: 'immudb',
  IMMUDB_PASSWORD: 'immudb',
  IMMUDB_DATABASE: 'defaultdb',
};

describe('immudb-service', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).immudbService = undefined;
    mockClient.initClient.mockResolvedValue(undefined);
    mockClient.currentState.mockResolvedValue({});
    mockClient.set.mockResolvedValue({ id: { toString: () => '123' } });
    mockClient.get.mockResolvedValue(null);
    mockClient.scan.mockResolvedValue({ entriesList: [] });
    mockClient.history.mockResolvedValue({ entriesList: [] });
    mockClient.verifiedGet.mockResolvedValue(null);
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

  describe('getImmudbService()', () => {
    it('throws when env vars are missing (IMMUDB_HOST/USERNAME/PASSWORD)', async () => {
      vi.resetModules();
      delete process.env.IMMUDB_HOST;
      delete process.env.IMMUDB_USERNAME;
      delete process.env.IMMUDB_PASSWORD;
      const { getImmudbService: getService } = await import('@/lib/immudb-service');
      expect(() => getService()).toThrow(
        'ImmuDB configuration missing. Set IMMUDB_HOST, IMMUDB_USERNAME, and IMMUDB_PASSWORD environment variables.',
      );
    });

    it('returns an instance when env vars are set', () => {
      const service = getImmudbService();
      expect(service).toBeInstanceOf(ImmudbService);
    });
  });

  describe('storeTransactionHash()', () => {
    it('stores a hash with the correct key format (tx_${hash})', async () => {
      const service = getImmudbService();
      const tx: TransactionHash = {
        hash: 'abc123',
        timestamp: 1000,
        transactionType: 'purchase',
      };
      mockClient.set.mockResolvedValue({ id: { toString: () => 'stored' } });

      await service.storeTransactionHash(tx);

      expect(mockClient.set).toHaveBeenCalledWith({
        key: 'tx_abc123',
        value: JSON.stringify({
          hash: 'abc123',
          timestamp: 1000,
          blockNumber: undefined,
          transactionType: 'purchase',
          metadata: undefined,
        }),
      });
    });

    it('returns stored id from client result', async () => {
      const service = getImmudbService();
      mockClient.set.mockResolvedValue({ id: { toString: () => 'tx-id-42' } });
      const result = await service.storeTransactionHash({
        hash: 'h1',
        timestamp: 1,
        transactionType: 'purchase',
      });
      expect(result).toBe('tx-id-42');
    });

    it('throws when client is not available after connection failure', async () => {
      mockClient.initClient.mockRejectedValue(new Error('connection refused'));
      vi.resetModules();
      const { getImmudbService: getService } = await import('@/lib/immudb-service');
      for (const key of Object.keys(validEnv)) {
        process.env[key] = validEnv[key as keyof typeof validEnv];
      }
      const service = getService();
      await expect(
        service.storeTransactionHash({
          hash: 'x',
          timestamp: 1,
          transactionType: 'purchase',
        }),
      ).rejects.toThrow(/ImmuDB connection failed/);
    });
  });

  describe('getTransactionHash()', () => {
    it('retrieves a stored hash', async () => {
      const service = getImmudbService();
      const stored = {
        hash: 'def456',
        timestamp: 2000,
        blockNumber: 42,
        transactionType: 'retirement',
        metadata: { foo: 'bar' },
      };
      mockClient.get.mockResolvedValue({
        value: JSON.stringify(stored),
      });

      const result = await service.getTransactionHash('def456');

      expect(mockClient.get).toHaveBeenCalledWith({ key: 'tx_def456' });
      expect(result).toEqual(stored);
    });

    it('decodes Uint8Array value to string and parses JSON', async () => {
      const service = getImmudbService();
      const stored = {
        hash: 'h2',
        timestamp: 1,
        transactionType: 'purchase',
      };
      mockClient.get.mockResolvedValue({
        value: new TextEncoder().encode(JSON.stringify(stored)),
      });

      const result = await service.getTransactionHash('h2');

      expect(result).toEqual(stored);
    });

    it('returns null when key not found', async () => {
      const service = getImmudbService();
      mockClient.get.mockRejectedValue(new Error('key not found: tx_missing'));

      const result = await service.getTransactionHash('missing');

      expect(result).toBeNull();
    });

    it('returns null when result has no value', async () => {
      const service = getImmudbService();
      mockClient.get.mockResolvedValue({});

      const result = await service.getTransactionHash('nope');

      expect(result).toBeNull();
    });
  });

  describe('verifyTransactionHash()', () => {
    it('returns true when verifiedGet returns a result', async () => {
      const service = getImmudbService();
      mockClient.verifiedGet.mockResolvedValue({ value: 'data' });

      const result = await service.verifyTransactionHash('abc');

      expect(mockClient.verifiedGet).toHaveBeenCalledWith({ key: 'tx_abc' });
      expect(result).toBe(true);
    });

    it('returns false when verifiedGet returns null/undefined', async () => {
      const service = getImmudbService();
      mockClient.verifiedGet.mockResolvedValue(null);

      const result = await service.verifyTransactionHash('missing');

      expect(result).toBe(false);
    });

    it('returns false when verifiedGet throws', async () => {
      const service = getImmudbService();
      mockClient.verifiedGet.mockRejectedValue(new Error('verify failed'));

      const result = await service.verifyTransactionHash('x');

      expect(result).toBe(false);
    });
  });

  describe('getAllTransactionHashes()', () => {
    it('scans with prefix tx_ and limit and returns parsed entries', async () => {
      const service = getImmudbService();
      const entries = [
        {
          value: JSON.stringify({
            hash: 'a',
            timestamp: 1,
            transactionType: 'purchase',
          }),
        },
        {
          value: JSON.stringify({
            hash: 'b',
            timestamp: 2,
            transactionType: 'retirement',
          }),
        },
      ];
      mockClient.scan.mockResolvedValue({ entriesList: entries });

      const result = await service.getAllTransactionHashes(50);

      expect(mockClient.scan).toHaveBeenCalledWith({
        prefix: 'tx_',
        limit: 50,
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        hash: 'a',
        timestamp: 1,
        blockNumber: undefined,
        transactionType: 'purchase',
        metadata: undefined,
      });
      expect(result[1]).toEqual({
        hash: 'b',
        timestamp: 2,
        blockNumber: undefined,
        transactionType: 'retirement',
        metadata: undefined,
      });
    });

    it('uses default limit 100', async () => {
      const service = getImmudbService();
      await service.getAllTransactionHashes();
      expect(mockClient.scan).toHaveBeenCalledWith({
        prefix: 'tx_',
        limit: 100,
      });
    });

    it('skips entries that fail to parse', async () => {
      const service = getImmudbService();
      mockClient.scan.mockResolvedValue({
        entriesList: [
          { value: JSON.stringify({ hash: 'ok', timestamp: 1, transactionType: 'purchase' }) },
          { value: 'not-json' },
          { value: JSON.stringify({ hash: 'ok2', timestamp: 2, transactionType: 'retirement' }) },
        ],
      });

      const result = await service.getAllTransactionHashes(10);

      expect(result).toHaveLength(2);
      expect(result[0].hash).toBe('ok');
      expect(result[1].hash).toBe('ok2');
    });
  });

  describe('getHistory()', () => {
    it('returns history entries for a hash', async () => {
      const service = getImmudbService();
      const entries = [
        { key: 'tx_xyz', value: 'v1' },
        { key: 'tx_xyz', value: 'v2' },
      ];
      mockClient.history.mockResolvedValue({ entriesList: entries });

      const result = await service.getHistory('xyz');

      expect(mockClient.history).toHaveBeenCalledWith({ key: 'tx_xyz' });
      expect(result).toEqual(entries);
    });

    it('returns empty array when no history', async () => {
      const service = getImmudbService();
      mockClient.history.mockResolvedValue({ entriesList: [] });

      const result = await service.getHistory('none');

      expect(result).toEqual([]);
    });

    it('returns empty array when result has no entriesList', async () => {
      const service = getImmudbService();
      mockClient.history.mockResolvedValue({});

      const result = await service.getHistory('x');

      expect(result).toEqual([]);
    });

    it('throws when history() throws', async () => {
      const service = getImmudbService();
      mockClient.history.mockRejectedValue(new Error('history failed'));

      await expect(service.getHistory('x')).rejects.toThrow('Failed to get transaction history');
    });
  });

  describe('error handling when client is not connected', () => {
    it('storeTransactionHash throws when connection fails', async () => {
      mockClient.initClient.mockRejectedValue(new Error('connection refused'));
      vi.resetModules();
      const { getImmudbService: getService } = await import('@/lib/immudb-service');
      Object.assign(process.env, validEnv);
      const service = getService();
      await expect(
        service.storeTransactionHash({
          hash: 'h',
          timestamp: 1,
          transactionType: 'purchase',
        }),
      ).rejects.toThrow(/ImmuDB connection failed/);
    });
  });
});
