import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';
import { cartItemSchema, validateBody, isValidationError } from '@/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const cart = await prisma.cartItem.findMany({
      where: { userId: auth.id },
      include: { carbonCredit: { include: { forest: true } } },
    });
    return NextResponse.json(cart);
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch cart');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const validated = validateBody(cartItemSchema, body);
    if (isValidationError(validated)) return validated;

    const { carbonCreditId, quantity } = validated;
    const existing = await prisma.cartItem.findFirst({
      where: { userId: auth.id, carbonCreditId },
    });
    let item;
    if (existing) {
      item = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    } else {
      item = await prisma.cartItem.create({
        data: { userId: auth.id, carbonCreditId, quantity },
      });
    }
    return NextResponse.json(item);
  } catch (error) {
    return handleRouteError(error, 'Failed to add to cart');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const validated = validateBody(cartItemSchema, body);
    if (isValidationError(validated)) return validated;

    const { carbonCreditId, quantity } = validated;
    const item = await prisma.cartItem.updateMany({
      where: { userId: auth.id, carbonCreditId },
      data: { quantity },
    });
    return NextResponse.json(item);
  } catch (error) {
    return handleRouteError(error, 'Failed to update cart');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const { carbonCreditId } = body;
    if (!carbonCreditId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    await prisma.cartItem.deleteMany({ where: { userId: auth.id, carbonCreditId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Failed to remove from cart');
  }
}
