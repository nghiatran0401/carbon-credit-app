import { Wallet } from 'ethers';

export interface CustodialWallet {
  address: string;
}

/**
 * Generate a new random Ethereum custodial wallet.
 *
 * SECURITY NOTE: This function returns only the public wallet `address`.
 * The private key is intentionally NOT returned or stored. Platform-level
 * key management (encrypted vault or HSM) must be implemented separately
 * before executing real on-chain transfers on behalf of users.
 */
export function generateCustodialWallet(): CustodialWallet {
  const wallet = Wallet.createRandom();
  return {
    address: wallet.address,
  };
}
