import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET() {
  const rates = await prisma.exchangeRate.findMany();
  return NextResponse.json(rates);
}
