import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const credits = await prisma.carbonCredit.findMany({
    include: {
      forest: true,
    },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(credits);
}

export async function POST(req: Request) {
  const data = await req.json();
  const credit = await prisma.carbonCredit.create({ data });
  return NextResponse.json(credit);
}

export async function PUT(req: Request) {
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const credit = await prisma.carbonCredit.update({ where: { id }, data });
  return NextResponse.json(credit);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.carbonCredit.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
