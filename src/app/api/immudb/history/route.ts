export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getImmudbService } from '@/lib/immudb-service';

export async function GET(request: NextRequest) {
  const immudbService = getImmudbService();
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get('hash');

  if (!hash) {
    return NextResponse.json(
      {
        success: false,
        message: 'Hash parameter is required',
      },
      { status: 400 },
    );
  }

  if (!immudbService) {
    return NextResponse.json(
      {
        success: false,
        message: 'ImmuDB service not available',
      },
      { status: 500 },
    );
  }

  try {
    const history = await immudbService.getHistory(hash);

    return NextResponse.json({
      success: true,
      hash,
      history,
      count: history.length,
    });
  } catch (error) {
    console.error('Failed to get transaction history:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to get transaction history: ${error}`,
      },
      { status: 500 },
    );
  }
}
