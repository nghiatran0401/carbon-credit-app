import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50/50">
      {/* Mobile nav skeleton */}
      <div className="lg:hidden border-b bg-white px-4 py-3">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-lg shrink-0" />
          ))}
        </div>
      </div>

      <div className="flex">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:flex flex-col border-r bg-white w-60 shrink-0 min-h-[calc(100vh-4rem)]">
          <div className="p-4 border-b">
            <Skeleton className="h-6 w-20 mb-1" />
            <Skeleton className="h-3 w-36" />
          </div>
          <div className="p-2 space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </aside>

        {/* Main content skeleton */}
        <main className="flex-1 p-4 lg:p-8 min-w-0 space-y-6">
          {/* Page title */}
          <div>
            <Skeleton className="h-8 w-52 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-white p-6 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-xl border bg-white p-6">
            <Skeleton className="h-5 w-40 mb-6" />
            <Skeleton className="h-80 w-full rounded-lg" />
          </div>

          {/* Two-column section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-white p-6">
                <Skeleton className="h-5 w-36 mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
