import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { certificateService } from "@/lib/certificate-service";
import { notificationService } from "@/lib/notification-service";
import { blockchainService } from "@/lib/blockchain-service";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, cartItems } = body;
    
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Calculate totals
    let total = 0;
    let totalCredits = 0;
    for (const item of cartItems) {
      const price = item.carbonCredit?.pricePerCredit || item.price || 0;
      total += price * item.quantity;
      totalCredits += item.quantity;
    }

    // Create Order (directly as completed since this is mock payment)
    const order = await prisma.order.create({
      data: {
        userId,
        status: "Completed", // Mark as completed immediately
        totalPrice: total,
        totalCredits,
        currency: "USD",
        paidAt: new Date(), // Set paid date immediately
        items: {
          create: cartItems.map((item: any) => {
            const price = item.carbonCredit?.pricePerCredit || item.price || 0;
            return {
              carbonCreditId: item.carbonCreditId || 1,
              quantity: item.quantity,
              pricePerCredit: price,
              subtotal: price * item.quantity,
            };
          }),
        },
      },
    });

    // Create Payment record (marked as succeeded)
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: total,
        currency: "USD",
        status: "succeeded", // Mock payment always succeeds
        method: "mock", // Indicate this was a mock payment
        stripeSessionId: `mock_${order.id}_${Date.now()}`, // Generate a mock session ID
      },
    });

    // Create OrderHistory events
    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        event: "created",
        message: `Order created with mock payment`,
      },
    });

    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        event: "paid",
        message: `Order paid via mock payment system`,
      },
    });

    // Clear the user's cart after successful payment
    await prisma.cartItem.deleteMany({ where: { userId } });

    // Create notifications
    try {
      await notificationService.createOrderNotification(
        order.userId, 
        order.id, 
        "Payment Completed", 
        `Your order #${order.id} has been paid successfully via mock payment.`
      );

      await notificationService.createPaymentNotification(
        order.userId, 
        order.id, 
        "Successful", 
        `Mock payment received for order #${order.id}. Processing your carbon credits...`
      );
    } catch (notifError: any) {
      console.error("Error creating notifications:", notifError.message);
    }

    // Generate certificate
    try {
      await certificateService.generateCertificate(order.id);
    } catch (certError: any) {
      console.error("Error generating certificate for order:", order.id, certError.message);
    }

    // Invoke smart contract to transfer tokens
    let blockchainTxHash: string | null = null;
    try {
      console.log(`Initiating blockchain transaction for ${totalCredits} credits`);
      blockchainTxHash = await blockchainService.transferTokensToBuyer(totalCredits);
      console.log(`Blockchain transaction successful: ${blockchainTxHash}`);
      
      // Update order with blockchain transaction details
      await prisma.order.update({
        where: { id: order.id },
        data: {
          tokenTxHash: blockchainTxHash,
          tokenTransferred: true,
        },
      });
      
      // Add blockchain transaction to order history
      await prisma.orderHistory.create({
        data: {
          orderId: order.id,
          event: "blockchain_transfer",
          message: `Carbon tokens transferred to blockchain. Transaction hash: ${blockchainTxHash}`,
        },
      });

      // Create blockchain notification
      await notificationService.createOrderNotification(
        order.userId, 
        order.id, 
        "Blockchain Transfer Complete", 
        `Your ${totalCredits} carbon credits have been transferred to the blockchain. TX: ${blockchainTxHash}`
      );

    } catch (blockchainError: any) {
      console.error("Blockchain transfer failed:", blockchainError.message);
      
      // Record the blockchain failure but don't fail the entire order
      await prisma.orderHistory.create({
        data: {
          orderId: order.id,
          event: "blockchain_failed",
          message: `Blockchain transfer failed: ${blockchainError.message}`,
        },
      });

      // Notify user of blockchain issue
      await notificationService.createOrderNotification(
        order.userId, 
        order.id, 
        "Blockchain Transfer Failed", 
        `Your order was completed but blockchain transfer failed. Please contact support. Order #${order.id}`
      );
    }

    // Return success response with order details and redirect info
    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentId: payment.id,
      blockchainTxHash,
      message: "Mock payment completed successfully",
      redirectUrl: `/success?mock_order_id=${order.id}`,
    });

  } catch (error: any) {
    console.error("Mock checkout error:", error);
    return NextResponse.json(
      { error: "Mock checkout failed", details: error.message }, 
      { status: 500 }
    );
  }
}