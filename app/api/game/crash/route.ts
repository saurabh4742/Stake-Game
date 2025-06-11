import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Check for socket server token
    const authHeader = request.headers.get('authorization');
    const socketToken = authHeader?.split(' ')[1];
    
    if (socketToken !== process.env.SOCKET_SERVER_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { multiplier, userId } = await request.json();

    if (!multiplier || multiplier <= 0) {
      return NextResponse.json({ error: "Invalid multiplier" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the latest game session for this user
    const gameSession = await prisma.gameSession.findFirst({
      where: { 
        userId: user.id,
        gameType: 'aviator',
        cashoutAt: null,
        crashed: false
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!gameSession) {
      return NextResponse.json({ error: "No active game session found" }, { status: 404 });
    }

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
  } catch (error) {
    console.error("❌ Crash error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 