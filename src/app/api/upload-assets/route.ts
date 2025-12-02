import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { blockchainService } from "@/lib/blockchain-service";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();
const DATA_FILE = path.join(process.cwd(), "data", "saved_analyses.json");

export async function POST(req: Request) {
  const body = await req.json();
  const { userId, carbonCreditAmount, forestName } = body;
  console.log("Received data:", { userId, carbonCreditAmount, forestName });
  if (!userId || !carbonCreditAmount || !forestName) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  try {
    // Create forest and carbon credit in one transaction
    const forest = await prisma.forest.create({
      data: {
        name: forestName,
        uploader: String(userId),
        location: "Can Gio District, Ho Chi Minh City", // You can make this dynamic
        type: "Mangrove", // You can make this dynamic
        area: 850, // You can make this dynamic
        description:
          "Primary mangrove conservation area with high biodiversity.", // You can make this dynamic
        status: "Active",
        lastUpdated: new Date(),
        credits: {
          create: {
            vintage: new Date().getFullYear(),
            certification: "User Upload",
            totalCredits: carbonCreditAmount,
            availableCredits: carbonCreditAmount,
            pricePerCredit: 10,
            symbol: "tCO₂",
            retiredCredits: 0,
          },
        },
      },
      include: {
        credits: true,
      },
    });

    // Mint ERC1155 tokens on blockchain
    const mintResult = await blockchainService.mintCarbonCredits(
      forest.id,
      carbonCreditAmount,
    );

    if (!mintResult.success) {
      console.error("Failed to mint tokens:", mintResult.error);
      // Still return success for database record, but include blockchain warning
      return NextResponse.json({
        ...forest,
        blockchainWarning:
          "Forest created but token minting failed: " + mintResult.error,
      });
    }
    console.log("Tokens minted successfully:", {
      tokenId: mintResult.tokenId,
      transactionHash: mintResult.transactionHash,
    });

    // Also save to JSON file for analysis tracking (optional)
    try {
      const analyses = await getAnalyses();
      const newAnalysis = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        forestId: forest.id,
        forestName: forest.name,
        userId,
        carbonCreditAmount,
        ...body, // Include any additional data like bounds, mask, stats, biomassData
      };
      analyses.push(newAnalysis);
      await saveAnalyses(analyses);
      console.log("Analysis saved to JSON file");
    } catch (jsonError) {
      console.error("Failed to save to JSON (non-critical):", jsonError);
      // Don't fail the request if JSON save fails
    }

    return NextResponse.json({
      ...forest,
      blockchain: {
        tokenId: mintResult.tokenId,
        transactionHash: mintResult.transactionHash,
      },
    });
  } catch (error: any) {
    console.error("Error creating forest:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create forest" },
      { status: 500 },
    );
  }
}

// Helper functions for JSON file operations
async function getAnalyses() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveAnalyses(analyses: any[]) {
  await fs.writeFile(DATA_FILE, JSON.stringify(analyses, null, 2));
}
