import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { blockchainService } from "@/lib/blockchain-service";
import { notificationService } from "@/lib/notification-service";
import { certificateService } from "@/lib/certificate-service";

const prisma = new PrismaClient();
const buyerAddress = process.env.BUYER_ADDRESS || "";

/**
 * Mock payment processing endpoint
 * Simulates payment processing without Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId, cardNumber, cardName, expiryDate, cvv } =
      await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    // Validate card details (basic validation)
    if (!cardNumber || !cardName || !expiryDate || !cvv) {
      return NextResponse.json(
        { error: "All payment details are required" },
        { status: 400 },
      );
    }

    // Simulate card validation
    const cleanCardNumber = cardNumber.replace(/\s/g, "");

    // Test card numbers
    if (cleanCardNumber === "4000000000000002") {
      return NextResponse.json(
        { error: "Card declined - Insufficient funds" },
        { status: 400 },
      );
    }

    if (cleanCardNumber.length !== 16) {
      return NextResponse.json(
        { error: "Invalid card number" },
        { status: 400 },
      );
    }

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: {
        items: {
          include: {
            carbonCredit: {
              include: {
                forest: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "Pending") {
      return NextResponse.json(
        { error: `Order is not pending (current status: ${order.status})` },
        { status: 400 },
      );
    }

    // Generate mock payment session ID
    const mockSessionId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockPaymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update or create payment record
    let payment = order.payments[0];
    if (payment) {
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "succeeded",
          stripeSessionId: mockSessionId,
          stripePaymentIntentId: mockPaymentIntentId,
        },
      });
    } else {
      payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          stripeSessionId: mockSessionId,
          stripePaymentIntentId: mockPaymentIntentId,
          amount: order.totalPrice,
          currency: "USD",
          status: "succeeded",
          method: "card",
        },
      });
    }

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "Completed",
        paidAt: new Date(),
      },
    });

    // Add order history
    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        event: "paid",
        message: `Order paid via mock payment. Card ending in ${cleanCardNumber.slice(-4)}`,
      },
    });

    // Clear user's cart
    if (order.userId) {
      await prisma.cartItem.deleteMany({
        where: { userId: order.userId },
      });
    }

    // Transfer tokens on blockchain
    console.log(
      "Payment successful, initiating token transfer to buyer:",
      buyerAddress,
    );
    let tokenTransferSuccess = true;
    let tokenTransferErrors: string[] = [];

    for (const item of order.items) {
      if (!item.carbonCredit?.forest) {
        console.error(`No forest found for order item ${item.id}`);
        continue;
      }

      try {
        // Get token ID for this forest
        const tokenId = await blockchainService.getTokenIdForForest(
          item.carbonCredit.forestId,
        );

        if (!tokenId || tokenId === 0) {
          console.error(
            `No token found on blockchain for forest ${item.carbonCredit.forestId}`,
          );
          tokenTransferErrors.push(
            `Forest "${item.carbonCredit.forest.name}" has no blockchain token`,
          );
          tokenTransferSuccess = false;
          continue;
        }

        // Transfer tokens from owner to buyer
        console.log(
          `Transferring ${item.quantity} tokens (ID: ${tokenId}) to buyer`,
        );
        const transferResult = await blockchainService.transferTokens(
          buyerAddress,
          tokenId,
          item.quantity,
        );

        if (!transferResult.success) {
          console.error(
            `Token transfer failed for order item ${item.id}:`,
            transferResult.error,
          );
          tokenTransferErrors.push(
            `Failed to transfer ${item.carbonCredit.forest.name} tokens: ${transferResult.error}`,
          );
          tokenTransferSuccess = false;
        } else {
          console.log(
            `Token transfer successful. TX Hash: ${transferResult.transactionHash}`,
          );

          // Add order history for successful token transfer
          await prisma.orderHistory.create({
            data: {
              orderId: order.id,
              event: "tokens_transferred",
              message: `Transferred ${item.quantity} tokens (Token ID: ${tokenId}) to buyer. TX: ${transferResult.transactionHash}`,
            },
          });
        }
      } catch (error: any) {
        console.error(
          `Error transferring tokens for order item ${item.id}:`,
          error,
        );
        tokenTransferErrors.push(
          `Error transferring ${item.carbonCredit.forest.name} tokens: ${error.message}`,
        );
        tokenTransferSuccess = false;
      }
    }

    // Update order with token transfer status
    if (!tokenTransferSuccess) {
      await prisma.orderHistory.create({
        data: {
          orderId: order.id,
          event: "token_transfer_failed",
          message: `Some token transfers failed: ${tokenTransferErrors.join(", ")}`,
        },
      });
    }

    // If token transfer was successful, release payment to seller
    if (tokenTransferSuccess) {
      try {
        console.log(
          "Token transfer successful, releasing payment to seller...",
        );

        // Call the seller payment API
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const sellerPaymentResponse = await fetch(
          `${baseUrl}/api/payments/seller`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ orderId: order.id }),
          },
        );

        if (sellerPaymentResponse.ok) {
          const sellerPaymentData = await sellerPaymentResponse.json();
          console.log(
            "Seller payment processed successfully:",
            sellerPaymentData,
          );
        } else {
          const errorData = await sellerPaymentResponse.json();
          console.error("Failed to process seller payment:", errorData);

          await prisma.orderHistory.create({
            data: {
              orderId: order.id,
              event: "seller_payment_failed",
              message: `Failed to process seller payment: ${errorData.error}`,
            },
          });
        }
      } catch (sellerPaymentError: any) {
        console.error("Error processing seller payment:", sellerPaymentError);

        await prisma.orderHistory.create({
          data: {
            orderId: order.id,
            event: "seller_payment_error",
            message: `Error processing seller payment: ${sellerPaymentError.message}`,
          },
        });
      }
    }

    // Create notifications
    try {
      await notificationService.createOrderNotification(
        order.userId,
        order.id,
        "Payment Completed",
        tokenTransferSuccess
          ? `Your order #${order.id} has been paid successfully. Tokens have been transferred to your wallet.`
          : `Your order #${order.id} has been paid successfully. Note: Some token transfers encountered issues.`,
      );

      await notificationService.createPaymentNotification(
        order.userId,
        order.id,
        "Successful",
        `Payment received for order #${order.id}.`,
      );
    } catch (notifError: any) {
      console.error("Error creating notifications:", notifError.message);
    }

    // Generate certificate
    try {
      await certificateService.generateCertificate(order.id);
    } catch (certError: any) {
      console.error(
        "Error generating certificate for order:",
        order.id,
        certError.message,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment processed successfully",
      orderId: order.id,
      paymentId: payment.id,
      sessionId: mockSessionId,
      tokenTransferSuccess,
      tokenTransferErrors: tokenTransferSuccess ? [] : tokenTransferErrors,
    });
  } catch (error: any) {
    console.error("Error processing mock payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payment" },
      { status: 500 },
    );
  }
}
