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
      console.log("user not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the most recent game session for this user
    const gameSession = await prisma.gameSession.findFirst({
      where: { 
        userId: user.id,
        cashoutAt: null, // Not cashed out yet
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!gameSession) {
       console.log("gameSession not found"+gameSession)
      return NextResponse.json({ error: "No active game session found" }, { status: 404 });
    }

    const winAmount = gameSession.betAmount * multiplier;

    // Update game session and user balance
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

    return NextResponse.json({ 
      success: true, 
      winAmount,
      multiplier 
    });
  } catch (error) {
    console.error("Cash out error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}