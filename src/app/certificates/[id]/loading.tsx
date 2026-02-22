import { Skeleton } from '@/components/ui/skeleton';

export default function CertificateLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-center pb-4 mb-4 border-b">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-56" />
            </div>
            <div className="flex items-center justify-center gap-4">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-36" />
            </div>
          </div>

          <Skeleton className="h-4 w-24 mb-3" />
          <div className="rounded-lg border overflow-hidden">
            <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 border-b">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-12" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 p-3 border-b last:border-b-0">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
