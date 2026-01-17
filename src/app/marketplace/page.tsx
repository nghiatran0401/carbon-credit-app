"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Leaf, MapPin, Shield, CreditCard, Gift, Users, Info } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import useSWR from "swr";
import { useToast } from "@/hooks/use-toast";
import type { CarbonCredit, Order, OrderItem } from "@/types";

export default function MarketplacePage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // All hooks at the top
  const fetcher = (url: string) => apiGet<any[]>(url);
  const { data: credits, error, isLoading, mutate } = useSWR("/api/credits", fetcher);
  // Fetch forests for details modal
  const { data: forests } = useSWR("/api/forests", fetcher);
  // Fetch exchange rates for all credits
  const { data: exchangeRates } = useSWR("/api/exchange-rates", fetcher);

  const [selectedCredit, setSelectedCredit] = useState<any | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [forestType, setForestType] = useState("all");
  const [certification, setCertification] = useState("all");
  const [sortBy, setSortBy] = useState("price-low");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availability, setAvailability] = useState("all");

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    // Instead of returning null, render a loading or redirecting state
    return <div className="p-8 text-center">Redirecting to sign in...</div>;
  }
  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error.message}</div>;
  if (!credits?.length) return <div className="p-8 text-center">No credits available.</div>;

  const addToCart = async (credit: any, quantity: number) => {
    if (!user) {
      toast({ title: "Not logged in", description: "Please log in to add items to your cart.", variant: "info" });
      return;
    }
    if (quantity <= 0) {
      toast({ title: "Validation", description: "Quantity must be greater than zero.", variant: "info" });
      return;
    }
    try {
      await apiPost("/api/cart", {
        userId: user.id,
        carbonCreditId: credit.id,
        quantity,
      });
      toast({ title: "Added to cart", description: `${credit.forest?.name || credit.title} x${quantity} added to cart.`, variant: "default" });
      // Immediately update cart badge in navbar
      if (user?.id) {
        const cartKey = `/api/cart?userId=${user.id}`;
        try {
          const { mutate } = await import("swr");
          mutate(cartKey);
        } catch {}
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Helper to get latest exchange rate for a credit
  function getLatestExchangeRate(creditId: number) {
    if (!exchangeRates) return null;
    const rates = exchangeRates.filter((r: any) => r.carbonCreditId === creditId);
    if (!rates.length) return null;
    // Sort by effectiveFrom descending
    rates.sort((a: any, b: any) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
    return rates[0];
  }

  // Filter and sort logic
  let filteredCredits = credits.filter((credit) => {
    // Forest type filter - fix: use credit.forest.type instead of credit.forestType
    const forestTypeValue = credit.forest?.type ?? "";
    const forestMatch = forestType === "all" || (typeof forestTypeValue === "string" && forestTypeValue.toLowerCase() === forestType.toLowerCase());
    // Certification filter (handle both "VCS" and "VCS (Verified Carbon Standard)")
    const certValue = credit.certification ?? "";
    const certMatch = certification === "all" || (typeof certValue === "string" && certValue.toLowerCase().includes(certification.replace("-", " ")));
    // Availability filter
    const isAvailable = typeof credit.availableCredits === "number" && credit.availableCredits > 0;
    const availabilityMatch = availability === "all" || (availability === "available" && isAvailable) || (availability === "unavailable" && !isAvailable);
    return forestMatch && certMatch && availabilityMatch;
  });

  if (sortBy === "price-low") {
    filteredCredits.sort((a, b) => a.pricePerCredit - b.pricePerCredit);
  } else if (sortBy === "price-high") {
    filteredCredits.sort((a, b) => b.pricePerCredit - a.pricePerCredit);
  } else if (sortBy === "quantity") {
    filteredCredits.sort((a, b) => (a.availableCredits ?? 0) - (b.availableCredits ?? 0));
  } else if (sortBy === "vintage") {
    filteredCredits.sort((a, b) => {
      const va = a.vintage ? String(a.vintage) : "";
      const vb = b.vintage ? String(b.vintage) : "";
      return vb.localeCompare(va);
    });
  }

  const isAvailableDialog = selectedCredit && typeof selectedCredit.availableCredits === "number" && selectedCredit.availableCredits > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Carbon Credit Marketplace</h1>
          <p className="text-gray-600">Purchase verified carbon credits from Cần Giờ mangrove forests</p>
        </div>

        {/* Info Section */}
        <Card className="my-8">
          <CardHeader>
            <CardTitle>Why Choose Our Carbon Credits?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="text-center">
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Verified & Certified</h3>
                <p className="text-sm text-gray-600">All credits are verified by international standards (VCS, Gold Standard)</p>
              </div>
              <div className="text-center">
                <Leaf className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Real Impact</h3>
                <p className="text-sm text-gray-600">Direct support for mangrove conservation and biodiversity protection</p>
              </div>
              <div className="text-center">
                <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Community Benefits</h3>
                <p className="text-sm text-gray-600">Supporting local communities and sustainable livelihoods</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Info Alert */}
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded">
          <b>Note:</b> You can only purchase credits that are <b>available</b> (quantity &gt; 0). Unavailable credits cannot be added to cart or purchased.
        </div>

        {/* Filters */}
        <div className="mb-2 font-semibold text-gray-800 text-lg">Filter Credits</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Select value={availability} onValueChange={setAvailability}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>

          <Select value={forestType} onValueChange={setForestType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Forest Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="mangrove">Mangrove</SelectItem>
              <SelectItem value="wetland">Wetland</SelectItem>
              <SelectItem value="tropical evergreen">Tropical Evergreen</SelectItem>
              <SelectItem value="tropical montane">Tropical Montane</SelectItem>
              <SelectItem value="dry dipterocarp">Dry Dipterocarp</SelectItem>
            </SelectContent>
          </Select>

          <Select value={certification} onValueChange={setCertification}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Certification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Certifications</SelectItem>
              <SelectItem value="vcs">VCS</SelectItem>
              <SelectItem value="gold">Gold Standard</SelectItem>
              <SelectItem value="ccb">CCB</SelectItem>
              <SelectItem value="vcs (verified carbon standard)">VCS (Verified Carbon Standard)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="quantity">Available Quantity</SelectItem>
              <SelectItem value="vintage">Vintage Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Credit Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
          {filteredCredits.map((credit) => {
            const isAvailable = typeof credit.availableCredits === "number" && credit.availableCredits > 0;
            const latestRate = getLatestExchangeRate(credit.id);
            const usdValue = latestRate ? (credit.pricePerCredit * latestRate.rate).toFixed(2) : null;
            const forest = forests?.find((f: any) => f.id === credit.forestId);
            // Purchase history for this credit

            return (
              <div className="relative" key={credit.id}>
                {/* Sold Out Overlay */}
                {!isAvailable && (
                  <div className="absolute inset-0 bg-white bg-opacity-80 z-20 flex flex-col items-center justify-center rounded-2xl">
                    <span className="text-2xl font-bold text-red-600">Sold Out</span>
                  </div>
                )}
                <Card
                  className={`overflow-hidden transition-shadow rounded-2xl shadow-sm border border-gray-200 bg-white relative group ${!isAvailable ? "opacity-60 grayscale pointer-events-none" : "hover:shadow-xl"}`}
                  style={{ minHeight: 340, maxWidth: 350, margin: "0 auto" }}
                >
                  {/* Spotlight Icon and Certification */}
                  <div className="flex items-center gap-3 p-3 pb-0">
                    <div className="rounded-full bg-gradient-to-tr from-green-200 to-blue-200 p-3 shadow flex items-center justify-center">{credit.avatar || <Leaf className="h-8 w-8 text-green-700" />}</div>
                    <div className="flex flex-col gap-1">
                      <span className="text-lg font-bold text-gray-900 truncate" title={credit.title}>
                        {credit.title}
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300" variant="outline">
                          <Shield className="h-3 w-3 mr-1 inline" /> {credit.certification}
                        </Badge>
                        {forest?.type && (
                          <Badge className="bg-green-100 text-green-800 border-green-300" variant="outline">
                            <Leaf className="h-3 w-3 mr-1 inline" /> {forest.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center px-3 pt-2">
                    <div className="flex flex-col items-center">
                      <CreditCard className="h-5 w-5 text-green-600 mb-0.5" />
                      <span className="font-semibold text-base">${credit.pricePerCredit}</span>
                      <span className="text-xs text-gray-500">Price</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Gift className="h-5 w-5 text-blue-600 mb-0.5" />
                      <span className="font-semibold text-base">{credit.availableCredits}</span>
                      <span className="text-xs text-gray-500">Available</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Info className="h-5 w-5 text-purple-600 mb-0.5" />
                      <span className="font-semibold text-base">{credit.vintage}</span>
                      <span className="text-xs text-gray-500">Vintage</span>
                    </div>
                  </div>
                  {/* Forest Details */}
                  {forest && (
                    <div className="bg-green-50 rounded-lg p-2 m-3 flex flex-col gap-1">
                      <div className="flex items-center gap-1 font-semibold text-green-900 text-sm">
                        <MapPin className="h-4 w-4" /> {forest.name}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-800">
                        <span>
                          <Leaf className="h-3 w-3 inline" /> {forest.type}
                        </span>
                        <span>• {forest.area} ha</span>
                        <span>• {forest.status}</span>
                      </div>
                    </div>
                  )}
                  {/* Impact & Benefits */}
                  <div className="bg-blue-50 rounded-lg p-2 m-3 flex flex-col gap-1 border border-blue-100">
                    <div className="flex items-center gap-1 font-semibold text-blue-900 text-sm">
                      <Users className="h-4 w-4" /> Why buy?
                    </div>
                    <div className="flex flex-col gap-0.5 text-xs text-blue-800">
                      <span>
                        <Shield className="h-3 w-3 inline mr-1" /> Verified
                      </span>
                      <span>
                        <Leaf className="h-3 w-3 inline mr-1" /> Real impact
                      </span>
                      <span>
                        <Gift className="h-3 w-3 inline mr-1" /> Certificate
                      </span>
                      <span>
                        <Users className="h-3 w-3 inline mr-1" /> Community
                      </span>
                    </div>
                  </div>
                  {/* Call to Action */}
                  <div className="flex flex-col items-center mt-2 mb-3">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white text-base px-6 py-2 rounded-full shadow flex items-center gap-2"
                      disabled={!isAvailable}
                      onClick={() => {
                        setSelectedCredit(credit);
                        setPurchaseQuantity(1);
                        setDialogOpen(true);
                      }}
                    >
                      <ShoppingCart className="h-5 w-5 mr-1" /> Purchase
                    </Button>
                    {/* Purchase Dialog (only render once per page, outside the card map) */}
                    {selectedCredit && dialogOpen && selectedCredit.id === credit.id && (
                      <Dialog
                        open={dialogOpen}
                        onOpenChange={(open) => {
                          setDialogOpen(open);
                          if (!open) {
                            setSelectedCredit(null);
                            if (document.activeElement instanceof HTMLElement) {
                              document.activeElement.blur();
                            }
                          }
                        }}
                      >
                        <DialogContent
                          onCloseAutoFocus={(e) => {
                            e.preventDefault();
                          }}
                          className="sm:max-w-md p-0"
                        >
                          {/* Spotlight Icon and Title */}
                          <div className="flex items-center gap-3 bg-gradient-to-tr from-green-100 to-blue-100 p-4 rounded-t-lg">
                            <div className="rounded-full bg-white p-3 shadow flex items-center justify-center">{selectedCredit.avatar || <Leaf className="h-8 w-8 text-green-700" />}</div>
                            <div className="flex flex-col gap-1">
                              <span className="text-lg font-bold text-gray-900 truncate" title={selectedCredit.title}>
                                {selectedCredit.title}
                              </span>
                              <div className="flex items-center gap-1 flex-wrap">
                                <Badge className="bg-blue-100 text-blue-800 border-blue-300" variant="outline">
                                  <Shield className="h-3 w-3 mr-1 inline" /> {selectedCredit.certification}
                                </Badge>
                                {selectedCredit.forest?.type && (
                                  <Badge className="bg-green-100 text-green-800 border-green-300" variant="outline">
                                    <Leaf className="h-3 w-3 mr-1 inline" /> {selectedCredit.forest.type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Quick Stats */}
                          <div className="grid grid-cols-3 gap-2 text-center px-4 pt-3">
                            <div className="flex flex-col items-center">
                              <CreditCard className="h-5 w-5 text-green-600 mb-0.5" />
                              <span className="font-semibold text-base">${selectedCredit.pricePerCredit}</span>
                              <span className="text-xs text-gray-500">Price</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <Gift className="h-5 w-5 text-blue-600 mb-0.5" />
                              <span className="font-semibold text-base">{selectedCredit.availableCredits}</span>
                              <span className="text-xs text-gray-500">Available</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <Info className="h-5 w-5 text-purple-600 mb-0.5" />
                              <span className="font-semibold text-base">{selectedCredit.vintage}</span>
                              <span className="text-xs text-gray-500">Vintage</span>
                            </div>
                          </div>
                          {/* Purchase Form */}
                          <div className="p-4 space-y-3">
                            <div>
                              <Label htmlFor="quantity" className="font-semibold">
                                Quantity
                              </Label>
                              <span className="ml-2 text-xs text-gray-500">Available: {selectedCredit?.availableCredits ?? 0}</span>
                              <Input
                                id="quantity"
                                type="number"
                                className="mt-1 border-2 border-green-200 focus:border-green-500 focus:ring-green-200 rounded-lg text-lg px-3 py-2"
                                value={purchaseQuantity}
                                onChange={(e) => {
                                  const max = selectedCredit?.availableCredits ?? 1;
                                  let val = Number.parseInt(e.target.value) || 1;
                                  if (val > max) val = max;
                                  if (val < 1) val = 1;
                                  setPurchaseQuantity(val);
                                }}
                                min="1"
                                max={selectedCredit?.availableCredits ?? 1}
                              />
                              {selectedCredit && purchaseQuantity > selectedCredit.availableCredits && (
                                <div className="text-xs text-red-600 mt-1">Cannot purchase more than {selectedCredit.availableCredits} credits.</div>
                              )}
                            </div>
                            {/* Purchase Summary Card */}
                            <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-100">
                              <div className="flex justify-between">
                                <span>Price per credit:</span>
                                <span className="font-semibold">${selectedCredit?.pricePerCredit}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Quantity:</span>
                                <span className="font-semibold">{purchaseQuantity} credits</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between font-bold text-lg">
                                <span>Total:</span>
                                <span className="text-green-700">${((selectedCredit?.pricePerCredit || 0) * purchaseQuantity).toFixed(2)}</span>
                              </div>
                            </div>
                            {/* Benefits Row */}
                            <div className="flex flex-wrap gap-2 text-xs text-green-800 mt-2">
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" /> Verified
                              </span>
                              <span className="flex items-center gap-1">
                                <Leaf className="h-3 w-3" /> Real impact
                              </span>
                              <span className="flex items-center gap-1">
                                <Gift className="h-3 w-3" /> Certificate
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" /> Community
                              </span>
                            </div>
                          </div>
                          {/* CTA Buttons */}
                          <DialogFooter className="flex-col sm:flex-row gap-2 p-4 pt-0">
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto border-green-600 text-green-700 hover:bg-green-50"
                              disabled={!selectedCredit || !isAvailableDialog || typeof selectedCredit.availableCredits !== "number" || purchaseQuantity < 1 || purchaseQuantity > selectedCredit.availableCredits}
                              onClick={() => {
                                if (selectedCredit && isAvailableDialog && typeof selectedCredit.availableCredits === "number" && purchaseQuantity > 0 && purchaseQuantity <= selectedCredit.availableCredits) {
                                  addToCart(selectedCredit, purchaseQuantity);
                                  setDialogOpen(false);
                                  setSelectedCredit(null);
                                }
                              }}
                            >
                              Add to Cart
                            </Button>
                            <Button
                              variant="default"
                              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold"
                              disabled={!selectedCredit || !isAvailableDialog || typeof selectedCredit.availableCredits !== "number" || purchaseQuantity < 1 || purchaseQuantity > selectedCredit.availableCredits}
                              onClick={async () => {
                                if (selectedCredit && isAvailableDialog && typeof selectedCredit.availableCredits === "number" && purchaseQuantity > 0 && purchaseQuantity <= selectedCredit.availableCredits) {
                                  await addToCart(selectedCredit, purchaseQuantity);
                                  setDialogOpen(false);
                                  setSelectedCredit(null);
                                  router.push("/cart?checkout=1");
                                }
                              }}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Pay Now
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
