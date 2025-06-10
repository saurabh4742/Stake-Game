import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// Force dynamic route handling
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text
    const body = await request.text();
    const signature = headers().get("stripe-signature");

    if (!signature) {
      console.error("❌ No Stripe signature found in request headers");
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("❌ STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    console.log("✅ Stripe Event Type:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;

      const userId = session.metadata.userId;
      const amount = parseFloat(session.metadata.amount);

      console.log("📝 Processing payment for user:", userId, "amount:", amount);

      if (!userId || !amount) {
        console.error("❌ Missing userId or amount in session metadata");
        return NextResponse.json(
          { error: "Missing required metadata" },
          { status: 400 }
        );
      }

      try {
        await prisma.$transaction(async (tx) => {
          const result = await tx.transaction.updateMany({
            where: {
              stripeId: session.id,
              status: "PENDING",
            },
            data: {
              status: "COMPLETED",
            },
          });

          if (result.count === 0) {
            console.error("❌ No pending transaction found for session:", session.id);
            throw new Error("No pending transaction found");
          }

          await tx.user.update({
            where: { id: userId },
            data: { balance: { increment: amount } },
          });

          console.log(`✅ Updated ${result.count} transaction(s) for user ${userId}`);
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