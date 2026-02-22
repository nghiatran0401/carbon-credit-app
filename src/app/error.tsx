'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative min-h-[80vh] overflow-hidden bg-gradient-to-b from-white via-green-50/40 to-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-emerald-100/50 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center px-4 py-16">
        <div className="mx-auto w-full max-w-lg">
          <div className="rounded-3xl bg-white p-8 shadow-lg shadow-gray-200/80 ring-1 ring-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-2xl bg-red-50 p-4 ring-2 ring-red-100">
                <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden />
              </div>
              <h1 className="mt-6 text-2xl font-semibold text-gray-900">Something went wrong</h1>
              <p className="mt-3 text-gray-600">
                We couldn&apos;t complete your request. Please try again—if the problem persists,
                head back home and we&apos;ll get you back on track.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button
                  size="lg"
                  onClick={reset}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700"
                >
                  Try Again
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  <Link href="/">Go Home</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
