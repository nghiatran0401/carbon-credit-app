import { NextRequest, NextResponse } from "next/server";
import { blockchainService } from "@/lib/blockchain-service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get("address");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 },
      );
    }

    // Initialize blockchain service
    await blockchainService.initialize();

    // Get all forests to check their token balances
    const forests = await prisma.forest.findMany({
      include: {
        credits: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    // Get token balances for each forest
    const tokenBalances = await Promise.all(
      forests.map(async (forest) => {
        const tokenId = await blockchainService.getTokenIdForForest(forest.id);

        if (tokenId === null || tokenId === 0) {
          return null;
        }

        const balance = await blockchainService.getBalance(
          walletAddress,
          tokenId,
        );

        if (balance === 0) {
          return null;
        }

        // Get the forestId stored on the blockchain token
        const blockchainForestId =
          await blockchainService.getForestIdForToken(tokenId);

        return {
          tokenId,
          forestId: forest.id,
          blockchainForestId, // Forest ID stored on the blockchain token
          forestName: forest.name,
          forestLocation: forest.location,
          balance,
          credit: forest.credits[0] || null,
        };
      }),
    );

    // Filter out null values (forests with no tokens)
    const validTokens = tokenBalances.filter((token) => token !== null);

    return NextResponse.json({
      walletAddress,
      tokens: validTokens,
      totalTokenTypes: validTokens.length,
    });
  } catch (error: any) {
    console.error("Error fetching wallet data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch wallet data" },
      { status: 500 },
    );
  }
}
