import { NextRequest, NextResponse } from 'next/server';
import { orderAuditService } from '@/lib/order-audit-service';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, isAuthError, handleRouteError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (orderId) {
      const auth = await requireAuth(request);
      if (isAuthError(auth)) return auth;

      const parsedId = parseInt(orderId);
      if (isNaN(parsedId)) {
        return NextResponse.json({ success: false, message: 'Invalid order ID' }, { status: 400 });
      }

      const order = await prisma.order.findUnique({
        where: { id: parsedId },
        select: {
          id: true,
          totalCredits: true,
          totalPrice: true,
          paidAt: true,
          buyer: true,
          seller: true,
          status: true,
          userId: true,
        },
      });

      if (!order) {
        return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
      }

      if (order.userId !== auth.id && auth.role?.toLowerCase() !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const auditRecord = await orderAuditService.getOrderAudit(parsedId);

      if (!auditRecord) {
        return NextResponse.json(
          {
            success: false,
            message: 'No audit record found for this order',
          },
          { status: 404 },
        );
      }

      let verification = null;
      if (order.paidAt) {
        verification = await orderAuditService.verifyOrderIntegrity(order.id, {
          orderId: order.id,
          totalCredits: order.totalCredits,
          totalPrice: order.totalPrice,
          paidAt: order.paidAt,
          buyer: order.buyer,
          seller: order.seller,
        });
      }

      return NextResponse.json({
        success: true,
        audit: auditRecord,
        currentOrder: order,
        verification,
      });
    } else {
      const auth = await requireAdmin(request);
      if (isAuthError(auth)) return auth;

      const allAudits = await orderAuditService.getAllOrderAudits();

      return NextResponse.json({
        success: true,
        audits: allAudits,
        count: allAudits.length,
      });
    }
  } catch (error) {
    return handleRouteError(error, 'Failed to get order audits');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (isAuthError(auth)) return auth;

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Order ID is required',
        },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        totalCredits: true,
        totalPrice: true,
        paidAt: true,
        status: true,
        buyer: true,
        seller: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: 'Order not found',
        },
        { status: 404 },
      );
    }

    if (!order.paidAt) {
      return NextResponse.json(
        {
          success: false,
          message: 'Order is not completed/paid yet',
        },
        { status: 400 },
      );
    }

    const hash = await orderAuditService.storeOrderAudit({
      orderId: order.id,
      totalCredits: order.totalCredits,
      totalPrice: order.totalPrice,
      paidAt: order.paidAt,
      buyer: order.buyer,
      seller: order.seller,
    });

    return NextResponse.json({
      success: true,
      message: 'Order audit stored successfully',
      orderId: order.id,
      hash,
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to store order audit');
  }
}
