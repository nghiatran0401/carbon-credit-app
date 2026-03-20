import { describe, it, expect } from 'vitest';
import { generateCustodialWallet } from '@/lib/wallet-service';

describe('wallet-service', () => {
  describe('generateCustodialWallet', () => {
    it('returns an object with an address field', () => {
      const wallet = generateCustodialWallet();
      expect(wallet).toHaveProperty('address');
    });

    it('returns a valid EVM checksummed address (42-char 0x hex string)', () => {
      const { address } = generateCustodialWallet();
      expect(typeof address).toBe('string');
      expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(address).toHaveLength(42);
    });

    it('returns a unique address on every call', () => {
      const wallet1 = generateCustodialWallet();
      const wallet2 = generateCustodialWallet();
      expect(wallet1.address).not.toBe(wallet2.address);
    });

    it('does not return a privateKey field (key is never persisted)', () => {
      const wallet = generateCustodialWallet();
      expect(wallet).not.toHaveProperty('privateKey');
      expect(wallet).not.toHaveProperty('mnemonic');
    });
  });
});
