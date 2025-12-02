"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useEffect, useState, Suspense } from "react";

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);

  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
    });
  }, []);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetch(`/api/orders/${orderId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(async (data) => {
        setOrder(data);
        setPayment(data.payments?.[0] || null);
        setLoading(false);
        
        // Remove cart from localStorage if you use it
        if (typeof window !== "undefined") {
          localStorage.removeItem("cart");
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [orderId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-12">
      <div className="bg-green-100 rounded-full p-6 mb-4">
        <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-2 text-green-800">Payment Successful!</h1>
      <p className="text-gray-700 mb-4">Thank you for your purchase. Your payment has been processed successfully.</p>
      {loading && <p className="text-gray-500">Loading order details...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && order && payment && (
        <div className="bg-white rounded shadow p-6 mb-4 w-full max-w-2xl">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Order Summary</h2>
          <div className="grid gap-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-mono font-semibold">#{order.id}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Status:</span>
              <span className="font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">{order.status}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total Paid:</span>
              <span className="font-semibold text-lg">${payment.amount.toFixed(2)} {payment.currency}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Paid At:</span>
              <span className="font-mono text-xs">{order.paidAt ? new Date(order.paidAt).toLocaleString() : "-"}</span>
            </div>
            {payment?.stripeSessionId && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Payment ID:</span>
                <span className="font-mono text-xs">{payment.stripeSessionId}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-semibold mb-2 text-gray-900">Items Purchased:</h3>
            <ul className="space-y-2">
              {order.items?.map((item: any) => (
                <li key={item.id} className="text-sm bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <span className="text-gray-700">
                      {item.quantity} × {item.carbonCredit?.forest?.name || `Credit #${item.carbonCreditId}`}
                    </span>
                    <span className="font-semibold text-gray-900">${item.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ${item.pricePerCredit.toFixed(2)} each
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Blockchain Transaction Details */}
          {order.orderHistory && order.orderHistory.some((h: any) => h.event === "tokens_transferred") && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Blockchain Transactions
              </h3>
              <div className="space-y-3">
                {order.orderHistory
                  .filter((h: any) => h.event === "tokens_transferred")
                  .map((history: any, index: number) => {
                    // Extract transaction hash from message
                    const txMatch = history.message.match(/TX: (0x[a-fA-F0-9]+)/);
                    const txHash = txMatch ? txMatch[1] : null;
                    
                    // Extract token details
                    const quantityMatch = history.message.match(/Transferred (\d+) tokens/);
                    const tokenIdMatch = history.message.match(/Token ID: (\d+)/);
                    const quantity = quantityMatch ? quantityMatch[1] : "N/A";
                    const tokenId = tokenIdMatch ? tokenIdMatch[1] : "N/A";

                    return (
                      <div key={history.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-green-800 bg-green-100 px-2 py-1 rounded">
                                Transaction #{index + 1}
                              </span>
                              <span className="text-xs text-gray-600">
                                {new Date(history.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">{quantity} tokens</span> transferred (Token ID: {tokenId})
                            </div>
                            {txHash && (
                              <div className="mt-2">
                                <div className="text-xs text-gray-600 mb-1">Transaction Hash:</div>
                                <div className="flex items-center gap-2 bg-white rounded p-2 border border-green-200">
                                  <code className="text-xs font-mono text-gray-800 break-all flex-1">
                                    {txHash}
                                  </code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(txHash);
                                      alert("Transaction hash copied to clipboard!");
                                    }}
                                    className="shrink-0 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition"
                                    title="Copy transaction hash"
                                  >
                                    Copy
                                  </button>
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                  ℹ️ You can verify this transaction on your Ganache blockchain at{" "}
                                  <span className="font-mono">http://127.0.0.1:7545</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Wallet Information */}
          <div className="mt-4 pt-4 border-t bg-blue-50 -mx-6 -mb-6 p-6 rounded-b-lg">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Your Tokens</h4>
                <p className="text-xs text-gray-600 mb-2">
                  Your carbon credit tokens have been transferred to the buyer wallet. You can view them on the{" "}
                  <Link href="/wallet" className="text-blue-600 hover:text-blue-700 font-medium underline">
                    Wallet page
                  </Link>
                  .
                </p>
                <div className="text-xs text-gray-600">
                  <span className="font-semibold">Buyer Wallet Address:</span>
                  <div className="font-mono bg-white px-2 py-1 rounded mt-1 text-gray-800">
                    0xC0D96df80AA7eFe04e4ed8D4170C87d75dAe047e
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <Link href="/wallet">
          <button className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
            View Wallet & Trade Tokens
          </button>
        </Link>
        <Link href="/dashboard">
          <button className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            Go to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-[70vh] py-12">Loading...</div>}>
      <SuccessPageContent />
    </Suspense>
  );
}
