import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  requireOwnershipOrAdmin,
  isAuthError,
  handleRouteError,
} from '@/lib/auth';
import {
  orderCreateSchema,
  orderUpdateSchema,
  validateBody,
  isValidationError,
} from '@/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    let where;
    if (userId) {
      const ownerCheck = await requireOwnershipOrAdmin(req, Number(userId));
      if (isAuthError(ownerCheck)) return ownerCheck;
      where = { userId: Number(userId) };
    } else if (auth.role?.toLowerCase() !== 'admin') {
      where = { userId: auth.id };
    }

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
      orderBy: { id: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch orders');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const validated = validateBody(orderCreateSchema, body);
    if (isValidationError(validated)) return validated;

    const { status, items } = validated;
    const userId = auth.id;

    let totalPrice = 0;
    const timePart = Math.floor(Date.now() / 1000) % 100000;
    const random = Math.floor(Math.random() * 9000) + 1000;
    const orderCode = timePart * 10000 + random;

    const createdOrder = await prisma.order.create({
      data: {
        orderCode,
        userId,
        status,
        totalPrice: 0,
        buyer: String(userId),
        seller: 'Platform',
        items: {
          create: items.map((item) => {
            const subtotal = item.quantity * item.pricePerCredit;
            totalPrice += subtotal;
            return {
              carbonCreditId: item.carbonCreditId,
              quantity: item.quantity,
              pricePerCredit: item.pricePerCredit,
              subtotal,
            };
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

    return NextResponse.json(orderWithUser);
  } catch (error) {
    return handleRouteError(error, 'Failed to create order');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const validated = validateBody(orderUpdateSchema, body);
    if (isValidationError(validated)) return validated;

    const { id, status, ...data } = validated;

    const currentOrder = await prisma.order.findUnique({
      where: { id: Number(id) },
      select: { status: true, userId: true },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { ...data };
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

    if (status && status !== currentOrder.status) {
      await prisma.orderHistory.create({
        data: {
          orderId: Number(id),
          event: 'status_updated',
          message: `Order status changed from ${currentOrder.status} to ${status}`,
        },
      });

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
  } catch (error) {
    return handleRouteError(error, 'Failed to update order');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Failed to delete order');
  }
}
