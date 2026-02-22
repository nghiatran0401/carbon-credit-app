import { PayOS } from '@payos/node';
import { env } from '@/lib/env';

export interface PayOSPaymentLink {
  code: string;
  desc: string;
  data: {
    bin: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    description: string;
    orderCode: number;
    paymentLinkId: string;
    qrCode: string;
    checkoutUrl: string;
  };
}

export interface CreatePaymentLinkParams {
  orderCode: number;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  buyerName?: string;
  buyerEmail?: string;
  expiredAt?: number;
}

export interface PayOSPaymentInfo {
  code: string;
  desc: string;
  data: {
    orderCode: number;
    amount: number;
    description: string;
    accountNumber: string;
    accountName: string;
    paymentLinkId: string;
    status: string;
    checkoutUrl: string;
    qrCode: string;
    createdAt: string;
    transactions?: Array<{
      reference: string;
      amount: number;
      accountNumber: string;
      description: string;
      transactionDateTime: string;
    }>;
  };
}

export interface PayOSWebhookData {
  code: string;
  desc: string;
  data: {
    orderCode: number;
    amount: number;
    description: string;
    accountNumber: string;
    accountName: string;
    reference: string;
    transactionDateTime: string;
    currency: string;
    paymentLinkId: string;
    code: string;
    desc: string;
  };
  signature: string;
}

export class PayOSService {
  private payosClient: PayOS;

  constructor() {
    const clientId = env.PAYOS_CLIENT_ID?.trim() || '';
    const apiKey = env.PAYOS_API_KEY?.trim() || '';
    const checksumKey = env.PAYOS_CHECKSUM_KEY?.trim() || '';

    if (!clientId || !apiKey || !checksumKey) {
      throw new Error(
        'PayOS credentials are not set. Please check PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY in .env',
      );
    }

    this.payosClient = new PayOS({
      clientId,
      apiKey,
      checksumKey,
    });
  }

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<PayOSPaymentLink> {
    const paymentData = await this.payosClient.paymentRequests.create({
      orderCode: params.orderCode,
      amount: params.amount,
      description: params.description,
      items: params.items || [
        {
          name: params.description,
          quantity: 1,
          price: params.amount,
        },
      ],
      cancelUrl: params.cancelUrl,
      returnUrl: params.returnUrl,
      ...(params.buyerName && { buyerName: params.buyerName }),
      ...(params.buyerEmail && { buyerEmail: params.buyerEmail }),
      ...(params.expiredAt && { expiredAt: params.expiredAt }),
    });

    return {
      code: '00',
      desc: 'Success',
      data: {
        bin: paymentData.bin || '',
        accountNumber: paymentData.accountNumber || '',
        accountName: paymentData.accountName || '',
        amount: paymentData.amount,
        description: paymentData.description,
        orderCode: paymentData.orderCode,
        paymentLinkId: paymentData.paymentLinkId,
        qrCode: paymentData.qrCode || '',
        checkoutUrl: paymentData.checkoutUrl,
      },
    };
  }

  async getPaymentLinkInfo(paymentLinkId: string): Promise<PayOSPaymentInfo> {
    const paymentData = await this.payosClient.paymentRequests.get(paymentLinkId);

    const firstTransaction =
      paymentData.transactions && paymentData.transactions.length > 0
        ? paymentData.transactions[0]
        : null;

    return {
      code: '00',
      desc: 'Success',
      data: {
        orderCode: paymentData.orderCode,
        amount: paymentData.amount,
        description: firstTransaction?.description || '',
        accountNumber: firstTransaction?.accountNumber || '',
        accountName: firstTransaction?.virtualAccountName || '',
        paymentLinkId: paymentData.id,
        status: paymentData.status || 'PENDING',
        checkoutUrl: '',
        qrCode: '',
        createdAt: paymentData.createdAt || new Date().toISOString(),
        transactions: paymentData.transactions?.map((t) => ({
          reference: t.reference,
          amount: t.amount,
          accountNumber: t.accountNumber,
          description: t.description,
          transactionDateTime: t.transactionDateTime,
        })),
      },
    };
  }

  async cancelPaymentLink(paymentLinkId: string): Promise<void> {
    await this.payosClient.paymentRequests.cancel(paymentLinkId);
  }

  async verifyWebhookSignature(webhookData: any): Promise<any> {
    return await this.payosClient.webhooks.verify(webhookData);
  }
}

let _payosServiceInstance: PayOSService | null = null;
let _initializationError: Error | null = null;

function getPayosServiceInstance(): PayOSService | null {
  if (_initializationError) {
    return null;
  }

  if (!_payosServiceInstance) {
    try {
      const clientId = env.PAYOS_CLIENT_ID?.trim();
      const apiKey = env.PAYOS_API_KEY?.trim();
      const checksumKey = env.PAYOS_CHECKSUM_KEY?.trim();

      if (!clientId || !apiKey || !checksumKey) {
        _initializationError = new Error(
          'PayOS credentials are not set. Please check PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY in .env',
        );
        return null;
      }

      _payosServiceInstance = new PayOSService();
    } catch (error) {
      _initializationError = error instanceof Error ? error : new Error(String(error));
      return null;
    }
  }
  return _payosServiceInstance;
}

export function getPayOSService(): PayOSService {
  const instance = getPayosServiceInstance();
  if (!instance) {
    const errorMsg =
      _initializationError?.message ||
      'PayOS service not initialized. Please check PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY in .env';
    throw new Error(errorMsg);
  }
  return instance;
}

export const payosService = new Proxy({} as PayOSService, {
  get(_target, prop) {
    const instance = getPayosServiceInstance();
    if (!instance) {
      const errorMsg =
        _initializationError?.message ||
        'PayOS service not initialized. Please check PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY in .env';
      throw new Error(errorMsg);
    }
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});
