export default function CarbonMovementLoading() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 px-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      <p className="text-sm text-gray-500 animate-pulse">Loading graph data...</p>
    </div>
  );
}
