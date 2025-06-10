"use client";

import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { Bomb, Gem, Wallet, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Tile {
  id: number;
  revealed: boolean;
  isMine: boolean;
  isGem: boolean;
}

interface GameStats {
  tilesRevealed: number;
  multiplier: number;
  potentialWin: number;
}

export default function MinesPage() {
  const { user, isLoaded } = useUser();
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<string>("10");
  const [gameActive, setGameActive] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats>({
    tilesRevealed: 0,
    multiplier: 1.0,
    potentialWin: 0,
  });
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [mineCount] = useState(2); // Changed to 2 mines for 3x3 grid
  const gridSize = 9; // 3x3 grid

  // Move all hooks before any conditional logic
  useEffect(() => {
    if (isLoaded && user) {
      fetchBalance();
      initializeGame();
    }
  }, [isLoaded, user]);

  // Handle redirect after hooks
  useEffect(() => {
    if (isLoaded && !user) {
      redirect("/sign-in");
    }
  }, [isLoaded, user]);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/user/balance');
      const data = await response.json();
      setBalance(data.balance || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const initializeGame = () => {
    const newTiles: Tile[] = [];
    
    // Create all tiles
    for (let i = 0; i < gridSize; i++) {
      newTiles.push({
        id: i,
        revealed: false,
        isMine: false,
        isGem: false,
      });
    }
    
    setTiles(newTiles);
    setGameStats({
      tilesRevealed: 0,
      multiplier: 1.0,
      potentialWin: 0,
    });
  };

  const placeMines = (excludeIndex: number) => {
    const newTiles = [...tiles];
    const minePositions = new Set<number>();
    
    // Place mines randomly, excluding the first clicked tile
    while (minePositions.size < mineCount) {
      const randomIndex = Math.floor(Math.random() * gridSize);
      if (randomIndex !== excludeIndex) {
        minePositions.add(randomIndex);
      }
    }
    
    // Set mines and gems
    newTiles.forEach((tile, index) => {
      if (minePositions.has(index)) {
        tile.isMine = true;
        tile.isGem = false;
      } else {
        tile.isMine = false;
        tile.isGem = true;
      }
    });
    
    return newTiles;
  };

  const calculateMultiplier = (tilesRevealed: number) => {
    // Multiplier increases exponentially based on tiles revealed
    const safeSpots = gridSize - mineCount;
    const risk = tilesRevealed / safeSpots;
    return 1 + (risk * risk * 10); // Exponential growth
  };

  const startGame = async () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance) {
      toast.error('Invalid bet amount');
      return;
    }

    try {
      const response = await fetch('/api/game/place-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (response.ok) {
        setBalance(prev => prev - amount);
        setGameActive(true);
        initializeGame();
        toast.success(`Game started with ₹${amount} bet`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to start game');
      }
    } catch (error) {
      toast.error('Error starting game');
    }
  };

  const revealTile = (index: number) => {
    if (!gameActive || tiles[index].revealed) return;

    let newTiles = [...tiles];
    
    // If this is the first tile, place mines
    if (gameStats.tilesRevealed === 0) {
      newTiles = placeMines(index);
    }

    const tile = newTiles[index];
    tile.revealed = true;

    if (tile.isMine) {
      // Game over - reveal all mines
      newTiles.forEach(t => {
        if (t.isMine) t.revealed = true;
      });
      setTiles(newTiles);
      setGameActive(false);
      toast.error('💣 You hit a mine! Game over!');
      return;
    }

    // Safe tile revealed
    const newTilesRevealed = gameStats.tilesRevealed + 1;
    const newMultiplier = calculateMultiplier(newTilesRevealed);
    const newPotentialWin = parseFloat(betAmount) * newMultiplier;

    setTiles(newTiles);
    setGameStats({
      tilesRevealed: newTilesRevealed,
      multiplier: newMultiplier,
      potentialWin: newPotentialWin,
    });

    toast.success(`💎 Safe! Multiplier: ${newMultiplier.toFixed(2)}x`);
  };

  const cashOut = async () => {
    if (!gameActive || gameStats.tilesRevealed === 0) return;

    try {
      const response = await fetch('/api/game/cash-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multiplier: gameStats.multiplier }),
      });

      if (response.ok) {
        setBalance(prev => prev + gameStats.potentialWin);
        setGameActive(false);
        toast.success(`Cashed out for ₹${gameStats.potentialWin.toFixed(2)}!`);
        
        // Reveal all remaining gems
        const newTiles = tiles.map(tile => ({
          ...tile,
          revealed: true
        }));
        setTiles(newTiles);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to cash out');
      }
    } catch (error) {
      toast.error('Error cashing out');
    }
  };

  const resetGame = () => {
    setGameActive(false);
    initializeGame();
  };

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show nothing if user is not authenticated (redirect will happen)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center">
              <Bomb className="mr-3 h-10 w-10 text-red-500" />
              Mines Game
            </h1>
            <p className="text-gray-300">Find the gems and avoid the mines!</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Game Board */}
            <div className="lg:col-span-2">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white text-center">
                    Game Board ({mineCount} mines hidden)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-[280px] sm:max-w-xl mx-auto">
                    <AnimatePresence>
                      {tiles.map((tile, index) => (
                        <motion.button
                          key={tile.id}
                          className={`
                            aspect-square rounded-md border-2 transition-all duration-200
                            ${!tile.revealed 
                              ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500' 
                              : tile.isMine 
                                ? 'bg-red-500 border-red-400' 
                                : 'bg-green-500 border-green-400'
                            }
                            ${gameActive && !tile.revealed ? 'cursor-pointer' : 'cursor-default'}
                          `}
                          onClick={() => revealTile(index)}
                          disabled={!gameActive || tile.revealed}
                          whileHover={gameActive && !tile.revealed ? { scale: 1.05 } : {}}
                          whileTap={gameActive && !tile.revealed ? { scale: 0.95 } : {}}
                          initial={{ rotateY: 0 }}
                          animate={{ 
                            rotateY: tile.revealed ? 180 : 0,
                            scale: tile.revealed && tile.isMine ? [1, 1.2, 1] : 1
                          }}
                          transition={{ 
                            rotateY: { duration: 0.6 },
                            scale: { duration: 0.3 }
                          }}
                        >
                          <div className="w-full h-full flex items-center justify-center">
                            {tile.revealed ? (
                              tile.isMine ? (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <Bomb className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                                </motion.div>
                              ) : (
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ duration: 0.5 }}
                                >
                                  <Gem className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                                </motion.div>
                              )
                            ) : (
                              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gray-500 rounded-sm" />
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Game Controls */}
            <div className="space-y-6">
              {/* Balance */}
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Wallet className="mr-2 h-5 w-5" />
                    Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div 
                    className="text-3xl font-bold text-green-500"
                    
                  >
                    ₹{balance.toFixed(2)}
                  </motion.div>
                </CardContent>
              </Card>

              {/* Betting Controls */}
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Game Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!gameActive ? (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                          Bet Amount
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter bet amount"
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={startGame}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          size="lg"
                        >
                          Start Game
                        </Button>
                      </motion.div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Tiles Revealed:</span>
                          <span className="text-white">{gameStats.tilesRevealed}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Multiplier:</span>
                          <span className="text-green-400">{gameStats.multiplier.toFixed(2)}x</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Potential Win:</span>
                          <span className="text-green-400">₹{gameStats.potentialWin.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      {gameStats.tilesRevealed > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              onClick={cashOut}
                              className="w-full bg-green-600 hover:bg-green-700"
                              size="lg"
                            >
                              Cash Out ₹{gameStats.potentialWin.toFixed(2)}
                            </Button>
                          </motion.div>
                        </motion.div>
                      )}
                      
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={resetGame}
                          variant="outline"
                          className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reset Game
                        </Button>
                      </motion.div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Game Info */}
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">How to Play</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Place your bet to start the game</li>
                    <li>• Click tiles to reveal gems or mines</li>
                    <li>• Each gem increases your multiplier</li>
                    <li>• Cash out anytime to secure winnings</li>
                    <li>• Hit a mine and lose everything!</li>
                    <li>• 2 mines are hidden in the 3×3 grid</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <a href="/game">Play Aviator</a>
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <a href="/deposit">Deposit Funds</a>
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}