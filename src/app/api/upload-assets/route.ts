import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { blockchainService } from "@/lib/blockchain-service";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { userId, carbonCreditAmount, forestName } = await req.json();
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
