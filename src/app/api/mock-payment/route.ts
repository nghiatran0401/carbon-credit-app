import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';
import { paymentService } from '@/lib/payment-service';
import { certificateService } from '@/lib/certificate-service';
import { orderAuditMiddleware } from '@/lib/order-audit-middleware';
import { carbonMovementService } from '@/lib/carbon-movement-service';
import { notifyCertificateIssued, notifyOrderPaid } from '@/lib/notification-emitter';
import { CreditInventoryError, decrementAvailableCreditsForOrder } from '@/lib/credit-inventory';
import {
  transferCreditsToBuyer,
  isBlockchainReady,
  mintForestTokens,
} from '@/services/blockchainService';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mock-payment
 *
 * Simulates a successful payment and immediately executes the on-chain
 * ERC-1155 credit transfer, without going through PayOS.
 *
 * Flow:
 *  1. Auth
 *  2. Load cart → validate
 *  3. Create Order + Payment records (via paymentService)
 *  4. Mint tokens to admin wallet if admin doesn't have enough balance
 *  5. Transfer credits from admin wallet → buyer wallet (safeTransferFrom)
 *  6. Mark Order COMPLETED, record tx hash
 *  7. Create audit, certificate, carbon-movement records
 *  8. Return { orderCode, transactionHash, explorerUrl }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const userId = auth.id;

    // ── 1. Load cart ─────────────────────────────────────────────────────────
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        carbonCredit: { include: { forest: true } },
      },
    });

    if (!cartItems.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // ── 2. Validate prices ────────────────────────────────────────────────────
    let total = 0;
    let totalCredits = 0;
    for (const item of cartItems) {
      const price = item.carbonCredit.pricePerCredit;
      if (!price || price <= 0) {
        return NextResponse.json(
          { error: `Invalid price for credit #${item.carbonCreditId}` },
          { status: 400 },
        );
      }
      total += price * item.quantity;
      totalCredits += item.quantity;
    }

    // ── 3. Resolve buyer wallet & check blockchain readiness ─────────────────────
    //
    // The user record in Prisma is the single source of truth for walletAddress.
    // It is populated from Supabase auth during user registration and can be
    // updated later via the profile page.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true, email: true, role: true },
    });

    const configuredBuyerAddress = process.env.BUYER_WALLET_ADDRESS?.trim();
    const buyerAddress =
      configuredBuyerAddress || (user?.walletAddress as string | null | undefined);

    // ── 4. Blockchain wallet gate ────────────────────────────────────────
    //
    // When blockchain is enabled, every user — including admins — must have
    // a verified Ethereum wallet address bound to their account before a
    // purchase is allowed. This check runs BEFORE the order is created in the
    // database so no partial state is left behind on rejection.
    const blockchainEnabled = isBlockchainReady();

    if (blockchainEnabled) {
      if (!buyerAddress || !ethers.isAddress(buyerAddress)) {
        // Determine the most helpful error message based on what is missing.
        const isAdmin = user?.role === 'ADMIN';
        const detail = isAdmin
          ? `You are signed in as an admin (${user?.email ?? 'unknown'}). Admin accounts must also have a wallet address bound to complete on-chain purchases. Go to your profile and connect a wallet, or set BUYER_WALLET_ADDRESS in .env to use a fixed override for all purchases.`
          : `Your account (${user?.email ?? 'unknown'}) does not have an Ethereum wallet address. Go to your profile page and connect a wallet to enable on-chain credit purchases.`;

        return NextResponse.json(
          {
            error: 'Wallet address required',
            detail,
            hint: 'Profile ➞ Wallet / set BUYER_WALLET_ADDRESS in .env for a global override.',
          },
          { status: 400 },
        );
      }
    } else {
      console.warn(
        '[mock-payment] Blockchain not configured — will complete order in DB only (no on-chain transfer).',
      );
    }

    // ── 5. Create order in DB ─────────────────────────────────────────────────
    const orderCode = await paymentService.generateUniqueOrderCode();
    const sellerName = cartItems[0]?.carbonCredit?.forest?.name || 'Platform';

    const order = await paymentService.createPayOSOrder({
      orderCode,
      userId,
      totalPrice: total,
      totalCredits,
      currency: 'USD',
      seller: sellerName,
      buyer: buyerAddress ?? '',
      cartItems: cartItems.map((item) => ({
        carbonCreditId: item.carbonCreditId,
        quantity: item.quantity,
        pricePerCredit: item.carbonCredit.pricePerCredit,
        subtotal: item.carbonCredit.pricePerCredit * item.quantity,
      })),
    });

    // Mark payment as paid immediately (mock — no real payment gateway)
    await prisma.$transaction(async (tx) => {
      await decrementAvailableCreditsForOrder(tx, order.id);

      await tx.payment.updateMany({
        where: { orderCode },
        data: { status: 'PAID', paidAt: new Date() },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'PROCESSING', paidAt: new Date() },
      });

      await tx.orderHistory.create({
        data: {
          orderId: order.id,
          event: 'paid',
          message: `Order paid via mock payment (orderCode: ${orderCode})`,
        },
      });
    });

    // ── 6. On-chain credit transfer (only when blockchain is enabled) ──────────
    let lastTxHash: string | null = null;
    let lastExplorerUrl: string | null = null;

    if (blockchainEnabled && buyerAddress && ethers.isAddress(buyerAddress)) {
      const amountByForestId = new Map<number, number>();
      for (const item of cartItems) {
        const fid = item.carbonCredit.forestId;
        amountByForestId.set(fid, (amountByForestId.get(fid) ?? 0) + item.quantity);
      }

      const chainId = Number(process.env.BASE_CHAIN_ID ?? 84532);
      const explorerBase =
        chainId === 8453 ? 'https://etherscan.io' : 'https://sepolia.etherscan.io';

      for (const [forestId, amount] of amountByForestId.entries()) {
        console.log(
          `[mock-payment] Transferring ${amount} forest-${forestId} credits to ${buyerAddress}...`,
        );

        const tx = await transferCreditsToBuyer({ forestId, amount, buyerAddress });
        lastTxHash = tx.txHash;
        lastExplorerUrl = `${explorerBase}/tx/${tx.txHash}`;

        console.log(
          `[mock-payment] Transfer confirmed: forest-${forestId} → ${buyerAddress} tx=${tx.txHash} block=${tx.blockNumber}`,
        );

        await prisma.orderHistory.create({
          data: {
            orderId: order.id,
            event: 'on_chain_transfer',
            message: `Transfer ${amount} forest-${forestId} credits to ${buyerAddress}. Tx: ${tx.txHash}`,
          },
        });
      }
    } else {
      console.warn(
        `[mock-payment] Skipping on-chain transfer for order ${order.id} (blockchain disabled or no wallet).`,
      );
    }

    // ── 7. Mark order COMPLETED ───────────────────────────────────────────────
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'COMPLETED',
        ...(lastTxHash && { transactionHash: lastTxHash }),
      },
    });

    // ── 8. Clear cart ─────────────────────────────────────────────────────────
    await prisma.cartItem.deleteMany({ where: { userId } });

    // ── 9. Side-effects (notifications, audit, certificate, carbon movement) ──
    try {
      await notifyOrderPaid(userId, order.id, orderCode);
    } catch {}

    try {
      await orderAuditMiddleware.ensureOrderAudit(order.id);
    } catch {}

    try {
      await carbonMovementService.trackOrderMovement(order.id);
    } catch {}

    try {
      const cert = await certificateService.generateCertificate(order.id);
      if (cert && typeof cert === 'object' && 'id' in cert) {
        await notifyCertificateIssued(userId, order.id, String((cert as any).id), orderCode);
      }
    } catch {}

    return NextResponse.json({
      success: true,
      orderCode,
      orderId: order.id,
      transactionHash: lastTxHash,
      explorerUrl: lastExplorerUrl,
      buyerAddress: buyerAddress ?? null,
      blockchainEnabled,
    });
  } catch (error) {
    if (error instanceof CreditInventoryError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return handleRouteError(error, 'Mock payment failed');
  }
}
