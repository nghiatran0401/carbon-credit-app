import { NextRequest, NextResponse } from 'next/server';
import { orderAuditService } from '@/lib/order-audit-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  
  try {
    if (orderId) {
      // Get audit for specific order
      const auditRecord = await orderAuditService.getOrderAudit(parseInt(orderId));
      
      if (!auditRecord) {
        return NextResponse.json({
          success: false,
          message: 'No audit record found for this order'
        }, { status: 404 });
      }
      
      // Also get current order data for verification
      const currentOrder = await prisma.order.findUnique({
        where: { id: parseInt(orderId) },
        select: {
          id: true,
          totalCredits: true,
          totalPrice: true,
          paidAt: true,
          buyer: true,
          seller: true,
          status: true
        }
      });
      
      let verification = null;
      if (currentOrder && currentOrder.paidAt) {
        verification = await orderAuditService.verifyOrderIntegrity(
          currentOrder.id,
          {
            orderId: currentOrder.id,
            totalCredits: currentOrder.totalCredits,
            totalPrice: currentOrder.totalPrice,
            paidAt: currentOrder.paidAt,
            buyer: (currentOrder as any).buyer,
            seller: (currentOrder as any).seller,
          }
        );
      }
      
      return NextResponse.json({
        success: true,
        audit: auditRecord,
        currentOrder,
        verification
      });
      
    } else {
      // Get all audit records
      const allAudits = await orderAuditService.getAllOrderAudits();
      
      return NextResponse.json({
        success: true,
        audits: allAudits,
        count: allAudits.length
      });
    }
    
  } catch (error) {
    console.error('Failed to get order audits:', error);
    return NextResponse.json({
      success: false,
      message: `Failed to get order audits: ${error}`
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: 'Order ID is required'
      }, { status: 400 });
    }
    
    // Get order data from SQL database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        totalCredits: true,
        totalPrice: true,
        paidAt: true,
        status: true,
        buyer: true,
        seller: true
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
    
    // Store audit record (include buyer/seller)
    const hash = await orderAuditService.storeOrderAudit({
      orderId: order.id,
      totalCredits: order.totalCredits,
      totalPrice: order.totalPrice,
      paidAt: order.paidAt,
      buyer: (order as any).buyer,
      seller: (order as any).seller
    });
    
    return NextResponse.json({
      success: true,
      message: 'Order audit stored successfully',
      orderId: order.id,
      hash
    });
    
  } catch (error) {
    console.error('Failed to store order audit:', error);
    return NextResponse.json({
      success: false,
      message: `Failed to store order audit: ${error}`
    }, { status: 500 });
  }
}