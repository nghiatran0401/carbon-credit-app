"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useEffect, useState, Suspense } from "react";
import { CertificateDisplay } from "@/components/certificate-display";
import type { Certificate } from "@/types";

interface OrderAudit {
  orderId: number;
  hash: string;
  timestamp: number;
  transactionData: {
    orderId: number;
    totalCredits: number;
    totalPrice: number;
    paidAt: string;
  };
}

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [audit, setAudit] = useState<OrderAudit | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
    });
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    fetch(`/api/checkout/session?session_id=${sessionId}`)
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

          // Fetch audit record from ImmuDB
          setAuditLoading(true);
          try {
            const auditResponse = await fetch('/api/orders/audit');
            if (auditResponse.ok) {
              const auditData = await auditResponse.json();
              if (auditData.success && auditData.audits) {
                // Find the audit record for this order
                const orderAudit = auditData.audits.find(
                  (a: OrderAudit) => a.orderId === data.order.id
                );
                if (orderAudit) {
                  setAudit(orderAudit);
                }
              }
            }
          } catch (err) {
            console.error("Error fetching audit record:", err);
          } finally {
            setAuditLoading(false);
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
  }, [sessionId]);

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
            Session ID: <span className="font-mono">{payment.stripeSessionId}</span>
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

      {/* Database Recording Status */}
      {!loading && !error && order && (
        <div className="w-full max-w-md mt-6 space-y-3">
          <div className="bg-white rounded shadow p-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Transaction Records</h3>
            
            {/* ImmuDB Section */}
            <div className="flex items-start space-x-3 mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-purple-900 mb-1">ImmuDB (Immutable Audit)</h4>
                <p className="text-xs text-purple-700 mb-2">
                  Transaction permanently recorded to immutable database for tamper-proof audit trail.
                </p>
                
                {auditLoading && (
                  <div className="mt-2 text-xs text-purple-600">
                    Loading audit record...
                  </div>
                )}

                {!auditLoading && audit && (
                  <div className="mt-3 space-y-2">
                    <div className="bg-white p-2 rounded border border-purple-200">
                      <div className="text-[10px] text-purple-600 font-medium mb-1">SHA256 Hash</div>
                      <div className="font-mono text-[10px] break-all text-gray-800">{audit.hash}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-2 rounded border border-purple-200">
                        <div className="text-[10px] text-purple-600 font-medium">Order ID</div>
                        <div className="text-xs font-mono">#{audit.transactionData.orderId}</div>
                      </div>
                      <div className="bg-white p-2 rounded border border-purple-200">
                        <div className="text-[10px] text-purple-600 font-medium">Total Credits</div>
                        <div className="text-xs font-mono">{audit.transactionData.totalCredits}</div>
                      </div>
                      <div className="bg-white p-2 rounded border border-purple-200">
                        <div className="text-[10px] text-purple-600 font-medium">Total Price</div>
                        <div className="text-xs font-mono">${audit.transactionData.totalPrice.toFixed(2)}</div>
                      </div>
                      <div className="bg-white p-2 rounded border border-purple-200">
                        <div className="text-[10px] text-purple-600 font-medium">Paid At</div>
                        <div className="text-xs font-mono">{new Date(audit.transactionData.paidAt).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded border border-purple-200">
                      <div className="text-[10px] text-purple-600 font-medium mb-1">Audit Timestamp</div>
                      <div className="text-xs font-mono">{new Date(audit.timestamp).toLocaleString()}</div>
                    </div>

                    <div className="bg-white p-2 rounded border border-purple-200">
                      <div className="text-[10px] text-purple-600 font-medium mb-1">ImmuDB Key</div>
                      <div className="text-xs font-mono">order_{audit.orderId}</div>
                    </div>

                    <div className="mt-2 flex items-center text-xs text-purple-600">
                      <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      Verified & Sealed
                    </div>
                  </div>
                )}

                {!auditLoading && !audit && (
                  <div className="mt-2 flex items-center text-xs text-purple-600">
                    <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Audit record being created...
                  </div>
                )}
              </div>
            </div>

            {/* Neo4j Section */}
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-blue-900 mb-1">Neo4j (Provenance Graph)</h4>
                <p className="text-xs text-blue-700">
                  Transaction relationships mapped to graph database for complete carbon credit provenance tracking.
                </p>
                <div className="mt-2 flex items-center text-xs text-blue-600">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Graph Updated
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <Link href="/carbon-movement" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
                View Transaction Graph
                <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
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
