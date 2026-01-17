import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'SQL transactions endpoint not implemented',
  }, { status: 501 });
}

