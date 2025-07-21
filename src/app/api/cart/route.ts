import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// TODO: Replace with real session/user extraction
function getUserId(req: NextRequest): number | null {
  // For now, get from header or body (for demo)
  const userId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId");
  return userId ? Number(userId) : null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cart = await prisma.cartItem.findMany({
    where: { userId },
    include: { carbonCredit: { include: { forest: true } } },
  });
  return NextResponse.json(cart);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, carbonCreditId, quantity } = body;
  if (!userId || !carbonCreditId || !quantity) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  // Upsert: if exists, update quantity; else, create
  const existing = await prisma.cartItem.findFirst({ where: { userId, carbonCreditId } });
  let item;
  if (existing) {
    item = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    item = await prisma.cartItem.create({
      data: { userId, carbonCreditId, quantity },
    });
  }
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { userId, carbonCreditId, quantity } = body;
  if (!userId || !carbonCreditId || !quantity) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const item = await prisma.cartItem.updateMany({
    where: { userId, carbonCreditId },
    data: { quantity },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { userId, carbonCreditId } = body;
  if (!userId || !carbonCreditId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  await prisma.cartItem.deleteMany({ where: { userId, carbonCreditId } });
  return NextResponse.json({ success: true });
}
