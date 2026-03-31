'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Frown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RateLimitedPage() {
  const searchParams = useSearchParams();
  const retryAfter = Math.max(1, Number(searchParams.get('retry')) || 60);
  const [secondsLeft, setSecondsLeft] = useState(retryAfter);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleRetry = useCallback(() => {
    window.location.href = '/';
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-green-50/40 to-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-green-200/40 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-emerald-100/50 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="mx-auto w-full max-w-lg flex flex-col items-center text-center">
          <Frown className="h-16 w-16 text-gray-400" aria-hidden />

          <h1 className="mt-3 text-2xl font-semibold text-gray-900">Too many requests</h1>
          <p className="mt-3 text-gray-600">
            You&apos;re sending requests a little too fast. Please wait a moment before trying
            again.
          </p>

          <div className="mt-6 rounded-xl bg-emerald-50 px-5 py-3 ring-1 ring-emerald-100">
            <p className="text-sm text-emerald-700">
              {secondsLeft > 0 ? (
                <>
                  You can try again in{' '}
                  <span className="font-semibold tabular-nums">{secondsLeft}s</span>
                </>
              ) : (
                <span className="font-semibold">You can try again now</span>
              )}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-700"
            >
              <Link href="/">Go Home</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleRetry}
              className="rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
