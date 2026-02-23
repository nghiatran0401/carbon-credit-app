export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { neo4jService } from '@/lib/neo4j-service';
import { carbonMovementService } from '@/lib/carbon-movement-service';
import { requireAdmin, isAuthError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const isConnected = await neo4jService.testConnection();

    if (!isConnected) {
      return NextResponse.json(
        { success: false, message: 'Failed to connect to Neo4j' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Neo4j connection successful',
      endpoints: {
        'GET /api/neo4j/test': 'Test Neo4j connection',
        'POST /api/neo4j/test': 'Sync or init-schema (admin only)',
        'GET /api/neo4j/graph': 'Get carbon credit movement graph',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Neo4j test error:', message);
    return NextResponse.json(
      { success: false, message: 'Neo4j connection check failed' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const { action } = await req.json();

    if (action === 'sync') {
      carbonMovementService.syncAllData().catch((err) => {
        console.error('Background Neo4j sync failed:', err);
      });

      return NextResponse.json({
        success: true,
        message: 'Neo4j sync started in background',
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'init-schema') {
      await neo4jService.initializeSchema();

      return NextResponse.json({
        success: true,
        message: 'Neo4j schema initialized successfully',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action. Use 'sync' or 'init-schema'" },
      { status: 400 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Neo4j operation error:', message);
    return NextResponse.json(
      { success: false, message: 'Neo4j operation failed' },
      { status: 500 },
    );
  }
}
