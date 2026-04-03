'use client';
import { useAuth } from '@/components/auth-context';
import useSWR from 'swr';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Leaf, Shield } from 'lucide-react';
import { CartItem } from '@/types';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

export default function CartPage() {
  return (
    <Suspense fallback={<CartSkeleton />}>
      <CartPageContent />
    </Suspense>
  );
}

function CartPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = user?.id;
  const {
    data: cartData,
    mutate,
    isLoading,
  } = useSWR(userId ? `/api/cart?userId=${userId}` : null, apiGet);
  const cart: CartItem[] = Array.isArray(cartData) ? cartData : cartData ? [cartData] : [];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [mockLoading, setMockLoading] = useState(false);
  const [mockResult, setMockResult] = useState<{
    transactionHash: string | null;
    explorerUrl: string | null;
  } | null>(null);

  const handleRemove = async (carbonCreditId: number) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      await apiDelete('/api/cart', { userId, carbonCreditId });
      mutate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove item');
    }
    setLoading(false);
  };

  const handleCheckout = async () => {
    if (!turnstileToken) {
      setError('Please complete the security check before checking out.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ checkoutUrl?: string }>('/api/checkout', {
        userId,
        cartItems: cart,
        turnstileToken,
      });
      if (res.checkoutUrl) {
        router.push(res.checkoutUrl);
        return;
      }
      setError('Checkout URL not returned.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }
    setLoading(false);
  };

  const handleError = (msg: string) => {
    setError(msg);
  };

  const handleMockPayment = async () => {
    setMockLoading(true);
    setError(null);
    setMockResult(null);
    try {
      const res = await fetch('/api/mock-payment', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Mock payment failed');
        setMockLoading(false);
        return;
      }
      setMockResult({
        transactionHash: data.transactionHash ?? null,
        explorerUrl: data.explorerUrl ?? null,
      });
      router.push(`/success?orderCode=${data.orderCode}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Mock payment failed');
      setMockLoading(false);
    }
  };

  const [autoCheckoutDone, setAutoCheckoutDone] = useState(false);

  useEffect(() => {
    if (
      searchParams.get('checkout') === '1' &&
      cart.length > 0 &&
      !autoCheckoutDone &&
      !loading &&
      turnstileToken
    ) {
      setAutoCheckoutDone(true);
      handleCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, cart.length, autoCheckoutDone, loading, turnstileToken]);

  if (!userId) return <div className="p-8">Please log in to view your cart.</div>;
  if (isLoading) return <CartSkeleton />;
  const total = cart.reduce(
    (sum, item) => sum + item.quantity * (item.carbonCredit?.pricePerCredit || 0),
    0,
  );

  return (
    <div className="container mx-auto py-8 min-h-[70vh] flex flex-col gap-6">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/90 via-white to-white p-5">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="h-7 w-7 text-emerald-600" />
          Your Cart
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Review your selected credits and complete checkout securely.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-2 flex items-center justify-between"
              role="alert"
            >
              <span className="block sm:inline">{error}</span>
              <button className="ml-4 text-xl" onClick={() => setError(null)}>
                &times;
              </button>
            </div>
          )}
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-6 max-w-sm">
                Browse our marketplace to find verified carbon credits and start offsetting your
                carbon footprint.
              </p>
              <Link href="/marketplace">
                <Button className="bg-emerald-600 hover:bg-emerald-700">Browse Marketplace</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => {
                if (!item.carbonCredit) return null;
                return (
                  <Card
                    key={item.id}
                    className="group flex flex-col items-center gap-4 border-gray-200 p-4 shadow-sm transition-all duration-300 hover:border-emerald-200 hover:shadow-md md:flex-row md:items-stretch"
                  >
                    <div className="flex flex-col items-center justify-center w-20 h-20 bg-gradient-to-tr from-green-100 to-blue-100 rounded-full">
                      <Leaf className="h-8 w-8 text-green-700" />
                    </div>
                    <CardContent className="flex-1 flex flex-col gap-1 p-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="font-semibold text-lg text-gray-900 truncate"
                          title={item.carbonCredit.forest?.name}
                        >
                          {item.carbonCredit.forest?.name}
                        </span>
                        <Badge
                          className="bg-blue-100 text-blue-800 border-blue-300 ml-1"
                          variant="outline"
                        >
                          <Shield className="h-3 w-3 mr-1 inline" />{' '}
                          {item.carbonCredit.certification}
                        </Badge>
                        <Badge
                          className="bg-green-100 text-green-800 border-green-300 ml-1"
                          variant="outline"
                        >
                          {item.carbonCredit.vintage}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">Qty: {item.quantity}</div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-700 text-lg">
                          ${item.carbonCredit.pricePerCredit}
                        </span>
                        <span className="text-xs text-gray-500">each</span>
                      </div>
                    </CardContent>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-bold text-lg text-gray-900">
                        ${(item.quantity * item.carbonCredit.pricePerCredit).toFixed(2)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemove(item.carbonCreditId)}
                        disabled={loading}
                        className="transition-all duration-200 hover:bg-red-50 hover:text-red-600"
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        {/* Sticky Cart Summary on Desktop */}
        {cart.length > 0 && (
          <div className="w-full md:w-80 md:sticky md:top-24 h-fit">
            <Card className="border-emerald-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl text-emerald-800">Summary</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Separator />
                <div className="flex justify-between items-center text-lg">
                  <span>Total</span>
                  <span className="font-bold text-green-700 text-2xl">${total.toFixed(2)}</span>
                </div>
                <Separator />
                <Turnstile
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                  onSuccess={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                  options={{ theme: 'light', size: 'flexible' }}
                />
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                  onClick={handleCheckout}
                  disabled={loading || cart.length === 0 || !turnstileToken || mockLoading}
                >
                  {loading ? 'Processing...' : 'Checkout (PayOS)'}
                </Button>

                {/* ── Mock Payment ─────────────────────────────────────── */}
                <div className="border border-dashed border-amber-300 rounded-lg p-3 bg-amber-50">
                  <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                    <span>🧪</span> Dev / Demo only
                  </p>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-amber-400 text-amber-700 hover:bg-amber-100 font-semibold"
                    onClick={handleMockPayment}
                    disabled={loading || mockLoading || cart.length === 0}
                  >
                    {mockLoading ? '⛓ Transferring on-chain…' : '⚡ Mock Pay + Transfer Credits'}
                  </Button>

                  {mockLoading && (
                    <p className="text-xs text-amber-600 mt-2 text-center">
                      Minting &amp; transferring ERC-1155 tokens on Base…
                      <br />
                      This may take 30–60 s for block confirmation.
                    </p>
                  )}

                  {mockResult?.transactionHash && (
                    <div className="mt-2 text-center">
                      <a
                        href={mockResult.explorerUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-700 font-mono break-all hover:underline"
                      >
                        ✅ {mockResult.transactionHash}
                      </a>
                    </div>
                  )}
                </div>
                <Link
                  href="/marketplace"
                  className="text-center text-green-700 hover:underline text-sm mt-2"
                >
                  Continue Shopping
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="container mx-auto py-8 min-h-[70vh] flex flex-col lg:flex-row gap-8">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col md:flex-row items-center md:items-stretch gap-4 p-4 rounded-lg border bg-white shadow-sm"
            >
              <Skeleton className="h-20 w-20 rounded-full shrink-0" />
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-9 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="w-full lg:w-80 lg:sticky lg:top-24 h-fit">
        <div className="rounded-lg border border-gray-200 bg-white shadow-lg p-4">
          <Skeleton className="h-6 w-24 mb-4" />
          <Skeleton className="h-px w-full mb-4" />
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-px w-full mb-4" />
          <Skeleton className="h-11 w-full rounded-md mb-2" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    </div>
  );
}

async function apiDelete(url: string, data: { userId: number; carbonCreditId: number }) {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
