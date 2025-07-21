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
import { ShoppingCart, Leaf, MapPin, Shield, CreditCard, Gift, Users } from "lucide-react";
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
  const { data: orders, isLoading: ordersLoading, error: ordersError, mutate: mutateOrders } = useSWR(user?.id ? `/api/orders?userId=${user.id}` : null, fetcher);
  const [selectedCredit, setSelectedCredit] = useState<any | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [cart, setCart] = useState<any[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [forestType, setForestType] = useState("all");
  const [certification, setCertification] = useState("all");
  const [sortBy, setSortBy] = useState("price-low");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    // Instead of returning null, render a loading or redirecting state
    return <div className="p-8 text-center">Redirecting to login...</div>;
  }
  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error.message}</div>;
  if (!credits?.length) return <div className="p-8 text-center">No credits available.</div>;

  const addToCart = (credit: any, quantity: number) => {
    if (quantity <= 0) {
      toast({ title: "Validation", description: "Quantity must be greater than zero.", variant: "info" });
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        ...credit,
        quantity,
        subtotal: credit.pricePerCredit * quantity,
      },
    ]);
    toast({ title: "Added to cart", description: `${credit.forest?.name || credit.title} x${quantity} added to cart.`, variant: "default" });
  };

  const getTotalCartValue = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: "Cart empty", description: "Add items to your cart before checking out.", variant: "info" });
      return;
    }
    setOrderLoading(true);
    setOrderError(null);
    setOrderSuccess(null);
    try {
      const userId = user?.id;
      if (!userId) throw new Error("User not found");
      const order = await apiPost<any>("/api/orders", {
        userId,
        status: "Pending",
        items: cart.map((item) => ({
          carbonCreditId: item.id,
          quantity: item.quantity,
          pricePerCredit: item.pricePerCredit,
        })),
      });
      setOrderSuccess("Order placed successfully!");
      setCart([]);
      mutate(); // Refetch credits
      mutateOrders(); // Refetch orders
      toast({ title: "Order placed", description: `Your order #${order.id} was placed successfully.`, variant: "default" });
    } catch (err: any) {
      setOrderError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setOrderLoading(false);
    }
  };

  // Filter and sort logic
  let filteredCredits = credits.filter((credit) => {
    // Forest type filter
    const forestTypeValue = credit.forestType ?? "";
    const forestMatch = forestType === "all" || (typeof forestTypeValue === "string" && forestTypeValue.toLowerCase().replace(" ", "").includes(forestType));
    // Certification filter (handle both "VCS" and "VCS (Verified Carbon Standard)")
    const certValue = credit.certification ?? "";
    const certMatch = certification === "all" || (typeof certValue === "string" && certValue.toLowerCase().includes(certification.replace("-", " ")));
    return forestMatch && certMatch;
  });

  if (sortBy === "price-low") {
    filteredCredits.sort((a, b) => a.pricePerCredit - b.pricePerCredit);
  } else if (sortBy === "price-high") {
    filteredCredits.sort((a, b) => b.pricePerCredit - a.pricePerCredit);
  } else if (sortBy === "quantity") {
    filteredCredits.sort((a, b) => (a.available ?? 0) - (b.available ?? 0));
  } else if (sortBy === "vintage") {
    filteredCredits.sort((a, b) => {
      const va = a.vintage ? String(a.vintage) : "";
      const vb = b.vintage ? String(b.vintage) : "";
      return vb.localeCompare(va);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Carbon Credit Marketplace</h1>
          <p className="text-gray-600">Purchase verified carbon credits from Cần Giờ mangrove forests</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Select value={forestType} onValueChange={setForestType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Forest Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="mangrove">Mangrove</SelectItem>
              <SelectItem value="tropical">Tropical</SelectItem>
              <SelectItem value="temperate">Temperate</SelectItem>
              <SelectItem value="wetland">Wetland</SelectItem>
              <SelectItem value="mountain">Mountain</SelectItem>
              <SelectItem value="dry">Dry Forest</SelectItem>
              <SelectItem value="island">Island</SelectItem>
              <SelectItem value="pine">Pine</SelectItem>
            </SelectContent>
          </Select>

          <Select value={certification} onValueChange={setCertification}>
            <SelectTrigger className="w-full sm:w-48">
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
            <SelectTrigger className="w-full sm:w-48">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredCredits.map((credit) => (
            <Card key={credit.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-green-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl">{credit.avatar}</div>
                </div>
              </div>

              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{credit.title}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {credit.location}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{credit.vintage}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Price per credit</span>
                  <span className="text-lg font-bold text-green-600">${credit.pricePerCredit}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Available</span>
                  <span className="text-sm font-medium">{typeof credit.available === "number" ? credit.available.toLocaleString() : "N/A"} credits</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600">{credit.certification}</span>
                </div>

                <div className="space-y-2">
                  {credit.features &&
                    credit.features.map((feature: string, index: number) => (
                      <Badge key={index} variant="outline" className="mr-2 mb-1">
                        {feature}
                      </Badge>
                    ))}
                </div>

                <Separator />

                <Dialog
                  open={dialogOpen}
                  onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) {
                      setSelectedCredit(null);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedCredit(credit);
                        setPurchaseQuantity(1);
                        setDialogOpen(true);
                      }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Purchase Credits
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Purchase Carbon Credits</DialogTitle>
                      <DialogDescription>{selectedCredit?.title}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="quantity">Quantity (credits)</Label>
                        <Input id="quantity" type="number" value={purchaseQuantity} onChange={(e) => setPurchaseQuantity(Number.parseInt(e.target.value) || 1)} min="1" max={selectedCredit?.available} />
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span>Price per credit:</span>
                          <span>${selectedCredit?.pricePerCredit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Quantity:</span>
                          <span>{purchaseQuantity} credits</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>${((selectedCredit?.pricePerCredit || 0) * purchaseQuantity).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600">
                        <p className="mb-2">✓ Verified carbon credits</p>
                        <p className="mb-2">✓ Certificate of purchase included</p>
                        <p>✓ Funds support forest conservation</p>
                      </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        disabled={!selectedCredit || purchaseQuantity < 1 || purchaseQuantity > (selectedCredit?.available || 0)}
                        onClick={() => {
                          if (selectedCredit && purchaseQuantity > 0 && purchaseQuantity <= (selectedCredit.available || 0)) {
                            addToCart(selectedCredit, purchaseQuantity);
                            setDialogOpen(false);
                            setSelectedCredit(null);
                          }
                        }}
                      >
                        Add to Cart
                      </Button>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Buy Now
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Shopping Cart Summary */}
        {cart.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Shopping Cart ({cart.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} credits × ${item.pricePerCredit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${item.subtotal.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${getTotalCartValue().toFixed(2)}</span>
                </div>
                <Button variant="outline" className="w-full" size="lg">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Proceed to Checkout
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Why Choose Our Carbon Credits?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        {/* After the cart summary, show user's order history */}
        {ordersLoading ? (
          <div className="p-4 text-center">Loading orders...</div>
        ) : ordersError ? (
          <div className="p-4 text-center text-red-600">{ordersError.message}</div>
        ) : orders && orders.length > 0 ? (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-2">Your Orders</h2>
            <div className="space-y-4">
              {orders.map((order: any) => (
                <div key={order.id} className="border rounded p-4">
                  <div className="font-semibold">
                    Order #{order.id} ({order.status})
                  </div>
                  <div className="text-sm text-gray-500 mb-2">Placed: {new Date(order.createdAt).toLocaleString()}</div>
                  <div className="space-y-1">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.carbonCredit?.certification} ({item.carbonCredit?.vintage})
                        </span>
                        <span>
                          {item.quantity} × ${item.pricePerCredit} = ${item.subtotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="font-bold mt-2">Total: ${order.totalPrice.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">No orders found.</div>
        )}
      </div>
    </div>
  );
}
