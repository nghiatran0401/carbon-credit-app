import { NextRequest, NextResponse } from 'next/server';
import { getImmudbService } from '@/lib/immudb-service';

// This endpoint mimics immuclient CLI commands
export async function POST(request: NextRequest) {
  const immudbService = getImmudbService();
  
  if (!immudbService) {
    return NextResponse.json({
      success: false,
      error: 'ImmuDB service not available',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
  
  try {
    const { command, key, value, prefix, limit } = await request.json();
    
    await immudbService.ensureConnected();
    
    if (!immudbService['client']) {
      throw new Error('ImmuDB client not available');
    }

    const client = immudbService['client'];
    let result: any = null;
    let commandExecuted = '';

    switch (command.toLowerCase()) {
      case 'get':
        if (!key) {
          throw new Error('Key is required for GET command');
        }
        result = await client.get({ key });
        commandExecuted = `GET ${key}`;
        break;

      case 'set':
        if (!key || !value) {
          throw new Error('Key and value are required for SET command');
        }
        result = await client.set({ key, value });
        commandExecuted = `SET ${key} ${value}`;
        break;

      case 'scan':
        result = await client.scan({
          prefix: prefix || '',
          limit: limit || 100
        });
        commandExecuted = `SCAN ${prefix || ''} LIMIT ${limit || 100}`;
        break;

      case 'history':
        if (!key) {
          throw new Error('Key is required for HISTORY command');
        }
        result = await client.history({ key });
        commandExecuted = `HISTORY ${key}`;
        break;

      case 'verify':
        if (!key) {
          throw new Error('Key is required for VERIFY command');
        }
        result = await client.verifiedGet({ key });
        commandExecuted = `VERIFY ${key}`;
        break;

      case 'count':
        // Count all keys with prefix
        const scanResult = await client.scan({
          prefix: prefix || '',
          limit: 10000 // Large limit to count all
        });
        result = {
          count: scanResult?.entriesList?.length || 0,
          prefix: prefix || 'all'
        };
        commandExecuted = `COUNT ${prefix || 'all'}`;
        break;

      default:
        throw new Error(`Unknown command: ${command}`);
    }

    return NextResponse.json({
      success: true,
      command: commandExecuted,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('CLI command failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}