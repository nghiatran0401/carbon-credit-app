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
  try {
    const { id, status, ...data } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Get the current order to check if status is changing
    const currentOrder = await prisma.order.findUnique({
      where: { id: Number(id) },
      select: { status: true, userId: true },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updateData: any = { ...data };
    if (status !== undefined) updateData.status = status;

    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: updateData,
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
    });

    // Create order history entry if status changed
    if (status && status !== currentOrder.status) {
      await prisma.orderHistory.create({
        data: {
          orderId: Number(id),
          event: "status_updated",
          message: `Order status changed from ${currentOrder.status} to ${status}`,
        },
      });

      // Create notification for status change
      try {
        await notificationService.createOrderNotification(currentOrder.userId, Number(id), "Status Updated", `Your order #${id} status has been updated to ${status}`);
      } catch (error) {
        console.error("Error creating status update notification:", error);
      }

      // Fetch the updated order with the new order history
      const updatedOrderWithHistory = await prisma.order.findUnique({
        where: { id: Number(id) },
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
      });

      return NextResponse.json(updatedOrderWithHistory);
    }

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: error.message || "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
