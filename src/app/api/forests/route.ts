import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const forests = await prisma.forest.findMany({
    include: {
      credits: true,
    },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(forests);
}

export async function POST(req: Request) {
  const data = await req.json();
  const forest = await prisma.forest.create({
    data: {
      name: data.name,
      location: data.location,
      type: data.type,
      area: Number(data.area),
      description: data.description,
      status: data.status,
      lastUpdated: new Date(data.lastUpdated),
    },
  });
  return NextResponse.json(forest);
}

export async function PUT(req: Request) {
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const forest = await prisma.forest.update({
    where: { id: Number(id) },
    data: {
      name: data.name,
      location: data.location,
      type: data.type,
      area: Number(data.area),
      description: data.description,
      status: data.status,
      lastUpdated: new Date(data.lastUpdated),
    },
  });
  return NextResponse.json(forest);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.forest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
