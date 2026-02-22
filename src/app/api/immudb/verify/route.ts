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
    const isVerified = await immudbService.verifyTransactionHash(hash);

    return NextResponse.json({
      success: true,
      verified: isVerified,
      hash,
      message: isVerified
        ? 'Transaction hash is verified'
        : 'Transaction hash could not be verified',
    });
  } catch (error) {
    console.error('Failed to verify transaction hash:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to verify transaction hash: ${error}`,
      },
      { status: 500 },
    );
  }
}
