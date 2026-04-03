import { Prisma } from '@prisma/client';

export class CreditInventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CreditInventoryError';
  }
}

/**
 * Atomically decrements CarbonCredit.availableCredits for all items in an order.
 * Idempotency is enforced by an orderHistory marker event: credits_deducted.
 */
export async function decrementAvailableCreditsForOrder(
  tx: Prisma.TransactionClient,
  orderId: number,
): Promise<{ applied: boolean }> {
  const alreadyDeducted = await tx.orderHistory.findFirst({
    where: {
      orderId,
      event: 'credits_deducted',
    },
    select: { id: true },
  });

  if (alreadyDeducted) {
    return { applied: false };
  }

  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: {
      carbonCreditId: true,
      quantity: true,
    },
  });

  if (!items.length) {
    throw new CreditInventoryError(`Order ${orderId} has no items to deduct.`);
  }

  const quantityByCredit = new Map<number, number>();
  for (const item of items) {
    quantityByCredit.set(
      item.carbonCreditId,
      (quantityByCredit.get(item.carbonCreditId) ?? 0) + item.quantity,
    );
  }

  for (const [carbonCreditId, quantity] of quantityByCredit.entries()) {
    const updated = await tx.carbonCredit.updateMany({
      where: {
        id: carbonCreditId,
        availableCredits: { gte: quantity },
      },
      data: {
        availableCredits: { decrement: quantity },
      },
    });

    if (updated.count === 0) {
      throw new CreditInventoryError(
        `Not enough available credits for CarbonCredit ${carbonCreditId}. Requested ${quantity}.`,
      );
    }
  }

  await tx.orderHistory.create({
    data: {
      orderId,
      event: 'credits_deducted',
      message: 'CarbonCredit.availableCredits decremented for this order.',
    },
  });

  return { applied: true };
}
