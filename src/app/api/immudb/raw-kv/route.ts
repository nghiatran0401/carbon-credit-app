import { NextRequest, NextResponse } from 'next/server';
import { getImmudbService } from '@/lib/immudb-service';

export async function GET(request: NextRequest) {
  const immudbService = getImmudbService();
  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get('prefix') || '';
  const limit = parseInt(searchParams.get('limit') || '100');
  
  try {
    await immudbService.ensureConnected();
    
    if (!immudbService['client']) {
      throw new Error('ImmuDB client not available');
    }

    // Use scan to get raw key-value pairs
    const result = await immudbService['client'].scan({
      prefix,
      limit,
    });

    const keyValuePairs: Array<{
      key: string;
      value: string;
      rawValue: any;
      timestamp?: number;
    }> = [];

    if (result && result.entriesList) {
      for (const entry of result.entriesList) {
        try {
          // Convert value to string if it's a Uint8Array
          const valueStr = typeof entry.value === 'string' 
            ? entry.value 
            : new TextDecoder().decode(entry.value as Uint8Array);

          keyValuePairs.push({
            key: entry.key,
            value: valueStr,
            rawValue: entry.value,
            timestamp: entry.timestamp || Date.now()
          });
        } catch (error) {
          console.warn('Failed to process entry:', error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: keyValuePairs,
      count: keyValuePairs.length,
      prefix,
      limit
    });

  } catch (error) {
    console.error('Failed to get raw key-value data:', error);
    return NextResponse.json({
      success: false,
      message: `Failed to get key-value data: ${error}`,
    }, { status: 500 });
  }
}