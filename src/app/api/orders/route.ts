import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { notificationService } from "@/lib/notification-service";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const where = userId ? { userId: Number(userId) } : undefined;
  const orders = await prisma.order.findMany({
    where,
    include: {
      user: true,
      items: {
        include: {
          carbonCredit: true,
        },
      },
      payments: true,
      orderHistory: true,
    },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const { userId, status, items } = await req.json();
  let totalPrice = 0;
  const createdOrder = await prisma.order.create({
    data: {
      userId,
      status,
      totalPrice: 0, // will update after items
      items: {
        create: items.map((item: any) => {
          const subtotal = item.quantity * item.pricePerCredit;
          totalPrice += subtotal;
          return { ...item, subtotal };
        }),
      },
    },
    include: { items: true },
  });
  await prisma.order.update({ where: { id: createdOrder.id }, data: { totalPrice } });
  const orderWithUser = await prisma.order.findUnique({
    where: { id: createdOrder.id },
    include: {
      user: true,
      items: { include: { carbonCredit: true } },
      payments: true,
      orderHistory: true,
    },
  });

  // Create notification for order creation
  try {
    const notification = await notificationService.createOrderNotification(userId, createdOrder.id, "Order Created", `Your order #${createdOrder.id} has been created successfully. Total: $${totalPrice.toFixed(2)}`);
  } catch (error) {
    console.error("Error creating order notification:", error);
  }

  return NextResponse.json(orderWithUser);
}

export async function PUT(req: Request) {
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const order = await prisma.order.update({ where: { id }, data });
  return NextResponse.json(order);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
