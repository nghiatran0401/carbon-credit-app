"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useEffect, useState, Suspense } from "react";
import { CertificateDisplay } from "@/components/certificate-display";
import type { Certificate } from "@/types";

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
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
