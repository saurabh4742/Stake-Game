"use client";

import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plane, Users, TrendingUp, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
  id: string;
  name: string;
  avatar?: string;
  betAmount: number;
  cashoutAt?: number;
  winAmount?: number;
}

interface GameState {
  phase: 'waiting' | 'flying' | 'crashed';
  multiplier: number;
  crashedAt?: number;
  timeLeft?: number;
  sessionId: string;
}

export default function GamePage() {
  const { user, isLoaded } = useUser();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    multiplier: 1.0,
    sessionId: ''
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [betAmount, setBetAmount] = useState<string>("10");
  const [hasBet, setHasBet] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const animationRef = useRef<number>();

  // Sound effects
  const playSound = (type: 'takeoff' | 'flying' | 'crash' | 'cashout') => {
    if (!soundEnabled) return;
    
    // Create audio context for sound effects
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch (type) {
      case 'takeoff':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        break;
      case 'flying':
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        break;
      case 'crash':
        oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        break;
      case 'cashout':
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        break;
    }
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      redirect("/sign-in");
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    
    console.log('Connecting to Socket.IO server:', socketUrl);

    const socketInstance = io(socketUrl, {
      query: {
        userId: user.id,
        userName: user.firstName || user.emailAddresses[0]?.emailAddress || 'Anonymous',
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.IO server');
      setIsConnected(true);
      toast.success('Connected to game server');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      setIsConnected(false);
      toast.error('Failed to connect to game server');
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.IO server:', reason);
      setIsConnected(false);
      toast.error('Disconnected from game server');
    });

    socketInstance.on('gameState', (state: GameState) => {
      console.log('Received game state:', state);
      const prevPhase = gameState.phase;
      setGameState(state);
      
      // Play sounds based on phase changes
      if (prevPhase !== state.phase) {
        if (state.phase === 'flying') {
          playSound('takeoff');
        } else if (state.phase === 'crashed') {
          playSound('crash');
        }
      }
      
      if (state.phase === 'crashed') {
        setHasBet(false);
      }
    });

    socketInstance.on('multiplierUpdate', (multiplier: number) => {
      setGameState(prev => ({ ...prev, multiplier }));
    });

    socketInstance.on('playersUpdate', (updatedPlayers: Player[]) => {
      console.log('Players update:', updatedPlayers);
      setPlayers(updatedPlayers);
    });

    socketInstance.on('playerCashedOut', (data: Player & { sessionId: string }) => {
      if (data.sessionId === gameState.sessionId) {
        playSound('cashout');
        toast.success(`${data.name} cashed out at ${data.cashoutAt?.toFixed(2)}x for ₹${data.winAmount?.toFixed(2)}`);
      }
    });

    socketInstance.on('gameCrashed', (data: { multiplier: number, sessionId: string }) => {
      if (data.sessionId === gameState.sessionId) {
        toast.error(`Game crashed at ${data.multiplier.toFixed(2)}x!`);
        setHasBet(false);
        // Update balance after crash
        fetchBalance();
      }
    });

    fetchBalance();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      console.log('Disconnecting socket...');
      socketInstance.disconnect();
    };
  }, [user, isLoaded]);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/user/balance');
      const data = await response.json();
      setBalance(data.balance || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const placeBet = async () => {
    if (!socket || !user || hasBet || gameState.phase !== 'waiting') return;
    
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance) {
      toast.error('Invalid bet amount');
      return;
    }

    try {
      const response = await fetch('/api/game/place-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount,
          sessionId: gameState.sessionId 
        }),
      });

      if (response.ok) {
        socket.emit('placeBet', { amount, sessionId: gameState.sessionId });
        setHasBet(true);
        setBalance(prev => prev - amount);
        toast.success(`Bet placed: ₹${amount}`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to place bet');
      }
    } catch (error) {
      toast.error('Error placing bet');
    }
  };

  const cashOut = async () => {
    if (!socket || !hasBet || gameState.phase !== 'flying') return;

    try {
      const response = await fetch('/api/game/cash-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          multiplier: gameState.multiplier,
          sessionId: gameState.sessionId 
        }),
      });

      if (response.ok) {
        socket.emit('cashOut', { 
          multiplier: gameState.multiplier,
          sessionId: gameState.sessionId 
        });
        setHasBet(false);
        const winAmount = parseFloat(betAmount) * gameState.multiplier;
        setBalance(prev => prev + winAmount);
        playSound('cashout');
        toast.success(`Cashed out at ${gameState.multiplier.toFixed(2)}x for ₹${winAmount.toFixed(2)}`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to cash out');
      }
    } catch (error) {
      toast.error('Error cashing out');
    }
  };

  const getMultiplierColor = () => {
    if (gameState.multiplier < 1.5) return 'text-yellow-400';
    if (gameState.multiplier < 2.0) return 'text-orange-400';
    if (gameState.multiplier < 5.0) return 'text-red-400';
    return 'text-purple-400';
  };

  const currentPlayer = players.find(p => p.id === user?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Display */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 overflow-hidden">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  {/* Connection Status & Sound Toggle */}
                  <div className="flex justify-between items-center">
                    <Badge variant={isConnected ? "default" : "destructive"}>
                      {isConnected ? "Connected" : "Disconnected"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="text-white hover:bg-white/10"
                    >
                      {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Game Phase Indicator */}
                  <div className="space-y-2">
                    <motion.h2 
                      className="text-2xl font-bold text-white"
                      animate={{ scale: gameState.phase === 'flying' ? [1, 1.05, 1] : 1 }}
                      transition={{ duration: 2, repeat: gameState.phase === 'flying' ? Infinity : 0 }}
                    >
                      {gameState.phase === 'waiting' && 'Waiting for next round...'}
                      {gameState.phase === 'flying' && 'Plane is flying!'}
                      {gameState.phase === 'crashed' && 'Plane crashed!'}
                    </motion.h2>
                    {gameState.timeLeft && gameState.phase === 'waiting' && (
                      <motion.p 
                        className="text-gray-300"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        Next round in {gameState.timeLeft}s
                      </motion.p>
                    )}
                  </div>

                  {/* Animated Game Scene */}
                  <div className="relative h-64 bg-gradient-to-b from-blue-900/20 to-transparent rounded-lg overflow-hidden">
                    {/* Background Elements */}
                    <div className="absolute inset-0">
                      {[...Array(20)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 bg-white/30 rounded-full"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                          }}
                          animate={{
                            opacity: [0.3, 0.8, 0.3],
                            scale: [1, 1.5, 1],
                          }}
                          transition={{
                            duration: 2 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                          }}
                        />
                      ))}
                    </div>

                    {/* Animated Plane */}
                    <motion.div
                      className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
                      animate={{
                        y: gameState.phase === 'flying' ? [-10, -20, -10] : 0,
                        x: gameState.phase === 'flying' ? [-5, 5, -5] : 0,
                        rotate: gameState.phase === 'crashed' ? [0, 45, 90] : 0,
                        scale: gameState.phase === 'crashed' ? [1, 1.2, 0.8] : 1,
                      }}
                      transition={{
                        y: { duration: 2, repeat: gameState.phase === 'flying' ? Infinity : 0 },
                        x: { duration: 3, repeat: gameState.phase === 'flying' ? Infinity : 0 },
                        rotate: { duration: 0.5 },
                        scale: { duration: 0.5 },
                      }}
                    >
                      <Plane className={`h-16 w-16 transition-colors duration-300 ${
                        gameState.phase === 'crashed' ? 'text-red-500' : 'text-white'
                      }`} />
                      
                      {/* Speed Trail Effect */}
                      {gameState.phase === 'flying' && (
                        <motion.div
                          className="absolute -right-8 top-1/2 transform -translate-y-1/2"
                          animate={{ opacity: [0, 1, 0], scaleX: [0, 1, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          <div className="w-8 h-1 bg-gradient-to-r from-white to-transparent rounded-full" />
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Crash Effect */}
                    <AnimatePresence>
                      {gameState.phase === 'crashed' && (
                        <motion.div
                          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: [0, 2, 1], opacity: [0, 1, 0] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1 }}
                        >
                          <div className="w-32 h-32 bg-red-500/30 rounded-full blur-xl" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Animated Multiplier Display */}
                  <div className="relative">
                    <motion.div 
                      className={`text-8xl font-bold transition-colors duration-300 ${getMultiplierColor()}`}
                      animate={{ 
                        scale: gameState.phase === 'flying' ? [1, 1.1, 1] : 1,
                        textShadow: gameState.phase === 'flying' ? 
                          ['0 0 0px currentColor', '0 0 20px currentColor', '0 0 0px currentColor'] : 
                          '0 0 0px currentColor'
                      }}
                      transition={{ 
                        scale: { duration: 0.5, repeat: gameState.phase === 'flying' ? Infinity : 0 },
                        textShadow: { duration: 1, repeat: gameState.phase === 'flying' ? Infinity : 0 }
                      }}
                    >
                      {gameState.multiplier.toFixed(2)}x
                    </motion.div>
                  </div>

                  {gameState.phase === 'crashed' && gameState.crashedAt && (
                    <motion.p 
                      className="text-red-400 text-xl"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      Crashed at {gameState.crashedAt.toFixed(2)}x
                    </motion.p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Betting Controls */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Place Your Bet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Bet amount"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      disabled={hasBet || gameState.phase !== 'waiting'}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={placeBet}
                      disabled={hasBet || gameState.phase !== 'waiting' || !isConnected}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {hasBet ? 'Bet Placed' : 'Place Bet'}
                    </Button>
                  </motion.div>
                </div>

                {hasBet && gameState.phase === 'flying' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={cashOut}
                        size="lg"
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-xl py-3"
                      >
                        Cash Out at {gameState.multiplier.toFixed(2)}x
                      </Button>
                    </motion.div>
                  </motion.div>
                )}

                {currentPlayer && (
                  <motion.div 
                    className="text-center text-gray-300"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    Your bet: ₹{currentPlayer.betAmount.toFixed(2)}
                    {currentPlayer.cashoutAt && (
                      <span className="text-green-400 ml-2">
                        (Cashed out at {currentPlayer.cashoutAt.toFixed(2)}x)
                      </span>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Players Sidebar */}
          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Live Players ({players.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    <AnimatePresence>
                      {players.map((player, index) => (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="flex items-center space-x-3 p-3 rounded-lg bg-white/5"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={player.avatar} />
                            <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {player.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              ₹{player.betAmount.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            {player.cashoutAt ? (
                              <motion.div 
                                className="text-xs"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                              >
                                <span className="text-green-400">{player.cashoutAt.toFixed(2)}x</span>
                                <br />
                                <span className="text-green-400">+₹{player.winAmount?.toFixed(2)}</span>
                              </motion.div>
                            ) : (
                              <TrendingUp className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Balance Card */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Account Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-3xl font-bold text-green-500 mb-4"
                >
                  ₹{balance.toFixed(2)}
                </motion.div>
                <div className="space-y-2">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <a href="/deposit">Deposit</a>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <a href="/withdraw">Withdraw</a>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <a href="/mines">Play Mines</a>
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}