import { Skeleton } from '@/components/ui/skeleton';

export default function HistoryLoading() {
  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <Skeleton className="h-9 w-28" />
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <Skeleton className="h-10 w-80 rounded-md" />
          <Skeleton className="h-10 w-80 sm:w-48 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </div>

      {/* 5 order row skeletons */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white shadow-md overflow-hidden"
          >
            <div className="bg-gray-50 rounded-t-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-px w-full my-2" />
              <div className="flex justify-end">
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
