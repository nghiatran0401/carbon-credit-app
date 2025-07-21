"use client";
import { useAuth } from "@/components/auth-context";
import useSWR from "swr";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function CartPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data, mutate } = useSWR(userId ? `/api/cart?userId=${userId}` : null, apiGet);
  const cart: any[] = Array.isArray(data) ? data : data ? [data] : [];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const res = await apiPost("/api/checkout", { userId });
      // TODO: Integrate Stripe Elements with res.clientSecret
      alert("Stripe PaymentIntent created. Integrate Stripe Elements next.");
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  if (!userId) return <div className="p-8">Please log in to view your cart.</div>;
  if (!cart) return <div className="p-8">Loading...</div>;
  const total = cart.reduce((sum: any, item: any) => sum + item.quantity * item.carbonCredit.pricePerCredit, 0);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {cart.length === 0 ? (
        <div>Your cart is empty.</div>
      ) : (
        <>
          <ul>
            {cart.map((item: any) => (
              <li key={item.id} className="flex justify-between items-center border-b py-2">
                <div>
                  <div className="font-semibold">{item.carbonCredit.forest?.name}</div>
                  <div className="text-sm text-gray-500">
                    {item.carbonCredit.certification} ({item.carbonCredit.vintage})
                  </div>
                  <div className="text-sm">Qty: {item.quantity}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">${item.carbonCredit.pricePerCredit}</span>
                  <Button size="sm" variant="outline" onClick={() => handleRemove(item.carbonCreditId)} disabled={loading}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex justify-between items-center mt-6">
            <span className="text-lg font-bold">Total: ${total.toFixed(2)}</span>
            <Button size="lg" onClick={handleCheckout} disabled={loading}>
              Checkout
            </Button>
          </div>
        </>
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
