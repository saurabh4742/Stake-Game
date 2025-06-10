import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the most recent active mines game
    const minesGame = await prisma.minesGame.findFirst({
      where: { 
        userId: user.id,
        gameEnded: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!minesGame) {
      return NextResponse.json({ error: "No active mines game found" }, { status: 404 });
    }

    if (minesGame.tilesRevealed === 0) {
      return NextResponse.json({ error: "No tiles revealed yet" }, { status: 400 });
    }

    const winAmount = minesGame.betAmount * minesGame.multiplier;

    // Update game and user balance
    await prisma.$transaction(async (tx) => {
      await tx.minesGame.update({
        where: { id: minesGame.id },
        data: {
          gameEnded: true,
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
      multiplier: minesGame.multiplier
    });
  } catch (error) {
    console.error("Mines cash out error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}