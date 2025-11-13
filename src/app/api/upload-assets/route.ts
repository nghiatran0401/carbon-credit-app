import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

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

  // Create forest and carbon credit in one transaction
  const forest = await prisma.forest.create({
    data: {
      name: forestName,
      uploader: String(userId),
      location: "Can Gio District, Ho Chi Minh City", // You can make this dynamic
      type: "Mangrove", // You can make this dynamic
      area: 850, // You can make this dynamic
      description: "Primary mangrove conservation area with high biodiversity.", // You can make this dynamic
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

  return NextResponse.json(forest);
}
