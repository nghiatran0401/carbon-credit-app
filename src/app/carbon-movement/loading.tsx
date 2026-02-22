import { Skeleton } from '@/components/ui/skeleton';

export default function CarbonMovementLoading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Skeleton className="h-9 w-56 mb-2" />
      <Skeleton className="h-5 w-80" />

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-4 shadow-sm">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
