import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { multiplier, isCrashed } = await request.json();

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      console.log("❌ User not found for clerkId:", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("🔍 Looking for latest game session for user:", user.id);

    // Find the latest game session for this user
    const gameSession = await prisma.gameSession.findFirst({
      where: { 
        userId: user.id,
        gameType: 'aviator'
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!gameSession) {
      console.log("❌ No game session found for user:", user.id);
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

    // Handle crash
    if (isCrashed) {
      try {
        await prisma.$transaction(async (tx) => {
          // Mark session as crashed
          await tx.gameSession.update({
            where: { id: gameSession.id },
            data: {
              crashed: true,
              winAmount: 0
            },
          });

          // Create loss transaction
          await tx.transaction.create({
            data: {
              userId: user.id,
              amount: -gameSession.betAmount,
              type: 'LOSS',
              status: 'COMPLETED',
            },
          });
        });

        console.log("✅ Marked game session as crashed:", gameSession.id);
        return NextResponse.json({ 
          success: true,
          crashed: true,
          winAmount: 0
        });
      } catch (txError) {
        console.error("❌ Transaction error during crash:", txError);
        return NextResponse.json({ error: "Failed to process crash" }, { status: 500 });
      }
    }

    // Handle cash out
    if (!multiplier || multiplier <= 0) {
      return NextResponse.json({ error: "Invalid multiplier" }, { status: 400 });
    }

    const winAmount = gameSession.betAmount * multiplier;

    try {
      await prisma.$transaction(async (tx) => {
        // Update game session
        await tx.gameSession.update({
          where: { id: gameSession.id },
          data: {
            cashoutAt: multiplier,
            winAmount,
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

      console.log("✅ Successfully processed cash-out for session:", gameSession.id);
      return NextResponse.json({ 
        success: true, 
        winAmount,
        multiplier 
      });
    } catch (txError) {
      console.error("❌ Transaction error during cash-out:", txError);
      return NextResponse.json({ error: "Failed to process cash-out" }, { status: 500 });
    }
  } catch (error) {
    console.error("❌ Cash out error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}