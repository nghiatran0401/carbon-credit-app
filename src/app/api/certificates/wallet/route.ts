import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";
import { blockchainService } from "@/lib/blockchain-service";

const prisma = new PrismaClient();
const BUYER_ADDRESS =
  process.env.BUYER_ADDRESS || "0xC0D96df80AA7eFe04e4ed8D4170C87d75dAe047e";
const BUYER_PRIVATE_KEY = process.env.BUYER_PRIVATE_KEY || "";

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

    // Only allow buyer wallet to export certificate
    if (walletAddress.toLowerCase() !== BUYER_ADDRESS.toLowerCase()) {
      return NextResponse.json(
        { error: "Only the buyer wallet can export certificates" },
        { status: 403 },
      );
    }

    if (!BUYER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Buyer private key not configured" },
        { status: 500 },
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

    // Burn all tokens on blockchain
    const burnResults: Array<{
      tokenId: number;
      forestName: string;
      amount: number;
      success: boolean;
      transactionHash?: string;
      error?: string;
    }> = [];

    for (const token of walletTokens) {
      try {
        console.log(
          `Burning ${token.balance} credits (Token ID: ${token.tokenId}) from wallet ${walletAddress}`,
        );

        const burnResult = await blockchainService.retireCredits(
          token.tokenId,
          token.balance,
          walletAddress,
          BUYER_PRIVATE_KEY,
        );

        burnResults.push({
          tokenId: token.tokenId,
          forestName: token.forestName,
          amount: token.balance,
          success: burnResult.success,
          transactionHash: burnResult.transactionHash,
          error: burnResult.error,
        });

        if (!burnResult.success) {
          console.error(
            `Failed to burn tokens for ${token.forestName}:`,
            burnResult.error,
          );
        } else {
          console.log(
            `Successfully burned ${token.balance} tokens. TX: ${burnResult.transactionHash}`,
          );
        }
      } catch (error: any) {
        console.error(`Error burning tokens for ${token.forestName}:`, error);
        burnResults.push({
          tokenId: token.tokenId,
          forestName: token.forestName,
          amount: token.balance,
          success: false,
          error: error.message,
        });
      }
    }

    // Check if all burns were successful
    const allBurnsSuccessful = burnResults.every((result) => result.success);

    if (!allBurnsSuccessful) {
      const failedBurns = burnResults.filter((result) => !result.success);
      return NextResponse.json(
        {
          error: "Failed to burn some tokens",
          failedBurns,
          details: failedBurns
            .map((fb) => `${fb.forestName}: ${fb.error}`)
            .join(", "),
        },
        { status: 500 },
      );
    }

    // Generate certificate ID
    const certificateId = `RC-${userId}-${Date.now()}`;

    // Prepare certificate data (not saved to database)
    const certificateData = {
      certificateId,
      userId,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      walletAddress,
      totalCredits,
      totalValue,
      retiredDate: new Date().toISOString(),
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
      burnTransactions: burnResults.map((result) => ({
        tokenId: result.tokenId,
        forestName: result.forestName,
        amount: result.amount,
        transactionHash: result.transactionHash,
      })),
    };

    // Generate certificate hash
    const dataString = JSON.stringify({
      certificateId: certificateData.certificateId,
      userId: certificateData.userId,
      totalCredits: certificateData.totalCredits,
      totalValue: certificateData.totalValue,
      retiredDate: certificateData.retiredDate,
      walletAddress: certificateData.walletAddress,
      burnTransactions: certificateData.burnTransactions,
    });
    const certificateHash = crypto
      .createHash("sha256")
      .update(dataString)
      .digest("hex");

    // Return certificate data without saving to database
    return NextResponse.json({
      success: true,
      certificate: {
        certificateId,
        certificateHash,
        totalCredits,
        totalValue,
        tokenCount: walletTokens.length,
        retiredDate: certificateData.retiredDate,
        burnedOnBlockchain: true,
        metadata: {
          ...certificateData,
          certificateHash,
          type: "retirement_certificate",
        },
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
