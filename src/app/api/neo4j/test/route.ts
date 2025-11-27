import { NextResponse } from "next/server";
import { neo4jService } from "@/lib/neo4j-service";
import { carbonMovementService } from "@/lib/carbon-movement-service";

export async function GET(req: Request) {
  try {
    // Test Neo4j connection
    const isConnected = await neo4jService.testConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        message: "Failed to connect to Neo4j"
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Neo4j connection successful",
      endpoints: {
        "GET /api/neo4j/test": "Test Neo4j connection",
        "POST /api/neo4j/sync": "Sync all data to Neo4j",
        "GET /api/neo4j/graph": "Get carbon credit movement graph"
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Neo4j test error:', error.message);
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { action } = await req.json();
    
    if (action === 'sync') {
      await carbonMovementService.syncAllData();
      
      return NextResponse.json({
        success: true,
        message: "All data synced to Neo4j successfully",
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'init-schema') {
      await neo4jService.initializeSchema();
      
      return NextResponse.json({
        success: true,
        message: "Neo4j schema initialized successfully",
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json({
      success: false,
      message: "Invalid action. Use 'sync' or 'init-schema'"
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Neo4j operation error:', error.message);
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}