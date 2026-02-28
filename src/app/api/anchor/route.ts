import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError, handleRouteError } from '@/lib/auth';
import {
  anchorAudits,
  getAllAnchors,
  getWalletInfo,
  deployContract,
} from '@/lib/blockchain-service';
import { notifyAnchorConfirmed } from '@/lib/notification-emitter';

export const dynamic = 'force-dynamic';

/**
 * GET /api/anchor — List all blockchain anchors + wallet info
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (isAuthError(auth)) return auth;

    const [anchors, wallet] = await Promise.all([getAllAnchors(), getWalletInfo()]);

    return NextResponse.json({
      success: true,
      anchors,
      wallet,
      count: anchors.length,
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to get anchors');
  }
}

/**
 * POST /api/anchor — Anchor audit Merkle root on Base
 *
 * Body: { action: "anchor" | "deploy" }
 *   - "anchor": Build Merkle tree and publish root on-chain
 *   - "deploy": Deploy the AuditAnchor contract (one-time setup)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (isAuthError(auth)) return auth;

    const { action } = await request.json();

    if (action === 'deploy') {
      const result = await deployContract();
      return NextResponse.json({
        success: true,
        message: 'AuditAnchor contract deployed successfully',
        ...result,
      });
    }

    if (action === 'anchor') {
      const result = await anchorAudits();
      try {
        await notifyAnchorConfirmed(result.anchorId, result.orderIds, result.auditCount);
      } catch (notificationError) {
        console.error('Failed to create anchor notification:', notificationError);
      }
      return NextResponse.json({
        success: true,
        message: `Anchored ${result.auditCount} audit records on Base`,
        ...result,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action. Use "anchor" or "deploy".' },
      { status: 400 },
    );
  } catch (error) {
    return handleRouteError(error, 'Anchoring failed');
  }
}
