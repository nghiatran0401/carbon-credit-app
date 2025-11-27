import { NextRequest, NextResponse } from 'next/server';
import { getImmudbService } from '@/lib/immudb-service';

export async function GET() {
  const immudbService = getImmudbService();
  
  try {
    await immudbService.ensureConnected();
    const isConnected = await immudbService.isConnected();
    
    return NextResponse.json({
      success: true,
      connected: isConnected,
      message: isConnected ? 'Successfully connected to ImmuDB' : 'Failed to connect to ImmuDB',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    return NextResponse.json({
      success: false,
      connected: false,
      message: `Connection failed: ${error}`,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}