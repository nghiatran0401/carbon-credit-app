"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useEffect, useState, Suspense } from "react";
import { CertificateDisplay } from "@/components/certificate-display";
import { getBlockchainExplorerInfo, formatTransactionStatus, truncateTransactionHash } from "@/lib/blockchain-utils";
import type { Certificate } from "@/types";

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const mockOrderId = searchParams.get("mock_order_id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);

  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
    });
  }, []);

  useEffect(() => {
    if (!sessionId && !mockOrderId) return;
    setLoading(true);
    
    // Build the API URL based on what parameters we have
    let apiUrl = '/api/checkout/session?';
    if (sessionId) {
      apiUrl += `session_id=${sessionId}`;
    } else if (mockOrderId) {
      apiUrl += `mock_order_id=${mockOrderId}`;
    }
    
    fetch(apiUrl)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(async (data) => {
        setOrder(data.order);
        setPayment(data.payment);

        // Fetch certificate if order is completed
        if (data.order?.status === "Completed") {
          try {
            const certResponse = await fetch(`/api/certificates?orderId=${data.order.id}`);
            if (certResponse.ok) {
              const certData = await certResponse.json();
              setCertificate(certData);
            }
          } catch (err) {
            console.error("Error fetching certificate:", err);
          }
        }

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
  }, [sessionId, mockOrderId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-12">
      <div className="bg-green-100 rounded-full p-6 mb-4">
        <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="flex flex-col items-center mb-2">
        <h1 className="text-2xl font-bold text-green-800">Payment Successful!</h1>
        {mockOrderId && (
          <div className="mt-2">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Mock Payment
            </span>
          </div>
        )}
      </div>
      <p className="text-gray-700 mb-4">
        Thank you for your purchase. Your payment has been processed successfully.
        {mockOrderId && " This was processed using the mock payment system."}
      </p>
      {loading && <p className="text-gray-500">Loading order details...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && order && payment && (
        <div className="bg-white rounded shadow p-4 mb-4 w-full max-w-md">
          <h2 className="text-lg font-semibold mb-2">Order Summary</h2>
          <div className="mb-2 text-sm text-gray-700">
            Order ID: <span className="font-mono">{order.id}</span>
          </div>
          <div className="mb-2 text-sm text-gray-700">
            Status: <span className="font-semibold text-green-700">{order.status}</span>
          </div>
          <div className="mb-2 text-sm text-gray-700">
            Total Paid: <span className="font-semibold">${payment.amount.toFixed(2)}</span> {payment.currency}
          </div>
          <div className="mb-2 text-sm text-gray-700">
            Paid At: <span className="font-mono">{order.paidAt ? new Date(order.paidAt).toLocaleString() : "-"}</span>
          </div>
          <div className="mb-2 text-sm text-gray-700">
            Payment Method: <span className="font-semibold capitalize">{payment.method}</span>
          </div>
          <div className="mb-2 text-sm text-gray-700">
            Session ID: <span className="font-mono">{payment.stripeSessionId}</span>
          </div>
          {order.tokenTxHash && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-semibold text-green-800">
                  Blockchain Transaction
                </span>
              </div>
              <div className="mb-2">
                <div className="text-xs text-gray-600 mb-1">Transaction Hash:</div>
                <div className="font-mono text-xs bg-white p-2 rounded border break-all">
                  {order.tokenTxHash}
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                <a 
                  href={`https://etherscan.io/tx/${order.tokenTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline"
                >
                  <span>View on Etherscan</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a 
                  href={`http://localhost:7545`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 underline"
                >
                  <span>View on Local Ganache</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-green-200">
                <span className="text-xs font-medium text-green-700">
                  Status: {order.tokenTransferred ? '✅ Tokens Transferred' : '⏳ Transfer Pending'}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                🌿 {order.totalCredits} carbon credits transferred to blockchain
              </div>
            </div>
          )}
          {!order.tokenTxHash && order.totalCredits > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-yellow-800">
                  Blockchain Transfer Pending
                </span>
              </div>
              <div className="text-xs text-yellow-700">
                🌿 {order.totalCredits} carbon credits will be transferred to blockchain shortly
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Your transaction hash will appear here once the blockchain transfer is complete.
              </div>
            </div>
          )}
          </div>
          <div className="mb-2 text-sm text-gray-700">Items:</div>
          <ul className="list-disc pl-6 text-gray-700">
            {order.items?.map((item: any) => (
              <li key={item.id}>
                {item.quantity} x Credit #{item.carbonCreditId} @ ${item.pricePerCredit.toFixed(2)} each (Subtotal: ${item.subtotal.toFixed(2)})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Certificate Display */}
      {certificate && (
        <div className="w-full max-w-4xl mt-8">
          <h2 className="text-xl font-bold text-center mb-6 text-green-800">Your Certificate</h2>
          <CertificateDisplay certificate={certificate} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <Link href="/dashboard">
          <button className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">Go to Dashboard</button>
        </Link>
        {certificate && (
          <Link href="/history">
            <button className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">View All Certificates</button>
          </Link>
        )}
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
