import 'server-only';

import { Contract, JsonRpcProvider, Wallet, ethers } from 'ethers';
import forestCreditArtifact from '../../contracts/ForestCredit1155.json';

const DEFAULT_BASE_SEPOLIA_CHAIN_ID = 84532;

type BlockchainConfig = {
  rpcUrl: string;
  chainId: number;
  adminPrivateKey: string;
  contractAddress: string;
};

const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
const accessControlErrorInterface = new ethers.Interface([
  'error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)',
]);

export type MintForestTokensParams = {
  forestId: number;
  amount: number;
  toAddress?: string;
  data?: string;
};

export type TransferCreditsToBuyerParams = {
  forestId: number;
  amount: number;
  buyerAddress: string;
  fromAddress?: string;
  data?: string;
};

export type RetireForestTokensParams = {
  forestId: number;
  amount: number;
  fromAddress: string;
};

export type BlockchainTxResult = {
  txHash: string;
  blockNumber: number;
  contractAddress: string;
  chainId: number;
};

function getConfig(): BlockchainConfig {
  const rpcUrl = process.env.BASE_RPC_URL;
  const adminPrivateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
  const contractAddress = process.env.FOREST_1155_CONTRACT_ADDRESS;
  const chainId = Number(process.env.BASE_CHAIN_ID ?? DEFAULT_BASE_SEPOLIA_CHAIN_ID);

  if (!rpcUrl) {
    throw new Error('BASE_RPC_URL is required for blockchain operations');
  }

  if (!adminPrivateKey) {
    throw new Error('ADMIN_WALLET_PRIVATE_KEY is required for blockchain operations');
  }

  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    throw new Error('FOREST_1155_CONTRACT_ADDRESS is missing or invalid');
  }

  return {
    rpcUrl,
    chainId,
    adminPrivateKey,
    contractAddress,
  };
}

function getProvider() {
  const { rpcUrl } = getConfig();
  return new JsonRpcProvider(rpcUrl);
}

function getAdminWallet() {
  const { adminPrivateKey } = getConfig();
  return new Wallet(adminPrivateKey, getProvider());
}

function getForestContract() {
  const { contractAddress } = getConfig();
  return new Contract(contractAddress, forestCreditArtifact.abi, getAdminWallet());
}

async function assertMinterRole(contract: Contract, signerAddress: string) {
  const hasRole = await contract.hasRole(MINTER_ROLE, signerAddress);
  if (!hasRole) {
    throw new Error(
      `Admin wallet ${signerAddress} does not have MINTER_ROLE on contract ${contract.target}. ` +
        'Grant MINTER_ROLE to this wallet, or use the deployer/admin wallet in ADMIN_WALLET_PRIVATE_KEY.',
    );
  }
}

function toReadableContractError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error('Unknown blockchain error while sending transaction');
  }

  const maybeEthersError = error as Error & { code?: string; data?: string };
  if (maybeEthersError.code !== 'CALL_EXCEPTION' || typeof maybeEthersError.data !== 'string') {
    return error;
  }

  try {
    const decoded = accessControlErrorInterface.parseError(maybeEthersError.data);
    if (decoded?.name === 'AccessControlUnauthorizedAccount') {
      const account = String(decoded.args[0]);
      const neededRole = String(decoded.args[1]);
      return new Error(
        `Blockchain authorization failed: account ${account} is missing required role ${neededRole}. ` +
          'Grant MINTER_ROLE on the ForestCredit1155 contract to this account.',
      );
    }
  } catch {
    // Keep the original ethers error when custom error data cannot be decoded.
  }

  return error;
}

function toBytesData(data?: string) {
  if (!data) return '0x';
  return ethers.isHexString(data) ? data : ethers.hexlify(ethers.toUtf8Bytes(data));
}

export function isBlockchainReady() {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}

export async function mintForestTokens(
  params: MintForestTokensParams,
): Promise<BlockchainTxResult> {
  const { forestId, amount, toAddress, data } = params;
  const { chainId, contractAddress } = getConfig();

  if (!Number.isInteger(forestId) || forestId <= 0) {
    throw new Error('forestId must be a positive integer');
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('amount must be a positive integer');
  }

  const signer = getAdminWallet();
  const recipient = toAddress ?? signer.address;
  if (!ethers.isAddress(recipient)) {
    throw new Error('Invalid recipient address for mintForestTokens');
  }

  const contract = getForestContract();
  await assertMinterRole(contract, signer.address);

  let receipt;
  try {
    const tx = await contract.mintForestCredits(recipient, forestId, amount, toBytesData(data));
    receipt = await tx.wait(1);
  } catch (error) {
    throw toReadableContractError(error);
  }

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    contractAddress,
    chainId,
  };
}

export async function transferCreditsToBuyer(
  params: TransferCreditsToBuyerParams,
): Promise<BlockchainTxResult> {
  const { forestId, amount, buyerAddress, fromAddress, data } = params;
  const { chainId, contractAddress } = getConfig();

  if (!Number.isInteger(forestId) || forestId <= 0) {
    throw new Error('forestId must be a positive integer');
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('amount must be a positive integer');
  }

  if (!ethers.isAddress(buyerAddress)) {
    throw new Error('Invalid buyer wallet address');
  }

  const signer = getAdminWallet();
  const sender = fromAddress ?? signer.address;

  if (!ethers.isAddress(sender)) {
    throw new Error('Invalid sender wallet address for transferCreditsToBuyer');
  }

  const contract = getForestContract();
  let receipt;
  try {
    const tx = await contract.safeTransferFrom(
      sender,
      buyerAddress,
      forestId,
      amount,
      toBytesData(data),
    );
    receipt = await tx.wait(1);
  } catch (error) {
    throw toReadableContractError(error);
  }

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    contractAddress,
    chainId,
  };
}

export async function retireForestTokens(
  params: RetireForestTokensParams,
): Promise<BlockchainTxResult> {
  const { forestId, amount, fromAddress } = params;
  const { chainId, contractAddress } = getConfig();

  if (!Number.isInteger(forestId) || forestId <= 0) {
    throw new Error('forestId must be a positive integer');
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('amount must be a positive integer');
  }

  if (!ethers.isAddress(fromAddress)) {
    throw new Error('Invalid fromAddress for retireForestTokens');
  }

  const contract = getForestContract();

  let receipt;
  try {
    const tx = await contract.retireForestCredits(fromAddress, forestId, amount);
    receipt = await tx.wait(1);
  } catch (error) {
    throw toReadableContractError(error);
  }

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    contractAddress,
    chainId,
  };
}
