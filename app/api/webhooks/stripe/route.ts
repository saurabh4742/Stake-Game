import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message);
      
      // In development with ngrok, you might want to skip signature verification
      // ONLY for development - remove this in production
      if (process.env.NODE_ENV === 'development') {
        console.log("⚠️ Development mode: Attempting to parse webhook without signature verification");
        try {
          event = JSON.parse(body);
        } catch (parseErr) {
          console.error("❌ Failed to parse webhook body:", parseErr);
          return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
      }
    }

    console.log("✅ Stripe Event Type:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;

      const userId = session.metadata.userId;
      const amount = parseFloat(session.metadata.amount);

      console.log("📝 Processing payment for user:", userId, "amount:", amount);

      if (userId && amount) {
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

          await tx.user.update({
            where: { id: userId },
            data: { balance: { increment: amount } },
          });

          console.log(`✅ Updated ${result.count} transaction(s) for user ${userId}`);
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}