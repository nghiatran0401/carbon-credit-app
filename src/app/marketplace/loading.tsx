import { Skeleton } from '@/components/ui/skeleton';

export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-9 w-72 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Info card skeleton */}
        <Skeleton className="h-40 w-full rounded-xl mb-8" />

        {/* Filter bar: 4 rounded rectangles */}
        <div className="mb-2">
          <Skeleton className="h-6 w-28 mb-4" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Credit cards grid: 6 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              style={{ minHeight: 340, maxWidth: 350, margin: '0 auto' }}
            >
              <div className="flex items-center gap-3 pb-2">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex flex-col gap-1 flex-1">
                  <Skeleton className="h-5 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 px-1 pt-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
              <Skeleton className="h-16 w-full rounded-lg mt-3" />
              <div className="flex justify-between mt-3">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
