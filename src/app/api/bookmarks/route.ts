import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json([]);
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: Number(userId) },
    include: { forest: { include: { credits: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(bookmarks);
}

export async function POST(req: Request) {
  let { userId, forestId } = await req.json();

  if (userId === undefined || forestId === undefined) return NextResponse.json({ error: "Missing userId or forestId (undefined)" }, { status: 400 });
  userId = Number(userId);
  forestId = Number(forestId);
  if (isNaN(userId) || isNaN(forestId)) return NextResponse.json({ error: "userId or forestId is not a valid number", userId, forestId }, { status: 400 });
  // Check if bookmark already exists
  const existing = await prisma.bookmark.findFirst({ where: { userId, forestId } });
  if (existing) return NextResponse.json(existing);
  const bookmark = await prisma.bookmark.create({ data: { userId, forestId } });
  return NextResponse.json(bookmark);
}

export async function DELETE(req: Request) {
  const { userId, forestId } = await req.json();
  if (!userId || !forestId) return NextResponse.json({ error: "Missing userId or forestId" }, { status: 400 });
  await prisma.bookmark.deleteMany({ where: { userId, forestId } });
  return NextResponse.json({ success: true });
}
