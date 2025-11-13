"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, AlertCircle, Coins, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TokenBalance {
  tokenId: number;
  forestId: number;
  forestName: string;
  forestLocation: string;
  balance: number;
  credit: {
    pricePerCredit: number;
    certification: string;
    vintage: number;
    symbol: string;
  } | null;
}

interface WalletData {
  walletAddress: string;
  tokens: TokenBalance[];
  totalTokenTypes: number;
}

const WALLET_ADDRESS = "0x5A57feFf398a8ea3F2E10144cF71fD9A88801cE7";
const AUTHORIZED_EMAIL = "user1@gmail.com";

export default function WalletPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    // Check if the user is authorized to view this wallet
    if (user?.email !== AUTHORIZED_EMAIL) {
      setError("You are not authorized to view this wallet");
      setLoading(false);
      return;
    }

    fetchWalletData();
  }, [isAuthenticated, user, router]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/wallet?address=${encodeURIComponent(WALLET_ADDRESS)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch wallet data");
      }

      const data = await response.json();
      setWalletData(data);
    } catch (err: any) {
      console.error("Error fetching wallet data:", err);
      setError(err.message || "Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (error && user?.email !== AUTHORIZED_EMAIL) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalBalance = walletData?.tokens.reduce((sum, token) => sum + token.balance, 0) || 0;
  const totalValue =
    walletData?.tokens.reduce(
      (sum, token) => sum + token.balance * (token.credit?.pricePerCredit || 0),
      0
    ) || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Wallet className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold">Blockchain Wallet</h1>
          <p className="text-muted-foreground">
            Connected to Ganache Local Network
          </p>
        </div>
      </div>

      {/* Wallet Address Card */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Address</CardTitle>
          <CardDescription>Your blockchain wallet address</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 p-4 bg-muted rounded-lg">
            <code className="text-sm font-mono break-all">{WALLET_ADDRESS}</code>
            <Badge variant="outline" className="shrink-0">
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Token Types
              </CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {walletData?.totalTokenTypes || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Different forest tokens
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Credits
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalBalance.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Carbon credits owned
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Estimated Value
              </CardTitle>
              <span className="text-xs text-muted-foreground">USD</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Based on current prices
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Token Holdings */}
      <Card>
        <CardHeader>
          <CardTitle>Token Holdings</CardTitle>
          <CardDescription>
            Your carbon credit tokens from different forests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load token holdings
            </div>
          ) : walletData && walletData.tokens.length > 0 ? (
            <div className="space-y-4">
              {walletData.tokens.map((token) => (
                <div
                  key={token.tokenId}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Coins className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{token.forestName}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{token.forestLocation}</span>
                      {token.credit && (
                        <>
                          <span>•</span>
                          <span>Token ID: {token.tokenId}</span>
                        </>
                      )}
                    </div>
                    {token.credit && (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {token.credit.certification}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {token.credit.vintage}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {token.credit.symbol}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {token.balance.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      credits
                    </div>
                    {token.credit && (
                      <div className="text-xs text-muted-foreground mt-1">
                        ${(token.balance * token.credit.pricePerCredit).toFixed(2)} USD
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tokens found in this wallet</p>
              <p className="text-sm mt-2">
                Purchase carbon credits to see them here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Network Info */}
      <Card>
        <CardHeader>
          <CardTitle>Network Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Network:</span>
            <span className="font-medium">Ganache Local</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">RPC URL:</span>
            <code className="text-sm">http://127.0.0.1:7545</code>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contract:</span>
            <code className="text-sm text-xs break-all">
              {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "Not configured"}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
