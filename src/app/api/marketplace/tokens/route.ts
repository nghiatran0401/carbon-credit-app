import { NextRequest, NextResponse } from "next/server";
import { blockchainService } from "@/lib/blockchain-service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uploaderFilter = searchParams.get("uploader");

    // Initialize blockchain service
    await blockchainService.initialize();

    // Get all forests from database
    const forests = await prisma.forest.findMany({
      include: {
        credits: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    // For each forest, try to get its on-chain token data
    const tokensWithData = await Promise.all(
      forests.map(async (forest) => {
        try {
          // Get token ID for this forest from blockchain
          const tokenId = await blockchainService.getTokenIdForForest(
            forest.id,
          );

          if (tokenId === null || tokenId === 0) {
            // No token exists on-chain for this forest
            return {
              hasToken: false,
              offChainData: {
                forestId: forest.id,
                uploader: forest.uploader,
                name: forest.name,
                location: forest.location,
                type: forest.type,
                area: forest.area,
                description: forest.description,
                status: forest.status,
                lastUpdated: forest.lastUpdated,
                credits: forest.credits,
              },
              onChainData: null,
            };
          }

          // Get forest ID from blockchain token
          const blockchainForestId =
            await blockchainService.getForestIdForToken(tokenId);

          // Get owner address (for display purposes)
          const ownerAddress = process.env.OWNER_ADDRESS || "Unknown";

          return {
            hasToken: true,
            offChainData: {
              forestId: forest.id,
              uploader: forest.uploader,
              name: forest.name,
              location: forest.location,
              type: forest.type,
              area: forest.area,
              description: forest.description,
              status: forest.status,
              lastUpdated: forest.lastUpdated,
              credits: forest.credits,
            },
            onChainData: {
              tokenId,
              blockchainForestId,
              contractAddress: process.env.CONTRACT_ADDRESS || "Unknown",
              ownerAddress,
              network: "Ganache Local",
            },
          };
        } catch (error) {
          console.error(
            `Error fetching token data for forest ${forest.id}:`,
            error,
          );
          // Return off-chain data only if blockchain query fails
          return {
            hasToken: false,
            offChainData: {
              forestId: forest.id,
              uploader: forest.uploader,
              name: forest.name,
              location: forest.location,
              type: forest.type,
              area: forest.area,
              description: forest.description,
              status: forest.status,
              lastUpdated: forest.lastUpdated,
              credits: forest.credits,
            },
            onChainData: null,
          };
        }
      }),
    );

    // Filter by uploader if specified
    const filteredTokens = uploaderFilter
      ? tokensWithData.filter(
          (token) => token.offChainData.uploader === uploaderFilter,
        )
      : tokensWithData;

    return NextResponse.json({
      tokens: filteredTokens,
      total: filteredTokens.length,
      withTokens: filteredTokens.filter((t) => t.hasToken).length,
      withoutTokens: filteredTokens.filter((t) => !t.hasToken).length,
    });
  } catch (error: any) {
    console.error("Error fetching marketplace tokens:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch marketplace tokens" },
      { status: 500 },
    );
  }
}
