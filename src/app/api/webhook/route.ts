import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { certificateService } from "@/lib/certificate-service";
import { notificationService } from "@/lib/notification-service";
import { orderAuditService } from "@/lib/order-audit-service";
import { orderAuditMiddleware } from "@/lib/order-audit-middleware";
import { carbonMovementService } from "@/lib/carbon-movement-service";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

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

  console.log(`🔔 Webhook received: ${event.type} at ${new Date().toISOString()}`);

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`💳 Checkout session completed: ${session.id}`);

      // Find the payment by stripeSessionId
      const payment = await prisma.payment.findFirst({ where: { stripeSessionId: session.id } });
      console.log(`🔍 Payment found:`, payment ? `Order ${payment.orderId}` : 'None');
      
      if (payment) {
        // Mark payment as succeeded
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "succeeded",
            amount: session.amount_total ? session.amount_total / 100 : payment.amount,
            currency: session.currency ? session.currency.toUpperCase() : payment.currency,
            stripePaymentIntentId: session.payment_intent ? String(session.payment_intent) : undefined,
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
                carbonCredit: true,
              },
            },
          },
        });

        // Calculate total credits from order items
        const totalCredits = order.items.reduce((sum, item) => sum + item.quantity, 0);

        console.log(`Processing webhook for order ${order.id}: ${totalCredits} credits, $${order.totalPrice}, paid at ${order.paidAt}`);

        // Add OrderHistory event
        await prisma.orderHistory.create({
          data: {
            orderId: payment.orderId,
            event: "paid",
            message: `Order paid via Stripe session ${session.id}`,
          },
        });

        // Store immutable audit trail in ImmuDB using middleware
        try {
          console.log(`Ensuring audit trail for order ${order.id} (${totalCredits} credits, $${order.totalPrice})`);
          const auditResult = await orderAuditMiddleware.ensureOrderAudit(order.id);
          
          if (auditResult.created) {
            console.log(`✅ New audit trail created for order ${order.id}`);
          } else if (auditResult.exists) {
            console.log(`ℹ️ Audit trail already exists for order ${order.id}`);
          } else if (auditResult.error) {
            console.error(`❌ Failed to create audit trail for order ${order.id}: ${auditResult.error}`);
          }
        } catch (auditError: any) {
          console.error(`❌ Error in audit middleware for order ${order.id}:`, auditError.message);
          // Don't fail the webhook if audit storage fails, but log it
        }

        // Track carbon credit movement in Neo4j
        try {
          console.log(`Tracking carbon credit movement for order ${order.id}`);
          await carbonMovementService.trackOrderMovement(order.id);
          console.log(`✅ Carbon credit movement tracked for order ${order.id}`);
        } catch (movementError: any) {
          console.error(`❌ Error tracking movement for order ${order.id}:`, movementError.message);
          // Don't fail the webhook if movement tracking fails
        }

        // Create order update notification
        try {
          await notificationService.createOrderNotification(order.userId, order.id, "Payment Completed", `Your order #${order.id} has been paid successfully.`);
        } catch (notifError: any) {
          console.error("Error creating order notification:", notifError.message);
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
            await notificationService.createPaymentNotification(order.userId, order.id, "Successful", `Payment received for order #${order.id}. Your certificate is ready!`);
          } catch (notifError: any) {
            console.error("Error creating payment notification:", notifError.message);
          }
        } catch (certError: any) {
          console.error("Error generating certificate for order:", order.id, certError.message);
        }
      } else {
        console.error("No payment found for session:", session.id);
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      // Find the payment by stripePaymentIntentId
      const payment = await prisma.payment.findFirst({ where: { stripePaymentIntentId: paymentIntent.id } });
      if (payment) {
        // Mark payment as failed
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "failed",
            failureReason: paymentIntent.last_payment_error?.message || "Unknown error",
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
          await notificationService.createPaymentNotification(order.userId, order.id, "Failed", `Payment failed for order #${order.id}. Please try again.`);
        } catch (notifError: any) {
          console.error("Error creating payment failure notification:", notifError.message);
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
