import { Skeleton } from '@/components/ui/skeleton';

export default function CartLoading() {
  return (
    <div className="container mx-auto py-8 min-h-[70vh] flex flex-col lg:flex-row gap-8">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-8 w-32" />
        </div>

        {/* 3 cart item rows */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col md:flex-row items-center md:items-stretch gap-4 p-4 rounded-lg border bg-white shadow-sm"
            >
              <Skeleton className="h-20 w-20 rounded-full shrink-0" />
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-9 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order summary sidebar */}
      <div className="w-full lg:w-80 lg:sticky lg:top-24 h-fit">
        <div className="rounded-lg border border-gray-200 bg-white shadow-lg p-4">
          <Skeleton className="h-6 w-24 mb-4" />
          <Skeleton className="h-px w-full mb-4" />
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-px w-full mb-4" />
          <Skeleton className="h-11 w-full rounded-md mb-2" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    </div>
  );
}
