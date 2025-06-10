"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/navbar";
import { ArrowUpRight, Wallet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { redirect, useRouter } from "next/navigation";

export default function WithdrawPage() {
  const { user, isLoaded } = useUser();
  const [amount, setAmount] = useState<string>("100");
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<number>(0);

  const router = useRouter();
    useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (user) {
      fetchBalance();
    }
  }, [user]);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/user/balance');
      const data = await response.json();
      setBalance(data.balance || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    
    if (isNaN(withdrawAmount) || withdrawAmount < 10) {
      toast.error("Minimum withdrawal amount is ₹10");
      return;
    }

    if (withdrawAmount > balance) {
      toast.error("Insufficient balance");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: withdrawAmount }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Withdrawal request of ₹${withdrawAmount} submitted successfully!`);
        setAmount("");
        fetchBalance(); // Refresh balance
      } else {
        toast.error(data.message || 'Failed to process withdrawal');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickAmounts = [50, 100, 500, 1000, 2500, 5000].filter(amt => amt <= balance);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <ArrowUpRight className="mr-3 h-8 w-8 text-orange-500" />
              Withdraw Funds
            </h1>
            <p className="text-gray-300">Request a withdrawal from your account balance</p>
          </div>

          {/* Current Balance */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Wallet className="h-8 w-8 text-green-500" />
                  <div>
                    <h3 className="text-lg font-medium text-white">Current Balance</h3>
                    <p className="text-sm text-gray-400">Available for withdrawal</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-green-500">
                  ₹{balance.toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <ArrowUpRight className="mr-2 h-5 w-5" />
                Withdrawal Amount
              </CardTitle>
              <CardDescription className="text-gray-300">
                Enter the amount you want to withdraw. This is a demo implementation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Amount (INR)
                </label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-white/10 border-white/20 text-white text-lg h-12"
                  min="10"
                  max={balance}
                />
              </div>

              {/* Quick Amount Buttons */}
              {quickAmounts.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Quick Amounts
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {quickAmounts.map((quickAmount) => (
                      <Button
                        key={quickAmount}
                        variant="outline"
                        onClick={() => setAmount(quickAmount.toString())}
                        className="border-white/20 text-white hover:bg-orange-600 hover:border-orange-600"
                      >
                        ₹{quickAmount}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Withdraw Button */}
              <Button
                onClick={handleWithdraw}
                disabled={isLoading || balance === 0}
                size="lg"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-lg"
              >
                {isLoading ? "Processing..." : `Withdraw ₹${parseFloat(amount) || 0}`}
              </Button>

              {/* Demo Notice */}
              <Card className="bg-yellow-500/10 border-yellow-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-500">Demo Mode</h4>
                      <p className="text-sm text-yellow-400 mt-1">
                        This is a demonstration of the withdrawal feature. In a real implementation, 
                        this would integrate with payment gateways for actual fund transfers.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info Section */}
              <div className="space-y-3 pt-4 border-t border-white/20">
                <h3 className="font-medium text-white">Withdrawal Information</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Minimum withdrawal: ₹10</li>
                  <li>• Processing time: 1-3 business days</li>
                  <li>• Withdrawals are processed to your original payment method</li>
                  <li>• No withdrawal fees</li>
                  <li>• Maximum daily withdrawal: ₹50,000</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}