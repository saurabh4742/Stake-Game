import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      throw new Error("NEXT_PUBLIC_APP_URL is not configured");
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || amount < 1 || amount > 100000) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: '',
          balance: 0,
        },
      });
    }

    try {
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: 'Crash Game Deposit',
                description: `Deposit ₹${amount} to your game account`,
              },
              unit_amount: Math.round(amount * 100), // Convert to paise
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/deposit`,
        metadata: {
          userId: user.id,
          amount: amount.toString(),
        },
      });

      // Create pending transaction
      await prisma.transaction.create({
        data: {
          userId: user.id,
          amount,
          type: 'DEPOSIT',
          status: 'PENDING',
          stripeId: session.id,
        },
      });

      return NextResponse.json({ url: session.url });
    } catch (stripeError) {
      console.error("Stripe error:", stripeError);
      return NextResponse.json(
        { error: "Failed to create payment session" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Deposit error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}