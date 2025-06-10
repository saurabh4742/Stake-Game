import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tileIndex } = await request.json();

    if (tileIndex === undefined || tileIndex < 0 || tileIndex >= 25) {
      return NextResponse.json({ error: "Invalid tile index" }, { status: 400 });
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

    // Check if tile already revealed
    if (minesGame.revealedTiles.includes(tileIndex)) {
      return NextResponse.json({ error: "Tile already revealed" }, { status: 400 });
    }

    const isMine = minesGame.minePositions.includes(tileIndex);
    const newRevealedTiles = [...minesGame.revealedTiles, tileIndex];
    const newTilesRevealed = newRevealedTiles.length;

    if (isMine) {
      // Hit a mine - game over
      await prisma.minesGame.update({
        where: { id: minesGame.id },
        data: {
          gameEnded: true,
          hitMine: true,
          revealedTiles: newRevealedTiles,
          tilesRevealed: newTilesRevealed,
        },
      });

      return NextResponse.json({ 
        isMine: true,
        gameEnded: true,
        minePositions: minesGame.minePositions
      });
    } else {
      // Safe tile - calculate new multiplier
      const safeSpots = 25 - 5; // 20 safe spots
      const risk = newTilesRevealed / safeSpots;
      const newMultiplier = 1 + (risk * risk * 10);

      await prisma.minesGame.update({
        where: { id: minesGame.id },
        data: {
          revealedTiles: newRevealedTiles,
          tilesRevealed: newTilesRevealed,
          multiplier: newMultiplier,
        },
      });

      return NextResponse.json({ 
        isMine: false,
        multiplier: newMultiplier,
        tilesRevealed: newTilesRevealed,
        potentialWin: minesGame.betAmount * newMultiplier
      });
    }
  } catch (error) {
    console.error("Reveal tile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}