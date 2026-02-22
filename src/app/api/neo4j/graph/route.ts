export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { carbonMovementService } from '@/lib/carbon-movement-service';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

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
    const message = error instanceof Error ? error.message : String(error);
    console.error('Graph data error:', message);
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
