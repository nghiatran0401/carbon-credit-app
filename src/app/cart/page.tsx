"use client";
import { useAuth } from "@/components/auth-context";
import useSWR from "swr";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Link from "next/link";
import confetti from "canvas-confetti";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ clientSecret, onSuccess, onError }: { clientSecret: string; onSuccess: () => void; onError: (msg: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });
    if (error) {
      setError(error.message || "Payment failed");
      onError(error.message || "Payment failed");
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess();
    } else {
      setError("Payment not completed");
      onError("Payment not completed");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-8 p-4 border rounded bg-white">
      <CardElement className="mb-4 p-2 border rounded" options={{ hidePostalCode: true }} />
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <Button type="submit" size="lg" disabled={loading || !stripe || !elements}>
        {loading ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  );
}

export default function CartPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data, mutate } = useSWR(userId ? `/api/cart?userId=${userId}` : null, apiGet);
  const cart: any[] = Array.isArray(data) ? data : data ? [data] : [];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
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
      setClientSecret(res.clientSecret);
      setOrderId(res.orderId);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleSuccess = async () => {
    setSuccess(true);
    setClientSecret(null);
    setOrderId(null);
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
    await mutate(); // Clear cart UI
  };

  const handleError = (msg: string) => {
    setError(msg);
  };

  // Auto-open checkout if ?checkout=1
  useEffect(() => {
    if (searchParams.get("checkout") === "1" && !clientSecret && cart.length > 0) {
      handleCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, cart.length]);

  if (!userId) return <div className="p-8">Please log in to view your cart.</div>;
  if (!cart) return <div className="p-8">Loading...</div>;
  const total = cart.reduce((sum: any, item: any) => sum + item.quantity * item.carbonCredit.pricePerCredit, 0);

  if (success)
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
        <div className="text-green-600 mb-4">Thank you for your purchase. Your order has been placed.</div>
        {orderId && (
          <div className="mb-4">
            Order ID: <span className="font-mono">{orderId}</span>
          </div>
        )}
        <Link href="/marketplace">
          <Button size="lg">Back to Marketplace</Button>
        </Link>
      </div>
    );

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-2" role="alert">
          <span className="block sm:inline">{error}</span>
          <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}
      {cart.length === 0 ? (
        <div>Your cart is empty.</div>
      ) : clientSecret ? (
        <>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
            <b>Test Card:</b> 4242 4242 4242 4242 &nbsp; Exp: 04/24 &nbsp; CVC: 242 &nbsp; Any ZIP
          </div>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm clientSecret={clientSecret} onSuccess={handleSuccess} onError={handleError} />
          </Elements>
        </>
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
            <Button size="lg" onClick={handleCheckout} disabled={loading || cart.length === 0}>
              {loading ? "Processing..." : "Checkout"}
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
