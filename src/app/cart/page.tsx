"use client";
import { useAuth } from "@/components/auth-context";
import useSWR from "swr";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Leaf, Shield, Info } from "lucide-react";

export default function CartPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data, mutate } = useSWR(userId ? `/api/cart?userId=${userId}` : null, apiGet);
  const cart: any[] = Array.isArray(data) ? data : data ? [data] : [];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const handleRemove = async (carbonCreditId: number) => {
    setLoading(true);
    setError(null);
    try {
      await apiDelete("/api/cart", { userId, carbonCreditId });
      mutate();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiPost("/api/checkout", { userId });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setError("Stripe checkout URL not returned.");
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleError = (msg: string) => {
    setError(msg);
  };

  // Auto-open checkout if ?checkout=1
  useEffect(() => {
    if (searchParams.get("checkout") === "1" && cart.length > 0) {
      handleCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, cart.length]);

  if (!userId) return <div className="p-8">Please log in to view your cart.</div>;
  if (!cart) return <div className="p-8">Loading...</div>;
  const total = cart.reduce((sum: any, item: any) => sum + item.quantity * item.carbonCredit.pricePerCredit, 0);

  return (
    <div className="container mx-auto py-8 min-h-[70vh] flex flex-col md:flex-row gap-8">
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <ShoppingCart className="h-7 w-7 text-green-600" /> Your Cart
        </h1>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-2 flex items-center justify-between" role="alert">
            <span className="block sm:inline">{error}</span>
            <button className="ml-4 text-xl" onClick={() => setError(null)}>
              &times;
            </button>
          </div>
        )}
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="bg-gray-100 rounded-full p-6 mb-4">
              <ShoppingCart className="h-12 w-12 text-gray-400" />
            </div>
            <div className="text-lg text-gray-500 mb-2">Your cart is empty.</div>
            <Link href="/marketplace">
              <Button size="lg" variant="outline" className="mt-2">
                Browse Marketplace
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item: any) => (
              <Card key={item.id} className="flex flex-col md:flex-row items-center md:items-stretch gap-4 p-4 transition-all duration-300 shadow-sm hover:shadow-md group">
                <div className="flex flex-col items-center justify-center w-20 h-20 bg-gradient-to-tr from-green-100 to-blue-100 rounded-full">
                  <Leaf className="h-8 w-8 text-green-700" />
                </div>
                <CardContent className="flex-1 flex flex-col gap-1 p-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-lg text-gray-900 truncate" title={item.carbonCredit.forest?.name}>
                      {item.carbonCredit.forest?.name}
                    </span>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300 ml-1" variant="outline">
                      <Shield className="h-3 w-3 mr-1 inline" /> {item.carbonCredit.certification}
                    </Badge>
                    <Badge className="bg-green-100 text-green-800 border-green-300 ml-1" variant="outline">
                      {item.carbonCredit.vintage}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">Qty: {item.quantity}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-700 text-lg">${item.carbonCredit.pricePerCredit}</span>
                    <span className="text-xs text-gray-500">each</span>
                  </div>
                </CardContent>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-bold text-lg text-gray-900">${(item.quantity * item.carbonCredit.pricePerCredit).toFixed(2)}</span>
                  <Button size="sm" variant="outline" onClick={() => handleRemove(item.carbonCreditId)} disabled={loading} className="transition-all duration-200 hover:bg-red-50 hover:text-red-600">
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Sticky Cart Summary on Desktop */}
      {cart.length > 0 && (
        <div className="w-full md:w-80 md:sticky md:top-24 h-fit">
          <Card className="shadow-lg border-green-200">
            <CardHeader>
              <CardTitle className="text-xl text-green-800">Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Separator />
              <div className="flex justify-between items-center text-lg">
                <span>Total</span>
                <span className="font-bold text-green-700 text-2xl">${total.toFixed(2)}</span>
              </div>
              <Separator />
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={handleCheckout} disabled={loading || cart.length === 0}>
                {loading ? "Processing..." : "Checkout"}
              </Button>
              <Link href="/marketplace" className="text-center text-green-700 hover:underline text-sm mt-2">
                Continue Shopping
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Helper for DELETE
async function apiDelete(url: string, data: any) {
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
