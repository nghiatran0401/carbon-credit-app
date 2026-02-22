import { NextResponse } from 'next/server';
import { orderAuditMiddleware } from '@/lib/order-audit-middleware';

export async function POST(req: Request) {
  console.log('🔄 Running background audit check...');

  try {
    const result = await orderAuditMiddleware.processAllCompletedOrders();

    return NextResponse.json({
      success: true,
      message: `Audit check completed`,
      details: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Background audit check failed:', message);

    return NextResponse.json(
      {
        success: false,
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return NextResponse.json({
    message: 'Background audit service. Use POST to run audit check for all completed orders.',
    endpoints: {
      'POST /api/audit/background': 'Run audit check for all completed orders',
      'GET /api/audit/background': 'This help message',
    },
    timestamp: new Date().toISOString(),
  });
}
