import { NextResponse } from 'next/server';
import { mockCarbonMovementData } from '@/lib/mock-carbon-movement-data';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');

    switch (endpoint) {
      case 'stats':
        return NextResponse.json({
          success: true,
          data: mockCarbonMovementData.getStatistics(),
        });

      case 'timeline':
        return NextResponse.json({
          success: true,
          data: mockCarbonMovementData.getTimelineData(),
        });

      case 'sync':
        // Simulate data synchronization with optional limit
        const syncLimitStr = url.searchParams.get('limit');
        const syncLimit = syncLimitStr ? parseInt(syncLimitStr) : undefined;
        const syncData = mockCarbonMovementData.getMockData(syncLimit);

        return NextResponse.json({
          success: true,
          message: 'Mock data synchronized successfully',
          synced: {
            nodes: syncData.nodes.length,
            relationships: syncData.links.length,
          },
        });

      default:
        // Return the graph data with optional limit
        const limitStr = url.searchParams.get('limit');
        const limit = limitStr ? parseInt(limitStr) : undefined;

        return NextResponse.json({
          success: true,
          data: mockCarbonMovementData.getMockData(limit),
        });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Mock carbon movement API error:', error);
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'refresh':
        // Simulate refreshing the mock data
        return NextResponse.json({
          success: true,
          message: 'Mock data refreshed successfully',
          data: mockCarbonMovementData.getMockData(),
        });

      case 'search':
        const { query } = body;
        const mockData = mockCarbonMovementData.getMockData();

        // Simple search implementation
        const filteredNodes = mockData.nodes.filter(
          (node) =>
            node.properties.name?.toLowerCase().includes(query.toLowerCase()) ||
            node.type.toLowerCase().includes(query.toLowerCase()),
        );

        const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
        const filteredLinks = mockData.links.filter(
          (link) => filteredNodeIds.has(link.source) || filteredNodeIds.has(link.target),
        );

        return NextResponse.json({
          success: true,
          data: {
            nodes: filteredNodes,
            links: filteredLinks,
          },
        });

      default:
        return NextResponse.json(
          {
            success: false,
            message: 'Unknown action',
          },
          { status: 400 },
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Mock carbon movement API POST error:', error);
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
