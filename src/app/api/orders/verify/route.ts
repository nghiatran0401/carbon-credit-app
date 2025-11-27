import { NextRequest, NextResponse } from 'next/server';
import { orderAuditService } from '@/lib/order-audit-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: 'Order ID is required'
      }, { status: 400 });
    }
    
    // Get current order data from SQL database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        totalCredits: true,
        totalPrice: true,
        buyer: true,
        seller: true,
        paidAt: true,
        status: true
      }
    });
    
    if (!order) {
      return NextResponse.json({
        success: false,
        message: 'Order not found'
      }, { status: 404 });
    }
    
    if (!order.paidAt) {
      return NextResponse.json({
        success: false,
        message: 'Order is not completed/paid yet'
      }, { status: 400 });
    }
    
    // Verify integrity
    const verification = await orderAuditService.verifyOrderIntegrity(
      order.id,
      {
        orderId: order.id,
        totalCredits: order.totalCredits,
        totalPrice: order.totalPrice,
        paidAt: order.paidAt,
        buyer: (order as any).buyer,
        seller: (order as any).seller
      }
    );
    
    return NextResponse.json({
      success: true,
      orderId: order.id,
      verification: {
        isValid: verification.isValid,
        storedHash: verification.storedHash,
        computedHash: verification.computedHash,
        key: verification.key
      },
      orderData: {
        orderId: order.id,
        totalCredits: order.totalCredits,
        totalPrice: order.totalPrice,
        paidAt: order.paidAt.toISOString(),
        status: order.status
      },
      hashComputation: {
        formula: "SHA256(orderId|buyer|seller|totalCredits|totalPrice|paidAtTimestamp)",
        dataString: `${order.id}|${(order as any).buyer ?? ''}|${(order as any).seller ?? ''}|${order.totalCredits}|${order.totalPrice}|${order.paidAt.getTime()}`,
        paidAtTimestamp: order.paidAt.getTime()
      }
    });
    
  } catch (error) {
    console.error('Failed to verify order:', error);
    return NextResponse.json({
      success: false,
      message: `Failed to verify order: ${error}`
    }, { status: 500 });
  }
}