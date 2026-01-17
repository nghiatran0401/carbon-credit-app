import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const supabaseUserId = url.searchParams.get("supabaseUserId");

  // Query by supabaseUserId first (more reliable for linking)
  if (supabaseUserId) {
    const user = await prisma.user.findUnique({
      where: { supabaseUserId },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
    return NextResponse.json(user || null);
  }

  // Fallback to email query
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
    return NextResponse.json(user || null);
  }

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
    if (role !== undefined) {
      // Convert lowercase role to uppercase enum value (ADMIN, USER)
      updateData.role = role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
    }
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
