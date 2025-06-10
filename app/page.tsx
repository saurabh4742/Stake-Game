import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, TrendingUp, Users, Zap, Bomb, Gem } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-center items-center space-x-4 mb-4">
              <Plane className="h-16 w-16 text-purple-400" />
              <Bomb className="h-12 w-12 text-red-400" />
            </div>
            <h1 className="text-6xl font-bold text-white mb-6">
              Crash <span className="text-purple-400">Games</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Experience the ultimate adrenaline rush with real-time multipliers and explosive gameplay. 
              Play Aviator or test your luck with Mines!
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3">
              <Link href="/sign-up">Start Playing</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white px-8 py-3">
              <Link href="/game">Try Aviator</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white px-8 py-3">
              <Link href="/mines">Try Mines</Link>
            </Button>
          </div>

          {/* Games Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <Plane className="h-12 w-12 text-purple-400 mb-4" />
                <CardTitle className="text-white">Aviator Game</CardTitle>
                <CardDescription className="text-gray-300">
                  Watch the plane soar and cash out before it crashes! Real-time multipliers with live players.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
                  <Link href="/game">Play Aviator</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <Bomb className="h-12 w-12 text-red-400 mb-4" />
                <CardTitle className="text-white">Mines Game</CardTitle>
                <CardDescription className="text-gray-300">
                  Reveal gems and avoid mines! Each safe tile increases your multiplier exponentially.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full bg-[#a3004c] hover:bg-[#a3004c]">
                  <Link href="/mines">Play Mines</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-green-400 mb-4" />
                <CardTitle className="text-white">Real-time Multipliers</CardTitle>
                <CardDescription className="text-gray-300">
                  Watch multipliers grow in real-time and decide when to cash out
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <Users className="h-12 w-12 text-blue-400 mb-4" />
                <CardTitle className="text-white">Live Players</CardTitle>
                <CardDescription className="text-gray-300">
                  See other players bets and cash-outs in real-time
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <Zap className="h-12 w-12 text-yellow-400 mb-4" />
                <CardTitle className="text-white">Instant Payouts</CardTitle>
                <CardDescription className="text-gray-300">
                  Lightning-fast deposits and withdrawals with Stripe
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}