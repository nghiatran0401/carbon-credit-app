import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
  return NextResponse.json(users);
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, role, emailVerified } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (emailVerified !== undefined) updateData.emailVerified = emailVerified;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
  }
}
