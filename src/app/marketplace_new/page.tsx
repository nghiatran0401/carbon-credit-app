"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Store,
  AlertCircle,
  Coins,
  MapPin,
  Trees,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  Database,
  Leaf,
  Calendar,
  Tag,
  Loader2,
} from "lucide-react";

interface CarbonCredit {
  id: number;
  forestId: number;
  vintage: number;
  certification: string;
  totalCredits: number;
  availableCredits: number;
  pricePerCredit: number;
  symbol: string;
  retiredCredits: number;
  createdAt: string;
  updatedAt: string;
}

interface OffChainData {
  forestId: number;
  uploader: string;
  name: string;
  location: string;
  type: string;
  area: number;
  description: string;
  status: string;
  lastUpdated: string;
  credits: CarbonCredit[];
}

interface OnChainData {
  tokenId: number;
  blockchainForestId: number | null;
  contractAddress: string;
  ownerAddress: string;
  network: string;
}

interface TokenData {
  hasToken: boolean;
  offChainData: OffChainData;
  onChainData: OnChainData | null;
}

interface MarketplaceResponse {
  tokens: TokenData[];
  total: number;
  withTokens: number;
  withoutTokens: number;
}

export default function MarketplacePage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [marketplaceData, setMarketplaceData] =
    useState<MarketplaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "minted" | "unminted">("minted");
  const [addingToCart, setAddingToCart] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    fetchMarketplaceData();
  }, [isAuthenticated, router]);

  const fetchMarketplaceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/marketplace/tokens");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch marketplace data");
      }

      const data = await response.json();
      setMarketplaceData(data);
    } catch (err: any) {
      console.error("Error fetching marketplace data:", err);
      setError(err.message || "Failed to load marketplace data");
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCredits = async (token: TokenData) => {
    if (!user?.id) {
      setError("Please log in to purchase credits");
      return;
    }

    if (!token.offChainData.credits || token.offChainData.credits.length === 0) {
      setError("No credits available for this forest");
      return;
    }

    // Get the first available credit for this forest
    const credit = token.offChainData.credits[0];
    
    if (credit.availableCredits <= 0) {
      setError("No credits available for purchase");
      return;
    }

    // Get quantity from state, default to 10 if not set
    const quantity = quantities[token.offChainData.forestId] || 10;

    if (quantity > credit.availableCredits) {
      setError(`Only ${credit.availableCredits} credits available`);
      return;
    }

    if (quantity <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    try {
      setAddingToCart(token.offChainData.forestId);
      
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          carbonCreditId: credit.id,
          quantity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add to cart");
      }

      // Navigate to cart with checkout flag
      router.push("/cart?checkout=1");
    } catch (err: any) {
      console.error("Error adding to cart:", err);
      setError(err.message || "Failed to add credits to cart");
    } finally {
      setAddingToCart(null);
    }
  };

  const updateQuantity = (forestId: number, value: number, maxAvailable: number) => {
    const newQuantity = Math.max(1, Math.min(value, maxAvailable));
    setQuantities((prev) => ({ ...prev, [forestId]: newQuantity }));
  };

  const getQuantity = (forestId: number, maxAvailable: number) => {
    if (!quantities[forestId]) {
      const defaultQty = Math.min(10, maxAvailable);
      setQuantities((prev) => ({ ...prev, [forestId]: defaultQty }));
      return defaultQty;
    }
    return quantities[forestId];
  };

  if (!isAuthenticated) {
    return null;
  }

  const filteredTokens = marketplaceData?.tokens.filter((token) => {
    if (filter === "minted") return token.hasToken;
    if (filter === "unminted") return !token.hasToken;
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Store className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold">Token Marketplace</h1>
            <p className="text-muted-foreground">
              Browse all carbon credit tokens with on-chain and off-chain data
            </p>
          </div>
        </div>
        <Button onClick={fetchMarketplaceData} variant="outline">
          Refresh
        </Button>
      </div>

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
              <CardTitle className="text-sm font-medium">Total Forests</CardTitle>
              <Trees className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {marketplaceData?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Available in marketplace
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Minted Tokens
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {marketplaceData?.withTokens || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                On blockchain network
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unminted Assets
              </CardTitle>
              <XCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {marketplaceData?.withoutTokens || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Database only (not minted)
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">
            All ({marketplaceData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="minted">
            Minted ({marketplaceData?.withTokens || 0})
          </TabsTrigger>
          <TabsTrigger value="unminted">
            Unminted ({marketplaceData?.withoutTokens || 0})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Token Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-muted-foreground">
          Failed to load marketplace data
        </div>
      ) : filteredTokens && filteredTokens.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTokens.map((token, index) => (
            <Card
              key={index}
              className="hover:shadow-lg transition-shadow duration-200"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-1">
                      {token.offChainData.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {token.offChainData.location}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={token.hasToken ? "default" : "secondary"}
                    className={
                      token.hasToken
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-orange-500 hover:bg-orange-600"
                    }
                  >
                    {token.hasToken ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {token.hasToken ? "Minted" : "Unminted"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Off-Chain Data Section */}
                <div className="border rounded-lg p-3 bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    <h4 className="font-semibold text-sm">Off-Chain Data</h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Forest ID:</span>
                      <span className="font-medium">
                        {token.offChainData.forestId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">
                        {token.offChainData.type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Area:</span>
                      <span className="font-medium">
                        {token.offChainData.area} ha
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline" className="text-xs">
                        {token.offChainData.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Uploader:</span>
                      <span className="font-medium text-xs">
                        {token.offChainData.uploader}
                      </span>
                    </div>
                  </div>
                </div>

                {/* On-Chain Data Section */}
                {token.hasToken && token.onChainData ? (
                  <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center gap-2 mb-2">
                      <LinkIcon className="h-4 w-4 text-green-600" />
                      <h4 className="font-semibold text-sm">On-Chain Data</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token ID:</span>
                        <span className="font-medium font-mono">
                          {token.onChainData.tokenId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Forest ID (On-Chain):
                        </span>
                        <span className="font-medium font-mono">
                          {token.onChainData.blockchainForestId}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Network:</span>
                        <Badge variant="outline" className="text-xs">
                          {token.onChainData.network}
                        </Badge>
                      </div>
                      {token.onChainData.blockchainForestId ===
                        token.offChainData.forestId && (
                        <div className="flex items-center gap-1 text-green-600 text-xs mt-2">
                          <CheckCircle className="h-3 w-3" />
                          <span>Forest IDs match</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg p-3 bg-orange-50 dark:bg-orange-950/20">
                    <div className="flex items-center gap-2 text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Not minted on blockchain
                      </span>
                    </div>
                  </div>
                )}

                {/* Credits Info */}
                {token.offChainData.credits.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="h-4 w-4 text-green-600" />
                      <h4 className="font-semibold text-sm">
                        Available Credits
                      </h4>
                    </div>
                    {token.offChainData.credits.slice(0, 2).map((credit) => (
                      <div
                        key={credit.id}
                        className="flex items-center justify-between text-sm mb-1"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {credit.certification}
                          </Badge>
                          <span className="text-muted-foreground">
                            {credit.vintage}
                          </span>
                        </div>
                        <span className="font-medium">
                          {credit.availableCredits.toLocaleString()} credits
                        </span>
                      </div>
                    ))}
                    {token.offChainData.credits.length > 2 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        +{token.offChainData.credits.length - 2} more...
                      </p>
                    )}

                    {/* Quantity Selector */}
                    {token.offChainData.credits[0] && (
                      <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <label className="text-xs font-medium text-black  mb-2 block">
                          Purchase Quantity
                        </label>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const currentQty = getQuantity(
                                token.offChainData.forestId,
                                token.offChainData.credits[0].availableCredits
                              );
                              updateQuantity(
                                token.offChainData.forestId,
                                currentQty - 1,
                                token.offChainData.credits[0].availableCredits
                              );
                            }}
                          >
                            -
                          </Button>
                          <input
                            type="number"
                            min="1"
                            max={token.offChainData.credits[0].availableCredits}
                            value={getQuantity(
                              token.offChainData.forestId,
                              token.offChainData.credits[0].availableCredits
                            )}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 1;
                              updateQuantity(
                                token.offChainData.forestId,
                                value,
                                token.offChainData.credits[0].availableCredits
                              );
                            }}
                            className="h-8 w-20 text-center border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const currentQty = getQuantity(
                                token.offChainData.forestId,
                                token.offChainData.credits[0].availableCredits
                              );
                              updateQuantity(
                                token.offChainData.forestId,
                                currentQty + 1,
                                token.offChainData.credits[0].availableCredits
                              );
                            }}
                          >
                            +
                          </Button>
                          <div className="flex-1 text-right">
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Total:
                            </div>
                            <div className="text-sm font-bold text-green-700 dark:text-green-400">
                              ${(
                                getQuantity(
                                  token.offChainData.forestId,
                                  token.offChainData.credits[0].availableCredits
                                ) * token.offChainData.credits[0].pricePerCredit
                              ).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          ${token.offChainData.credits[0].pricePerCredit.toFixed(2)} per credit
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    router.push(`/marketplace/${token.offChainData.forestId}`)
                  }
                >
                  View Details
                </Button>
                {token.offChainData.credits.length > 0 && (
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleBuyCredits(token)}
                    disabled={addingToCart === token.offChainData.forestId}
                  >
                    {addingToCart === token.offChainData.forestId ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Leaf className="h-4 w-4 mr-1" />
                        Buy Credits
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Trees className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            No tokens found matching your filter
          </p>
        </div>
      )}
    </div>
  );
}
