"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plane, Wallet, Bomb } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function Navbar() {
  const { user } = useUser();
  const [balance, setBalance] = useState<number>(0);

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

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Plane className="h-8 w-8 text-purple-500" />
          </motion.div>
          <span className="text-sm font-bold sm:text-xl">Crash Games</span>
        </Link>

        <div className="flex items-center space-x-4">
          {user && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="px-4 py-2 bg-green-500/10 border-green-500/20">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-green-500">
                    ₹{balance.toFixed(2)}
                  </span>
                </div>
              </Card>
            </motion.div>
          )}

          <div className="flex items-center space-x-2">
            {user ? (
              <>
                {/* <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/game">
                      <Plane className="mr-1 h-4 w-4" />
                      Aviator
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/mines">
                      <Bomb className="mr-1 h-4 w-4" />
                      Mines
                    </Link>
                  </Button>
                </motion.div> */}
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                </motion.div>
                <UserButton afterSignOutUrl="/" />
              </>
            ) : (
              <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/sign-in">Sign In</Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild size="sm">
                    <Link href="/sign-up">Sign Up</Link>
                  </Button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}