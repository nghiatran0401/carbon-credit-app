export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getImmudbService, TransactionHash } from '@/lib/immudb-service';

export async function POST(request: NextRequest) {
  const immudbService = getImmudbService();

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
    const body = await request.json();
    const { hash, transactionType, blockNumber, metadata } = body;

    if (!hash || !transactionType) {
      return NextResponse.json(
        {
          success: false,
          message: 'Hash and transactionType are required',
        },
        { status: 400 },
      );
    }

    const transactionHash: TransactionHash = {
      hash,
      timestamp: Date.now(),
      blockNumber: blockNumber || undefined,
      transactionType,
      metadata: metadata || {},
    };

    const id = await immudbService.storeTransactionHash(transactionHash);

    return NextResponse.json({
      success: true,
      message: 'Transaction hash stored successfully',
      id,
      data: transactionHash,
    });
  } catch (error) {
    console.error('Failed to store transaction hash:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to store transaction hash: ${error}`,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const immudbService = getImmudbService();

  if (!immudbService) {
    return NextResponse.json(
      {
        success: false,
        message: 'ImmuDB service not available',
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const hash = searchParams.get('hash');
  const limit = parseInt(searchParams.get('limit') || '100');

  try {
    if (hash) {
      // Get specific transaction hash
      const transactionHash = await immudbService.getTransactionHash(hash);

      if (transactionHash) {
        return NextResponse.json({
          success: true,
          data: transactionHash,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            message: 'Transaction hash not found',
          },
          { status: 404 },
        );
      }
    } else {
      // Get all transaction hashes
      const transactionHashes = await immudbService.getAllTransactionHashes(limit);

      return NextResponse.json({
        success: true,
        data: transactionHashes,
        count: transactionHashes.length,
      });
    }
  } catch (error) {
    console.error('Failed to get transaction hash:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to get transaction hash: ${error}`,
      },
      { status: 500 },
    );
  }
}
