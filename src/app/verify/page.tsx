'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

interface VerificationResponse {
  success: boolean;
  message?: string;
  orderId: number;
  status: string;
  verification: {
    immudb: {
      status: 'verified' | 'mismatch' | 'not_found' | 'unavailable';
      isValid: boolean;
      computedHash: string;
      storedHash: string | null;
    };
    blockchain: {
      status: 'anchored' | 'not_anchored' | 'unavailable';
      txHash?: string | null;
      blockNumber?: number | null;
      explorerUrl?: string;
      merkleRoot?: string;
      merkleProof?: string[];
      proofValid?: boolean;
    };
  };
  orderSummary: {
    totalCredits: number;
    totalPrice: number;
    paidAt: string;
  };
  hashComputation: {
    algorithm: string;
    formula: string;
    dataString: string;
  };
  verifiedAt: string;
}

const statusConfig = {
  verified: {
    icon: CheckCircle2,
    label: 'Verified',
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    description:
      'This transaction is authentic. The current data matches the immutable record stored in ImmuDB.',
  },
  mismatch: {
    icon: XCircle,
    label: 'Integrity Mismatch',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    description:
      'Warning: The computed hash does not match the stored record. Data may have been modified.',
  },
  not_found: {
    icon: AlertTriangle,
    label: 'No Record Found',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    description:
      'No immutable audit record was found for this order. It may not have been audited yet.',
  },
  unavailable: {
    icon: AlertTriangle,
    label: 'Service Unavailable',
    color: 'text-gray-600',
    bg: 'bg-gray-50 border-gray-200',
    description: 'The verification service is temporarily unavailable. Please try again later.',
  },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="ml-2 p-1 rounded hover:bg-gray-200 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-gray-400" />
      )}
    </button>
  );
}

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const [queryValue, setQueryValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyByInput = useCallback(async (rawValue: string) => {
    const value = rawValue.trim();
    if (!value) {
      setError('Please enter an Order ID or SHA-256 hash');
      return;
    }

    let query = '';
    if (/^\d+$/.test(value)) {
      query = `orderId=${value}`;
    } else if (/^[a-fA-F0-9]{64}$/.test(value)) {
      query = `hash=${value.toLowerCase()}`;
    } else {
      setError('Enter a numeric Order ID or a 64-character SHA-256 hash');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/public/verify?${query}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Verification failed');
        return;
      }

      setResult(data);
    } catch {
      setError('Unable to reach the verification service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await verifyByInput(queryValue);
  };

  useEffect(() => {
    const orderIdFromUrl = searchParams.get('orderId');
    const hashFromUrl = searchParams.get('hash');

    if (orderIdFromUrl && /^\d+$/.test(orderIdFromUrl)) {
      setQueryValue(orderIdFromUrl);
      void verifyByInput(orderIdFromUrl);
      return;
    }

    if (hashFromUrl && /^[a-fA-F0-9]{64}$/.test(hashFromUrl)) {
      setQueryValue(hashFromUrl);
      void verifyByInput(hashFromUrl);
    }
  }, [searchParams, verifyByInput]);

  const status = result ? statusConfig[result.verification.immudb.status] : null;
  const StatusIcon = status?.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Header */}
      <section className="relative px-4 pt-12 pb-8 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-700 mb-6">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Transaction Verification</h1>
          <p className="mt-4 text-gray-600 max-w-xl mx-auto">
            Independently verify any EcoCredit transaction. Every completed order is hashed with
            SHA-256 and stored immutably in{' '}
            <a
              href="https://immudb.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
            >
              immudb
            </a>
            , a tamper-evident database.
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="px-4 pb-6">
        <div className="mx-auto max-w-2xl">
          <form onSubmit={handleVerify} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={queryValue}
                onChange={(e) => setQueryValue(e.target.value)}
                placeholder="Enter Order ID (e.g. 42) or SHA-256 hash"
                className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3.5 text-white font-medium shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-60 transition whitespace-nowrap"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify'}
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Result */}
      {result && status && StatusIcon && (
        <section className="px-4 pb-16">
          <div className="mx-auto max-w-2xl space-y-4">
            {/* Status banner */}
            <div className={`rounded-xl border p-5 ${status.bg}`}>
              <div className="flex items-start gap-3">
                <StatusIcon className={`h-6 w-6 mt-0.5 ${status.color}`} />
                <div>
                  <h2 className={`text-lg font-semibold ${status.color}`}>{status.label}</h2>
                  <p className="mt-1 text-sm text-gray-600">{status.description}</p>
                </div>
              </div>
            </div>

            {/* Order summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Order Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Order ID</p>
                  <p className="text-lg font-bold text-gray-900">#{result.orderId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Credits</p>
                  <p className="text-lg font-bold text-gray-900">
                    {result.orderSummary.totalCredits}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Value</p>
                  <p className="text-lg font-bold text-gray-900">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      result.orderSummary.totalPrice,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Paid</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(result.orderSummary.paidAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Hash details */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Cryptographic Proof
              </h3>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Stored Hash (ImmuDB)</p>
                  {result.verification.immudb.storedHash && (
                    <CopyButton text={result.verification.immudb.storedHash} />
                  )}
                </div>
                <p className="mt-1 font-mono text-xs text-gray-800 bg-gray-50 p-3 rounded-lg break-all">
                  {result.verification.immudb.storedHash || 'N/A'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Computed Hash (Live Data)</p>
                  <CopyButton text={result.verification.immudb.computedHash} />
                </div>
                <p className="mt-1 font-mono text-xs text-gray-800 bg-gray-50 p-3 rounded-lg break-all">
                  {result.verification.immudb.computedHash}
                </p>
              </div>

              {result.verification.immudb.storedHash && (
                <div className="flex items-center gap-2 text-xs">
                  {result.verification.immudb.isValid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-700 font-medium">
                        Hashes match — data integrity confirmed
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-700 font-medium">
                        Hashes do not match — possible tampering
                      </span>
                    </>
                  )}
                </div>
              )}

              {result.verification.blockchain.status === 'anchored' && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                  <p className="font-medium mb-1">Anchored on Base blockchain</p>
                  <p>
                    Block #{result.verification.blockchain.blockNumber ?? 'N/A'} • Proof{' '}
                    {result.verification.blockchain.proofValid ? 'valid' : 'pending'}
                  </p>
                  {result.verification.blockchain.explorerUrl && (
                    <a
                      href={result.verification.blockchain.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-emerald-800 underline underline-offset-2"
                    >
                      View anchor transaction
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* How to verify yourself */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Verify It Yourself
              </h3>
              <p className="text-sm text-gray-600">
                You can independently verify this hash. Run the following command in any terminal:
              </p>
              <div className="relative">
                <pre className="font-mono text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                  {`echo -n "${result.hashComputation.dataString}" | sha256sum`}
                </pre>
                <CopyButton text={`echo -n "${result.hashComputation.dataString}" | sha256sum`} />
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  <span className="font-medium text-gray-700">Algorithm:</span>{' '}
                  {result.hashComputation.algorithm}
                </p>
                <p>
                  <span className="font-medium text-gray-700">Formula:</span>{' '}
                  {result.hashComputation.formula}
                </p>
                <p>
                  <span className="font-medium text-gray-700">Input:</span>{' '}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                    {result.hashComputation.dataString}
                  </code>
                </p>
              </div>
            </div>

            {/* Buyer guide: verify on Base Sepolia */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-800">
                Verify on Base Sepolia (Buyer Guide)
              </h3>
              {result.verification.blockchain.status === 'anchored' ? (
                <>
                  <p className="text-sm text-blue-900">
                    This order is anchored on Base Sepolia. You can verify it yourself on BaseScan:
                  </p>
                  <ol className="list-decimal pl-5 text-sm text-blue-900 space-y-1">
                    <li>Open the anchor transaction link below.</li>
                    <li>Check the transaction status is successful.</li>
                    <li>
                      Confirm block number{' '}
                      <span className="font-semibold">
                        #{result.verification.blockchain.blockNumber ?? 'N/A'}
                      </span>{' '}
                      and network is Base Sepolia.
                    </li>
                    <li>
                      Compare this page&apos;s hash/proof info with your order ID{' '}
                      <span className="font-semibold">#{result.orderId}</span>.
                    </li>
                  </ol>
                  <div className="text-xs text-blue-900 space-y-1">
                    {result.verification.blockchain.txHash && (
                      <p>
                        <span className="font-medium">Tx Hash:</span>{' '}
                        <code className="bg-white/80 px-1.5 py-0.5 rounded">
                          {result.verification.blockchain.txHash}
                        </code>
                      </p>
                    )}
                    {result.verification.blockchain.merkleRoot && (
                      <p>
                        <span className="font-medium">Merkle Root:</span>{' '}
                        <code className="bg-white/80 px-1.5 py-0.5 rounded break-all">
                          {result.verification.blockchain.merkleRoot}
                        </code>
                      </p>
                    )}
                  </div>
                  {result.verification.blockchain.explorerUrl && (
                    <a
                      href={result.verification.blockchain.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-800 font-medium underline underline-offset-2"
                    >
                      Open BaseScan transaction
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </>
              ) : (
                <p className="text-sm text-blue-900">
                  Blockchain anchor is not available yet for this order. Please check again later,
                  or contact support with your order ID #{result.orderId}.
                </p>
              )}
            </div>

            {/* Timestamp */}
            <p className="text-center text-xs text-gray-400">
              Verified at {new Date(result.verifiedAt).toLocaleString()}
            </p>
          </div>
        </section>
      )}

      {/* Explainer (always visible) */}
      {!result && (
        <section className="px-4 pb-16">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">How verification works</h3>
              <ol className="space-y-4">
                {[
                  {
                    step: '1',
                    title: 'Hash at checkout',
                    desc: 'When an order is completed, we compute a SHA-256 hash from the order details (ID, buyer, seller, credits, price, timestamp).',
                  },
                  {
                    step: '2',
                    title: 'Immutable storage',
                    desc: 'The hash is stored in immudb — a tamper-evident database that uses Merkle trees to prevent silent modification of records.',
                  },
                  {
                    step: '3',
                    title: 'Verify anytime',
                    desc: 'Enter your order ID above. We recompute the hash from live database values and compare it to the immutable record. A match means the data is untampered.',
                  },
                ].map((item) => (
                  <li key={item.step} className="flex gap-4">
                    <span className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-semibold">
                      {item.step}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <a
                  href="https://immudb.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-emerald-700 font-medium hover:text-emerald-800"
                >
                  Learn more about immudb
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
