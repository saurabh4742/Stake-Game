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

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.balance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Generate mine positions (5 mines in 25 tiles)
    const minePositions: number[] = [];
    while (minePositions.length < 5) {
      const pos = Math.floor(Math.random() * 25);
      if (!minePositions.includes(pos)) {
        minePositions.push(pos);
      }
    }

    // Deduct bet amount and create mines game
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amount } },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: -amount,
          type: 'BET',
          status: 'COMPLETED',
        },
      });

      await tx.minesGame.create({
        data: {
          userId: user.id,
          betAmount: amount,
          minePositions,
        },
      });
    });

    return NextResponse.json({ 
      success: true,
      minePositions // In a real game, this would be hidden
    });
  } catch (error) {
    console.error("Start mines game error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}