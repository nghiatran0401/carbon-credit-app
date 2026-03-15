import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Skeleton className="h-9 w-80 mb-2" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[600px] rounded-lg border bg-white shadow overflow-hidden">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-4 h-[600px]">
          <div className="rounded-lg border bg-white flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <Skeleton className="h-6 w-28" />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-14" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
