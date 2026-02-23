'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { useEffect, useState, Suspense } from 'react';
import { CertificateDisplay } from '@/components/certificate-display';
import { Skeleton } from '@/components/ui/skeleton';
import type { Certificate, OrderItem } from '@/types';

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    COMPLETED: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
    PAID: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
    PENDING: 'bg-amber-100 text-amber-800 ring-amber-600/20',
    FAILED: 'bg-red-100 text-red-800 ring-red-600/20',
    CANCELLED: 'bg-gray-100 text-gray-800 ring-gray-600/20',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[status] || styles.PENDING}`}
    >
      {status}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 px-4 py-16">
      <div className="flex flex-col items-center space-y-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-80" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="border-t pt-4 mt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3 mt-2" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const orderCode = searchParams.get('orderCode');
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
    if (!orderCode) return;
    setLoading(true);
    fetch(`/api/checkout/session?orderCode=${orderCode}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(async (data) => {
        setOrder(data.order);
        setPayment(data.payment);

        if (data.order?.status === 'COMPLETED') {
          try {
            const certResponse = await fetch(`/api/certificates?orderId=${data.order.id}`);
            if (certResponse.ok) {
              const certData = await certResponse.json();
              setCertificate(certData);
            }
          } catch (err) {
            console.error('Error fetching certificate:', err);
          }

          setAuditLoading(true);
          const fetchAudit = async (retries: number): Promise<void> => {
            try {
              const auditResponse = await fetch(`/api/orders/audit?orderId=${data.order.id}`);
              if (auditResponse.ok) {
                const auditData = await auditResponse.json();
                if (auditData.success && auditData.audit) {
                  setAudit(auditData.audit);
                  return;
                }
              }
              if (retries > 0) {
                await new Promise((r) => setTimeout(r, 2000));
                return fetchAudit(retries - 1);
              }
            } catch (err) {
              console.error('Error fetching audit record:', err);
            }
          };
          await fetchAudit(2);
          setAuditLoading(false);
        }

        setLoading(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cart');
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [orderCode]);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="max-w-lg mx-auto w-full px-4 py-16 text-center">
        <div className="bg-red-50 rounded-2xl border border-red-200 p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
            <svg
              className="h-7 w-7 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-red-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-red-700 mb-6">{error}</p>
          <Link
            href="/cart"
            className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
          >
            Back to Cart
          </Link>
        </div>
      </div>
    );
  }

  if (!order || !payment) return null;

  const totalItems =
    order.items?.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0) || 0;

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-12 space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-green-200">
          <svg
            className="h-10 w-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Payment Successful</h1>
        <p className="text-gray-500 text-base">
          Your carbon credit purchase has been confirmed. Thank you for making a difference!
        </p>
      </div>

      {/* Two-column: Order Summary + Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Summary Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Order Summary</h2>
            <StatusBadge status={order.status} />
          </div>

          <div className="px-6 py-5 space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Order Code
                </dt>
                <dd className="mt-1 text-sm font-mono font-medium text-gray-900">
                  {order.orderCode}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {order.paidAt
                    ? new Date(order.paidAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Credits Purchased
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {totalItems} credit{totalItems !== 1 ? 's' : ''}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Total Paid
                </dt>
                <dd className="mt-1 text-sm font-semibold text-emerald-700">
                  ${payment.amount.toFixed(2)} {payment.currency}
                </dd>
              </div>
            </div>

            {order.items && order.items.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Items
                </h3>
                <div className="space-y-2">
                  {order.items.map((item: OrderItem) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 shrink-0">
                          <svg
                            className="h-4 w-4 text-emerald-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Credit #{item.carbonCreditId}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.quantity} x ${item.pricePerCredit.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        ${item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Verification & Audit Trail */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Verification & Audit Trail</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Recorded on multiple tamper-proof systems
            </p>
          </div>

          <div className="px-6 py-5 space-y-4 flex-1 flex flex-col">
            {/* ImmuDB */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 shrink-0">
                  <svg
                    className="h-5 w-5 text-purple-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-purple-900">
                    ImmuDB — Immutable Audit
                  </h3>
                  <p className="text-xs text-purple-600">Tamper-proof transaction record</p>
                </div>
                <div className="ml-auto shrink-0">
                  {auditLoading ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-purple-600">
                      <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                      Syncing...
                    </span>
                  ) : audit ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-purple-600">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      Processing...
                    </span>
                  )}
                </div>
              </div>

              {audit && (
                <div className="mt-3 space-y-2">
                  <div className="bg-white/80 rounded-lg p-3 border border-purple-100">
                    <p className="text-[10px] font-medium text-purple-500 uppercase tracking-wider mb-1">
                      SHA-256 Hash
                    </p>
                    <p className="font-mono text-xs text-gray-800 break-all leading-relaxed">
                      {audit.hash}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/80 rounded-lg p-2.5 border border-purple-100">
                      <p className="text-[10px] font-medium text-purple-500 uppercase tracking-wider">
                        Credits
                      </p>
                      <p className="font-mono font-medium text-gray-900 mt-0.5">
                        {audit.transactionData.totalCredits}
                      </p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-2.5 border border-purple-100">
                      <p className="text-[10px] font-medium text-purple-500 uppercase tracking-wider">
                        Recorded At
                      </p>
                      <p className="font-mono font-medium text-gray-900 mt-0.5">
                        {new Date(audit.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Neo4j */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-blue-900">Neo4j — Provenance Graph</h3>
                  <p className="text-xs text-blue-600">Carbon credit ownership chain tracked</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 shrink-0">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Recorded
                </span>
              </div>
            </div>

            <div className="mt-auto pt-2">
              <Link
                href="/carbon-movement"
                className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition"
              >
                <svg
                  className="h-4 w-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                View Transaction Graph
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate */}
      {certificate && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">Your Carbon Credit Certificate</h2>
            <p className="text-sm text-gray-500 mt-1">
              This certificate verifies your contribution to carbon offset
            </p>
          </div>
          <CertificateDisplay certificate={certificate} />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 max-w-2xl mx-auto w-full">
        <Link
          href="/dashboard"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Go to Dashboard
        </Link>
        <Link
          href="/marketplace"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          Continue Shopping
        </Link>
        {certificate && (
          <Link
            href="/history"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            View Certificates
          </Link>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SuccessPageContent />
    </Suspense>
  );
}
