import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get("stripe-signature");

  if (!sig) {
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
      const payment = await prisma.payment.findFirst({ where: { stripeSessionId: session.id } });
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
        await prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: "Completed",
            paidAt: new Date(),
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
        await prisma.order.update({
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
      }
      break;
    }
    // Add more event types as needed
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new NextResponse(null, { status: 200 });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
