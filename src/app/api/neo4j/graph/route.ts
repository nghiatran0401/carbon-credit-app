export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { carbonMovementService } from '@/lib/carbon-movement-service';
import { requireAuth, isAuthError } from '@/lib/auth';

const MAX_GRAPH_LIMIT = 500;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const rawLimit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const limit = Math.min(Math.max(1, rawLimit), MAX_GRAPH_LIMIT);

    const graphData = await carbonMovementService.getCarbonCreditMovementGraph(limit);

    return NextResponse.json({
      success: true,
      data: graphData,
      meta: {
        nodeCount: graphData.nodes.length,
        relationshipCount: graphData.relationships.length,
        limit,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Graph data error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load graph data' },
      { status: 500 },
    );
  }
}
