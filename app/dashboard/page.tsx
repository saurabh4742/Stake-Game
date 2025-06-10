import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { ArrowDownLeft, ArrowUpRight, Gamepad2, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

async function getUserData(clerkId: string) {
  let user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      gameSessions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId,
        email: '',
        balance: 0,
      },
      include: {
        transactions: true,
        gameSessions: true,
      },
    });
  }

  return user;
}

export default async function Dashboard() {
  const { userId } = auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await getUserData(userId);
  
  const totalDeposits = user.transactions
    .filter(t => t.type === 'DEPOSIT' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalWins = user.transactions
    .filter(t => t.type === 'WIN')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalLosses = user.transactions
    .filter(t => t.type === 'LOSS')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-300">Manage your account and track your gaming activity</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Current Balance</CardTitle>
              <Wallet className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">₹{user.balance.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Deposits</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₹{totalDeposits.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Wins</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₹{totalWins.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Games Played</CardTitle>
              <Gamepad2 className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{user.gameSessions.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button asChild className="bg-purple-600 hover:bg-purple-700">
            <Link href="/game">
              <Gamepad2 className="mr-2 h-4 w-4" />
              Play Game
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white">
            <Link href="/deposit">
              <ArrowDownLeft className="mr-2 h-4 w-4" />
              Deposit
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
            <Link href="/withdraw">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Withdraw
            </Link>
          </Button>
        </div>

        {/* Tables */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList className="bg-white/10 backdrop-blur-lg">
            <TabsTrigger value="transactions" className="data-[state=active]:bg-purple-600">Transactions</TabsTrigger>
            <TabsTrigger value="games" className="data-[state=active]:bg-purple-600">Game History</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Recent Transactions</CardTitle>
                <CardDescription className="text-gray-300">Your latest financial activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user.transactions.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No transactions yet</p>
                  ) : (
                    user.transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-full ${
                            transaction.type === 'DEPOSIT' ? 'bg-green-500/20' :
                            transaction.type === 'WITHDRAWAL' ? 'bg-orange-500/20' :
                            transaction.type === 'WIN' ? 'bg-green-500/20' :
                            'bg-red-500/20'
                          }`}>
                            {transaction.type === 'DEPOSIT' && <ArrowDownLeft className="h-4 w-4 text-green-500" />}
                            {transaction.type === 'WITHDRAWAL' && <ArrowUpRight className="h-4 w-4 text-orange-500" />}
                            {transaction.type === 'WIN' && <TrendingUp className="h-4 w-4 text-green-500" />}
                            {(transaction.type === 'LOSS' || transaction.type === 'BET') && <Gamepad2 className="h-4 w-4 text-red-500" />}
                          </div>
                          <div>
                            <p className="font-medium text-white">{transaction.type}</p>
                            <p className="text-sm text-gray-400">
                              {formatDistanceToNow(transaction.createdAt, { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            transaction.type === 'DEPOSIT' || transaction.type === 'WIN' ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {transaction.type === 'DEPOSIT' || transaction.type === 'WIN' ? '+' : '-'}₹{Math.abs(transaction.amount).toFixed(2)}
                          </p>
                          <Badge variant={transaction.status === 'COMPLETED' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="games" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Game History</CardTitle>
                <CardDescription className="text-gray-300">Your recent game sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user.gameSessions.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No games played yet</p>
                  ) : (
                    user.gameSessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-full ${session.winAmount ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            <Gamepad2 className={`h-4 w-4 ${session.winAmount ? 'text-green-500' : 'text-red-500'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              Bet: ₹{session.betAmount.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-400">
                              {formatDistanceToNow(session.createdAt, { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">
                            {session.cashoutAt ? `Cashed out at ${session.cashoutAt.toFixed(2)}x` : 'Crashed'}
                          </p>
                          <p className={`font-medium ${session.winAmount ? 'text-green-500' : 'text-red-500'}`}>
                            {session.winAmount ? `+₹${session.winAmount.toFixed(2)}` : `-₹${session.betAmount.toFixed(2)}`}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}