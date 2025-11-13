import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";
import { blockchainService } from "@/lib/blockchain-service";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, walletAddress } = body;

    if (!userId || !walletAddress) {
      return NextResponse.json(
        { error: "Missing userId or walletAddress" },
        { status: 400 },
      );
    }

    // Initialize blockchain service
    await blockchainService.initialize();

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all tokens for this wallet address
    const forests = await prisma.forest.findMany({
      include: {
        credits: true,
      },
    });

    const walletTokens = [];
    let totalCredits = 0;
    let totalValue = 0;

    // Check each forest token balance
    for (const forest of forests) {
      try {
        const tokenId = await blockchainService.getTokenIdForForest(forest.id);
        if (tokenId && tokenId > 0) {
          const balance = await blockchainService.getBalance(
            walletAddress,
            tokenId,
          );

          if (balance > 0) {
            const credit = forest.credits[0]; // Get first credit for pricing
            const value = credit ? balance * credit.pricePerCredit : 0;

            walletTokens.push({
              tokenId,
              forestId: forest.id,
              forestName: forest.name,
              forestLocation: forest.location,
              forestType: forest.type,
              balance,
              certification: credit?.certification || "Unknown",
              vintage: credit?.vintage || new Date().getFullYear(),
              pricePerCredit: credit?.pricePerCredit || 0,
              value,
            });

            totalCredits += balance;
            totalValue += value;
          }
        }
      } catch (error) {
        console.error(`Error checking token for forest ${forest.id}:`, error);
      }
    }

    if (walletTokens.length === 0) {
      return NextResponse.json(
        { error: "No tokens found in wallet" },
        { status: 404 },
      );
    }

    // Generate certificate ID
    const certificateId = `WC-${userId}-${Date.now()}`;

    // Prepare certificate data
    const certificateData = {
      certificateId,
      userId,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      walletAddress,
      totalCredits,
      totalValue,
      exportDate: new Date().toISOString(),
      tokens: walletTokens.map((token) => ({
        forestName: token.forestName,
        forestLocation: token.forestLocation,
        forestType: token.forestType,
        certification: token.certification,
        vintage: token.vintage,
        quantity: token.balance,
        pricePerCredit: token.pricePerCredit,
        subtotal: token.value,
      })),
    };

    // Generate certificate hash
    const dataString = JSON.stringify({
      certificateId: certificateData.certificateId,
      userId: certificateData.userId,
      totalCredits: certificateData.totalCredits,
      totalValue: certificateData.totalValue,
      exportDate: certificateData.exportDate,
      walletAddress: certificateData.walletAddress,
    });
    const certificateHash = crypto
      .createHash("sha256")
      .update(dataString)
      .digest("hex");

    // Create certificate in database (wallet certificates don't have orderId)
    const certificate = await (prisma as any).certificate.create({
      data: {
        certificateHash,
        metadata: {
          ...certificateData,
          certificateHash,
          type: "wallet_export",
        } as any,
        status: "active",
      },
    });

    return NextResponse.json({
      success: true,
      certificate: {
        id: certificate.id,
        certificateId,
        certificateHash,
        totalCredits,
        totalValue,
        tokenCount: walletTokens.length,
        exportDate: certificateData.exportDate,
        metadata: certificateData,
      },
    });
  } catch (error: any) {
    console.error("Error generating wallet certificate:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate certificate" },
      { status: 500 },
    );
  }
}
