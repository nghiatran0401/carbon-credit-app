import { NextResponse } from "next/server";
import { carbonMovementService } from "@/lib/carbon-movement-service";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    
    const graphData = await carbonMovementService.getCarbonCreditMovementGraph(limit);
    
    return NextResponse.json({
      success: true,
      data: graphData,
      meta: {
        nodeCount: graphData.nodes.length,
        relationshipCount: graphData.relationships.length,
        limit
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Graph data error:', error.message);
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}