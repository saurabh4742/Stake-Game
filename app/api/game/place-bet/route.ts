import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
    }

    console.log("🔍 Looking for user with clerkId:", userId);

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      console.log("❌ User not found for clerkId:", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("✅ Found user:", user.id, "Current balance:", user.balance);

    if (user.balance < amount) {
      console.log("❌ Insufficient balance. Required:", amount, "Available:", user.balance);
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Check for any existing active game session
    const existingSession = await prisma.gameSession.findFirst({
      where: {
        userId: user.id,
        cashoutAt: null,
        crashed: false,
        gameType: 'aviator'
      },
    });

    if (existingSession) {
      console.log("❌ Found existing active game session:", existingSession.id);
      return NextResponse.json({ error: "You already have an active game session" }, { status: 400 });
    }

    console.log("💫 Creating new game session for user:", user.id);

    // Deduct bet amount from balance and create game session
    try {
      await prisma.$transaction(async (tx) => {
        // Update user balance
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { balance: { decrement: amount } },
        });
        console.log("✅ Updated user balance:", updatedUser.balance);

        // Create bet transaction
        const transaction = await tx.transaction.create({
          data: {
            userId: user.id,
            amount: -amount,
            type: 'BET',
            status: 'COMPLETED',
          },
        });
        console.log("✅ Created bet transaction:", transaction.id);

        // Create game session
        const gameSession = await tx.gameSession.create({
          data: {
            userId: user.id,
            betAmount: amount,
            gameType: 'aviator',
            crashed: false,
            cashoutAt: null,
            winAmount: null
          },
        });
        console.log("✅ Created game session:", gameSession.id);
      });

      return NextResponse.json({ success: true });
    } catch (txError) {
      console.error("❌ Transaction error during bet placement:", txError);
      return NextResponse.json({ error: "Failed to place bet" }, { status: 500 });
    }
  } catch (error) {
    console.error("❌ Place bet error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}