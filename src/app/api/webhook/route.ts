import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { certificateService } from "@/lib/certificate-service";
import { notificationService } from "@/lib/notification-service";
import { blockchainService } from "@/lib/blockchain-service";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const buyerAddress = process.env.BUYER_ADDRESS || "";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get("stripe-signature");

  if (!sig) {
    console.error("No signature found in webhook");
    return new NextResponse("No signature found", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed.", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const prisma = new PrismaClient();

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Find the payment by stripeSessionId
      const payment = await prisma.payment.findFirst({
        where: { stripeSessionId: session.id },
      });
      if (payment) {
        // Mark payment as succeeded
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "succeeded",
            amount: session.amount_total
              ? session.amount_total / 100
              : payment.amount,
            currency: session.currency
              ? session.currency.toUpperCase()
              : payment.currency,
            stripePaymentIntentId: session.payment_intent
              ? String(session.payment_intent)
              : undefined,
          },
        });

        // Mark order as completed and set paidAt
        const order = await prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: "Completed",
            paidAt: new Date(),
          },
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
          },
        });

        // Add OrderHistory event
        await prisma.orderHistory.create({
          data: {
            orderId: payment.orderId,
            event: "paid",
            message: `Order paid via Stripe session ${session.id}`,
          },
        });

        // Transfer tokens on blockchain
        console.log("Initiating token transfer to buyer:", buyerAddress);
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
                  orderId: payment.orderId,
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
              orderId: payment.orderId,
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
                  orderId: payment.orderId,
                  event: "seller_payment_failed",
                  message: `Failed to process seller payment: ${errorData.error}`,
                },
              });
            }
          } catch (sellerPaymentError: any) {
            console.error(
              "Error processing seller payment:",
              sellerPaymentError,
            );

            await prisma.orderHistory.create({
              data: {
                orderId: payment.orderId,
                event: "seller_payment_error",
                message: `Error processing seller payment: ${sellerPaymentError.message}`,
              },
            });
          }
        }

        // Create order update notification
        try {
          await notificationService.createOrderNotification(
            order.userId,
            order.id,
            "Payment Completed",
            tokenTransferSuccess
              ? `Your order #${order.id} has been paid successfully. Tokens have been transferred to your wallet.`
              : `Your order #${order.id} has been paid successfully. Note: Some token transfers encountered issues.`,
          );
        } catch (notifError: any) {
          console.error(
            "Error creating order notification:",
            notifError.message,
          );
        }

        // Clear the user's cart after successful payment
        if (order.userId) {
          await prisma.cartItem.deleteMany({ where: { userId: order.userId } });
        }

        // Generate certificate for the completed order
        try {
          await certificateService.generateCertificate(order.id);

          // Create notification for successful payment and certificate generation
          try {
            await notificationService.createPaymentNotification(
              order.userId,
              order.id,
              "Successful",
              `Payment received for order #${order.id}. Your certificate is ready!`,
            );
          } catch (notifError: any) {
            console.error(
              "Error creating payment notification:",
              notifError.message,
            );
          }
        } catch (certError: any) {
          console.error(
            "Error generating certificate for order:",
            order.id,
            certError.message,
          );
        }
      } else {
        console.error("No payment found for session:", session.id);
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      // Find the payment by stripePaymentIntentId
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: paymentIntent.id },
      });
      if (payment) {
        // Mark payment as failed
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "failed",
            failureReason:
              paymentIntent.last_payment_error?.message || "Unknown error",
          },
        });
        // Mark order as failed
        const order = await prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: "Failed",
          },
        });
        // Add OrderHistory event
        await prisma.orderHistory.create({
          data: {
            orderId: payment.orderId,
            event: "failed",
            message: `Payment failed: ${paymentIntent.last_payment_error?.message || "Unknown error"}`,
          },
        });

        // Create payment failure notification
        try {
          await notificationService.createPaymentNotification(
            order.userId,
            order.id,
            "Failed",
            `Payment failed for order #${order.id}. Please try again.`,
          );
        } catch (notifError: any) {
          console.error(
            "Error creating payment failure notification:",
            notifError.message,
          );
        }
      }
      break;
    }
    // Add more event types as needed
    default:
      // Unhandled event type - log for debugging if needed
      break;
  }
  return new NextResponse(null, { status: 200 });
}
