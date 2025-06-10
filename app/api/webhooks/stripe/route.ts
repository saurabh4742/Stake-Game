import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import Stripe from "stripe";

// Force dynamic route handling
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text
    const body = await request.text();
    const signature = headers().get("stripe-signature");

    console.log("📝 Webhook received:");
    console.log("Signature:", signature);
    console.log("Body length:", body.length);
    console.log("Body preview:", body.substring(0, 100) + "...");

    if (!signature) {
      console.error("❌ No Stripe signature found in request headers");
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("❌ STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    console.log("🔑 Using webhook secret:", process.env.STRIPE_WEBHOOK_SECRET.substring(0, 5) + "...");

    let event;

    try {
      // Ensure we're using the raw body exactly as received
      const rawBody = Buffer.from(body);
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message);
      console.error("Error details:", err);
      return NextResponse.json(
        { 
          error: `Webhook signature verification failed: ${err.message}`,
          details: {
            signatureLength: signature?.length,
            bodyLength: body.length,
            secretLength: process.env.STRIPE_WEBHOOK_SECRET?.length,
            bodyPreview: body.substring(0, 200)
          }
        },
        { status: 400 }
      );
    }

    console.log("✅ Stripe Event Type:", event.type);

    // Handle charge.succeeded event
    if (event.type === "charge.succeeded") {
      const charge = event.data.object as Stripe.Charge;
      console.log("💳 Processing charge:", charge.id);
      
      // Find the associated transaction
      const transaction = await prisma.transaction.findFirst({
        where: {
          stripeId: typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id,
          status: "PENDING"
        }
      });

      if (!transaction) {
        console.error("❌ No pending transaction found for charge:", charge.id);
        return NextResponse.json(
          { error: "No pending transaction found" },
          { status: 400 }
        );
      }

      try {
        await prisma.$transaction(async (tx) => {
          // Update transaction status
          await tx.transaction.update({
            where: { id: transaction.id },
            data: { status: "COMPLETED" }
          });

          // Update user balance
          await tx.user.update({
            where: { id: transaction.userId },
            data: { balance: { increment: transaction.amount } }
          });

          console.log(`✅ Updated transaction ${transaction.id} for user ${transaction.userId}`);
        });
      } catch (txError) {
        console.error("❌ Transaction error:", txError);
        return NextResponse.json(
          { error: "Failed to process transaction" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook error" },
      { status: 500 }
    );
  }
}