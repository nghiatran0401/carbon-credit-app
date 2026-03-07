import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json([]);
  // Bookmark table doesn't exist in database
  return NextResponse.json([]);
}

export async function POST(req: Request) {
  let { userId, forestId } = await req.json();

  if (userId === undefined || forestId === undefined)
    return NextResponse.json(
      { error: "Missing userId or forestId (undefined)" },
      { status: 400 },
    );
  userId = Number(userId);
  forestId = Number(forestId);
  if (isNaN(userId) || isNaN(forestId))
    return NextResponse.json(
      { error: "userId or forestId is not a valid number", userId, forestId },
      { status: 400 },
    );
  // Bookmark table doesn't exist in database
  return NextResponse.json(
    { error: "Bookmark feature is not available" },
    { status: 501 },
  );
}

export async function DELETE(req: Request) {
  const { userId, forestId } = await req.json();
  if (!userId || !forestId)
    return NextResponse.json(
      { error: "Missing userId or forestId" },
      { status: 400 },
    );
  // Bookmark table doesn't exist in database
  return NextResponse.json({ success: true });
}
