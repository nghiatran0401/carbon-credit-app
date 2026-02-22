import crypto from 'crypto';
import { getImmudbService } from './immudb-service';
import { logger } from './logger';

export interface OrderTransactionData {
  orderId: number;
  totalCredits: number;
  totalPrice: number;
  paidAt: Date;
  buyer?: string;
  seller?: string;
}

export interface OrderHash {
  orderId: number;
  hash: string;
  timestamp: number;
  transactionData: OrderTransactionData;
}

class OrderAuditService {
  /**
   * Compute SHA256 hash from order transaction details
   * New formula includes buyer and seller to tie the order to participants:
   * Formula: SHA256(orderId + buyer + seller + totalCredits + totalPrice + paidAt_timestamp)
   */
  computeOrderHash(orderData: OrderTransactionData): string {
    const { orderId, totalCredits, totalPrice, paidAt, buyer, seller } = orderData;

    // Convert paidAt to timestamp for consistent hashing
    const paidAtTimestamp = paidAt.getTime();

    // Normalize buyer/seller to empty string if undefined
    const buyerStr = buyer ?? '';
    const sellerStr = seller ?? '';

    // Create the string to hash in a deterministic order
    const dataString = `${orderId}|${buyerStr}|${sellerStr}|${totalCredits}|${totalPrice}|${paidAtTimestamp}`;

    // Compute SHA256 hash
    const hash = crypto.createHash('sha256').update(dataString).digest('hex');
    logger.debug('Computed order hash', { orderId });

    return hash;
  }

  /**
   * Store order hash in ImmuDB for immutable audit trail
   * Key: order_${orderId}
   * Value: JSON with hash and transaction details
   */
  async storeOrderAudit(orderData: OrderTransactionData): Promise<string> {
    try {
      const hash = this.computeOrderHash(orderData);
      const immudbService = getImmudbService();

      const auditRecord: OrderHash = {
        orderId: orderData.orderId,
        hash,
        timestamp: Date.now(),
        transactionData: orderData,
      };

      // Store in ImmuDB with key: order_${orderId}
      const key = `order_${orderData.orderId}`;
      const result = await immudbService.storeTransactionHash({
        hash: key, // Using order key as the "hash" field for the existing interface
        timestamp: auditRecord.timestamp,
        transactionType: 'order_audit',
        metadata: {
          orderId: orderData.orderId,
          computedHash: hash,
          totalCredits: orderData.totalCredits,
          totalPrice: orderData.totalPrice,
          paidAt: orderData.paidAt.toISOString(),
          buyer: orderData.buyer ?? null,
          seller: orderData.seller ?? null,
          dataString: `${orderData.orderId}|${orderData.buyer ?? ''}|${orderData.seller ?? ''}|${orderData.totalCredits}|${orderData.totalPrice}|${orderData.paidAt.getTime()}`,
        },
      });

      logger.info('Order audit stored in ImmuDB', { orderId: orderData.orderId });

      return hash;
    } catch (error) {
      logger.error('Failed to store order audit in ImmuDB', { error });
      throw new Error(`Failed to store order audit: ${error}`);
    }
  }

  /**
   * Verify order integrity by recomputing hash and comparing with stored value
   */
  async verifyOrderIntegrity(
    orderId: number,
    orderData: OrderTransactionData,
  ): Promise<{
    isValid: boolean;
    storedHash?: string;
    computedHash: string;
    key: string;
  }> {
    try {
      const computedHash = this.computeOrderHash(orderData);
      const immudbService = getImmudbService();

      // Retrieve stored audit record
      const key = `order_${orderId}`;
      const storedRecord = await immudbService.getTransactionHash(key);

      if (!storedRecord || !storedRecord.metadata) {
        return {
          isValid: false,
          computedHash,
          key,
        };
      }

      const storedHash = storedRecord.metadata.computedHash;
      const isValid = storedHash === computedHash;
      logger.info('Order integrity verification', { orderId, isValid });

      return {
        isValid,
        storedHash,
        computedHash,
        key,
      };
    } catch (error) {
      logger.error('Failed to verify order integrity', { error });
      throw new Error(`Failed to verify order integrity: ${error}`);
    }
  }

  /**
   * Get all order audit records from ImmuDB
   */
  async getAllOrderAudits(): Promise<OrderHash[]> {
    try {
      const immudbService = getImmudbService();

      // Get all transactions with 'order_audit' type
      const allTransactions = await immudbService.getAllTransactionHashes(1000);

      const orderAudits = allTransactions
        .filter((tx) => tx.transactionType === 'order_audit')
        .map((tx) => ({
          orderId: tx.metadata?.orderId || 0,
          hash: tx.metadata?.computedHash || '',
          timestamp: tx.timestamp,
          transactionData: {
            orderId: tx.metadata?.orderId || 0,
            totalCredits: tx.metadata?.totalCredits || 0,
            totalPrice: tx.metadata?.totalPrice || 0,
            paidAt: new Date(tx.metadata?.paidAt || Date.now()),
            buyer: tx.metadata?.buyer || undefined,
            seller: tx.metadata?.seller || undefined,
          },
        }));

      return orderAudits;
    } catch (error) {
      console.error('Failed to get order audits:', error);
      throw new Error(`Failed to get order audits: ${error}`);
    }
  }

  /**
   * Get audit record for a specific order
   */
  async getOrderAudit(orderId: number): Promise<OrderHash | null> {
    try {
      const immudbService = getImmudbService();
      const key = `order_${orderId}`;

      const storedRecord = await immudbService.getTransactionHash(key);

      if (!storedRecord || !storedRecord.metadata) {
        return null;
      }

      return {
        orderId: storedRecord.metadata.orderId || 0,
        hash: storedRecord.metadata.computedHash || '',
        timestamp: storedRecord.timestamp,
        transactionData: {
          orderId: storedRecord.metadata.orderId || 0,
          totalCredits: storedRecord.metadata.totalCredits || 0,
          totalPrice: storedRecord.metadata.totalPrice || 0,
          paidAt: new Date(storedRecord.metadata.paidAt || Date.now()),
          buyer: storedRecord.metadata.buyer || undefined,
          seller: storedRecord.metadata.seller || undefined,
        },
      };
    } catch (error) {
      console.error('Failed to get order audit:', error);
      return null;
    }
  }
}

// Singleton instance
export const orderAuditService = new OrderAuditService();
export default OrderAuditService;
