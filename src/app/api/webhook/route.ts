import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { certificateService } from "@/lib/certificate-service";
import { notificationService } from "@/lib/notification-service";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  console.log("Webhook received:", new Date().toISOString());

  const body = await req.text();
  const sig = headers().get("stripe-signature");

  if (!sig) {
    console.error("No signature found in webhook");
    return new NextResponse("No signature found", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log("Webhook event type:", event.type);
  } catch (err: any) {
    console.error("Webhook signature verification failed.", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const prisma = new PrismaClient();

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      console.log("Processing checkout.session.completed event");
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("Session ID:", session.id);

      // Find the payment by stripeSessionId
      const payment = await prisma.payment.findFirst({ where: { stripeSessionId: session.id } });
      if (payment) {
        console.log("Found payment for session:", payment.id);

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
        });

        console.log("Updated order:", order.id, "to status:", order.status);

        // Add OrderHistory event
        await prisma.orderHistory.create({
          data: {
            orderId: payment.orderId,
            event: "paid",
            message: `Order paid via Stripe session ${session.id}`,
          },
        });

        // Create order update notification
        try {
          await notificationService.createOrderNotification(order.userId, order.id, "Payment Completed", `Your order #${order.id} has been paid successfully.`);
        } catch (notifError: any) {
          console.error("Error creating order notification:", notifError.message);
        }

        // Clear the user's cart after successful payment
        if (order.userId) {
          const deletedCartItems = await prisma.cartItem.deleteMany({ where: { userId: order.userId } });
          console.log("Cleared cart items for user:", order.userId, "deleted:", deletedCartItems.count);
        }

        // Generate certificate for the completed order
        try {
          const certificate = await certificateService.generateCertificate(order.id);
          console.log("Generated certificate:", certificate.id, "for order:", order.id);

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
      console.log("Processing payment_intent.payment_failed event");
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
      console.log(`Unhandled event type: ${event.type}`);
  }

  console.log("Webhook processed successfully");
  return new NextResponse(null, { status: 200 });
}
