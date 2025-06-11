import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { multiplier, sessionId } = await request.json();

    if (!multiplier || multiplier <= 0) {
      return NextResponse.json({ error: "Invalid multiplier" }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      console.log("❌ User not found for clerkId:", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("🔍 Looking for game session with sessionId:", sessionId);

    // Find the game session for this user and session ID
    const gameSession = await prisma.gameSession.findFirst({
      where: { 
        userId: user.id,
        sessionId: sessionId,
        gameType: 'aviator'
      },
    });

    if (!gameSession) {
      console.log("❌ No game session found for sessionId:", sessionId);
      return NextResponse.json({ error: "No game session found" }, { status: 404 });
    }

    console.log("✅ Found game session:", {
      id: gameSession.id,
      betAmount: gameSession.betAmount,
      cashoutAt: gameSession.cashoutAt,
      crashed: gameSession.crashed,
      createdAt: gameSession.createdAt
    });

    // If session is already completed (crashed or cashed out), return error
    if (gameSession.cashoutAt !== null || gameSession.crashed) {
      console.log("❌ Game session already completed:", {
        cashoutAt: gameSession.cashoutAt,
        crashed: gameSession.crashed
      });
      return NextResponse.json({ error: "Game session already completed" }, { status: 400 });
    }

    const winAmount = gameSession.betAmount * multiplier;

    try {
      await prisma.$transaction(async (tx) => {
        // Update game session
        await tx.gameSession.update({
          where: { id: gameSession.id },
          data: {
            cashoutAt: multiplier,
            winAmount: winAmount,
            crashed: false
          },
        });

        // Update user balance
        await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: winAmount } },
        });

        // Create win transaction
        await tx.transaction.create({
          data: {
            userId: user.id,
            amount: winAmount,
            type: 'WIN',
            status: 'COMPLETED',
          },
        });
      });

      console.log("✅ Successfully processed cash out:", {
        gameSessionId: gameSession.id,
        winAmount,
        multiplier
      });

      return NextResponse.json({ 
        success: true,
        winAmount,
        multiplier
      });
    } catch (txError) {
      console.error("❌ Transaction error during cash out:", txError);
      return NextResponse.json({ error: "Failed to process cash out" }, { status: 500 });
    }
  } catch (error) {
    console.error("❌ Cash out error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}