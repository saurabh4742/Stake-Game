"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/navbar";
import { ArrowDownLeft, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { redirect } from "next/navigation";

export default function DepositPage() {
  const { user, isLoaded } = useUser();
  const [amount, setAmount] = useState<string>("100");
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoaded) return null;
  if (!user) redirect("/sign-in");

  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    
    if (isNaN(depositAmount) || depositAmount < 1) {
      toast.error("Please enter a valid amount (minimum ₹1)");
      return;
    }

    if (depositAmount > 100000) {
      toast.error("Maximum deposit amount is ₹1,00,000");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: depositAmount }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error(data.message || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickAmounts = [50, 100, 500, 1000, 5000, 10000];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <ArrowDownLeft className="mr-3 h-8 w-8 text-green-500" />
              Deposit Funds
            </h1>
            <p className="text-gray-300">Add money to your account to start playing</p>
          </div>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Deposit Amount
              </CardTitle>
              <CardDescription className="text-gray-300">
                Choose how much you want to deposit. All payments are processed securely through Stripe.
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
                  min="1"
                  max="100000"
                />
              </div>

              {/* Quick Amount Buttons */}
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
                      className="border-white/20 text-white hover:bg-purple-600 hover:border-purple-600"
                    >
                      ₹{quickAmount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Deposit Button */}
              <Button
                onClick={handleDeposit}
                disabled={isLoading}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg"
              >
                {isLoading ? "Processing..." : `Deposit ₹${parseFloat(amount) || 0}`}
              </Button>

              {/* Info Section */}
              <div className="space-y-3 pt-4 border-t border-white/20">
                <h3 className="font-medium text-white">Payment Information</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Secure payments powered by Stripe</li>
                  <li>• Instant deposits to your game balance</li>
                  <li>• All major credit/debit cards accepted</li>
                  <li>• Minimum deposit: ₹1</li>
                  <li>• Maximum deposit: ₹1,00,000</li>
                  <li>• No additional fees charged</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10 mt-6">
            <CardContent className="p-4">
              <p className="text-sm text-gray-400 text-center">
                🔒 Your payment information is encrypted and processed securely. 
                We never store your card details on our servers.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}