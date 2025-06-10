import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { multiplier } = await request.json();

    if (!multiplier || multiplier <= 0) {
      return NextResponse.json({ error: "Invalid multiplier" }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      console.log("❌ User not found for clerkId:", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("🔍 Looking for active game session for user:", user.id);

    // Find the most recent game session for this user
    const gameSession = await prisma.gameSession.findFirst({
      where: { 
        userId: user.id,
        cashoutAt: null, // Not cashed out yet
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!gameSession) {
      console.log("❌ No active game session found for user:", user.id);
      
      // Check if there are any game sessions at all
      const allSessions = await prisma.gameSession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      
      if (allSessions.length > 0) {
        console.log("ℹ️ Found existing game session but it may be already cashed out:", allSessions[0]);
      } else {
        console.log("ℹ️ No game sessions found at all for user:", user.id);
      }
      
      return NextResponse.json({ error: "No active game session found" }, { status: 404 });
    }

    console.log("✅ Found active game session:", gameSession.id);

    const winAmount = gameSession.betAmount * multiplier;

    // Update game session and user balance
    try {
      await prisma.$transaction(async (tx) => {
        await tx.gameSession.update({
          where: { id: gameSession.id },
          data: {
            cashoutAt: multiplier,
            winAmount,
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: winAmount } },
        });

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