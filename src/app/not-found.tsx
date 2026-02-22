import Link from 'next/link';
import { TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="relative min-h-[80vh] overflow-hidden bg-gradient-to-b from-white via-green-50/40 to-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-green-200/40 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-emerald-100/50 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center px-4 py-16">
        <div className="mx-auto w-full max-w-lg text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-3xl bg-emerald-50 p-6 ring-4 ring-emerald-100/60">
              <TreePine className="h-20 w-20 text-emerald-600" aria-hidden />
            </div>
          </div>

          <p className="text-6xl font-bold tracking-tight text-emerald-700 sm:text-7xl">404</p>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900 sm:text-3xl">Page not found</h1>
          <p className="mt-3 text-gray-600">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="w-full rounded-full bg-emerald-600 px-6 hover:bg-emerald-700 sm:w-auto"
            >
              <Link href="/">Go Home</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 sm:w-auto"
            >
              <Link href="/marketplace">Browse Marketplace</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
