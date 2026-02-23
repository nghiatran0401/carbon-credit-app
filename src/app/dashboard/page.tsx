'use client';

import { useEffect, useState, useCallback, useMemo, type ComponentType } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import {
  Leaf,
  DollarSign,
  MapPin,
  TrendingUp,
  Trash2,
  Trees,
  ShoppingCart,
  CreditCard,
  Shield,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import BiomassMapBase from '@/components/biomass-map-base';
import { useAuth } from '@/components/auth-context';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { apiGet, apiPost } from '@/lib/api';
import { biomassToCredits, DEFAULT_PRICE_PER_CREDIT } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

interface PlatformStats {
  totalCredits: number;
  availableCredits: number;
  retiredCredits: number;
  totalValue: number;
  totalAreaKm2: number;
  totalForests: number;
  activeForests: number;
  totalUsers: number;
  completedOrders: number;
  totalRevenue: number;
  creditsSold: number;
}

interface ForestStats {
  forestBiomassMg?: number;
  forestAreaKm2?: number;
  forestCoveragePct?: number;
  meanBiomassDensity?: number;
  [key: string]: unknown;
}

interface SavedForest {
  id: string;
  name?: string;
  description?: string;
  stats?: ForestStats;
  bounds?: { north: number; south: number; east: number; west: number } | null;
  prismaForestId?: number;
  [key: string]: unknown;
}

interface ForestDetail extends SavedForest {
  mask?: number[][] | null;
}

interface CreditInfo {
  id: number;
  forestId: number;
  pricePerCredit: number;
  availableCredits: number;
  totalCredits: number;
  certification: string;
  vintage: number;
  symbol: string;
  forest?: { name?: string; location?: string; area?: number };
}

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const {
    data: savedForests,
    error,
    isLoading,
    mutate,
  } = useSWR<SavedForest[]>('/api/analysis', apiGet);
  const { data: platformStats } = useSWR<PlatformStats>('/api/stats', apiGet);
  const [selectedForestId, setSelectedForestId] = useState<string | null>(null);

  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);

  const { data: forestDetail, isLoading: isDetailLoading } = useSWR<ForestDetail>(
    selectedForestId ? `/api/analysis/${selectedForestId}` : null,
    apiGet,
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (savedForests && savedForests.length > 0 && !selectedForestId) {
      setSelectedForestId(savedForests[0].id);
    }
  }, [savedForests, selectedForestId]);

  const forests = useMemo(() => savedForests ?? [], [savedForests]);
  const selectedForest = useMemo(
    () => forests.find((f) => f.id === selectedForestId) ?? null,
    [forests, selectedForestId],
  );

  const selectedPrismaForestId = selectedForest?.prismaForestId;
  const { data: creditInfo } = useSWR<CreditInfo>(
    selectedPrismaForestId ? `/api/forests/${selectedPrismaForestId}/credits` : null,
    apiGet,
  );

  const addToCart = useCallback(
    async (creditId: number, quantity: number) => {
      if (!user) {
        toast({
          title: 'Not logged in',
          description: 'Please log in to purchase credits.',
          variant: 'destructive',
        });
        return;
      }
      try {
        await apiPost('/api/cart', { carbonCreditId: creditId, quantity });
        toast({
          title: 'Added to cart',
          description: `${selectedForest?.name || 'Credits'} x${quantity} added to cart.`,
        });
        if (user?.id) {
          const { mutate: globalMutate } = await import('swr');
          globalMutate(`/api/cart?userId=${user.id}`);
        }
      } catch (err: unknown) {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to add to cart',
          variant: 'destructive',
        });
      }
    },
    [user, toast, selectedForest?.name],
  );

  const totalCredits = platformStats?.totalCredits ?? 0;
  const totalArea = platformStats?.totalAreaKm2 ?? 0;
  const totalValue = platformStats?.totalValue ?? 0;
  const activeForests = platformStats?.activeForests ?? forests.length;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this forest?')) return;
    try {
      await fetch(`/api/analysis?id=${id}`, { method: 'DELETE' });
      toast({ title: 'Forest deleted' });
      mutate();
      if (selectedForestId === id) setSelectedForestId(null);
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  if (!isAuthenticated) return null;
  if (isLoading)
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
  if (error) return <div className="p-8 text-center text-red-500">Failed to load data.</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Forest Carbon Credit Dashboard</h1>
          <p className="text-gray-600">Monitor forests analyzed by our AI-powered service</p>
        </div>
        <Button onClick={() => router.push('/biomass-only')}>+ New Analysis</Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        <OverviewCard
          title="Total Carbon Credits"
          icon={Leaf}
          value={totalCredits.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          unit="tCO₂e"
        />
        <OverviewCard
          title="Total Value"
          icon={DollarSign}
          value={`$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          unit="USD"
        />
        <OverviewCard
          title="Protected Area"
          icon={MapPin}
          value={totalArea.toFixed(2)}
          unit="km²"
        />
        <OverviewCard title="Active Zones" icon={TrendingUp} value={activeForests} unit="forests" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2 h-[600px] bg-white rounded-lg shadow overflow-hidden border relative">
          {selectedForest ? (
            isDetailLoading ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                  <span>Loading map data...</span>
                </div>
              </div>
            ) : (
              <BiomassMapBase
                key={selectedForest.id}
                bounds={selectedForest.bounds ?? null}
                mask={forestDetail?.mask ?? null}
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a forest to view
            </div>
          )}
          {selectedForest && (
            <div className="absolute top-4 left-4 bg-white/90 p-3 rounded shadow backdrop-blur-sm z-[400] max-w-[300px]">
              <h3 className="font-bold text-lg truncate">{selectedForest.name}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{selectedForest.description}</p>
            </div>
          )}
        </div>

        {/* List & Details */}
        <div className="flex flex-col gap-4 h-[600px]">
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle>Calculated Forests</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 p-3 pt-0">
              {forests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Trees className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No forests calculated yet
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-sm">
                    Run a new analysis to estimate carbon credits from forest biomass. Calculated
                    forests will appear here.
                  </p>
                  <Link href="/biomass-only">
                    <Button className="bg-emerald-600 hover:bg-emerald-700">New Analysis</Button>
                  </Link>
                </div>
              ) : (
                forests.map((forest) => (
                  <div
                    key={forest.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-slate-50 ${selectedForestId === forest.id ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200'}`}
                    onClick={() => setSelectedForestId(forest.id)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold truncate pr-2">{forest.name}</h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-red-500 shrink-0"
                        onClick={(e) => handleDelete(forest.id, e)}
                        aria-label="Delete forest"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500 mb-2 line-clamp-1">
                      {forest.description || 'No description'}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Leaf className="h-3 w-3 text-green-500" />
                        <span>
                          {forest.stats?.forestBiomassMg
                            ? (forest.stats.forestBiomassMg / 3.67).toFixed(1)
                            : 0}{' '}
                          tCO₂
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-blue-500" />
                        <span>{forest.stats?.forestAreaKm2?.toFixed(2)} km²</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {selectedForest && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Detailed Stats</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Biomass</span>
                  <span className="font-mono font-medium">
                    {selectedForest.stats?.forestBiomassMg?.toFixed(2)} Mg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Coverage</span>
                  <span className="font-mono font-medium">
                    {selectedForest.stats?.forestCoveragePct?.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mean Density</span>
                  <span className="font-mono font-medium">
                    {selectedForest.stats?.meanBiomassDensity?.toFixed(1)} Mg/ha
                  </span>
                </div>
                <div className="pt-2 border-t flex justify-between items-center">
                  <span className="font-medium">Est. Value</span>
                  <span className="font-bold text-green-600">
                    $
                    {(
                      biomassToCredits(selectedForest.stats?.forestBiomassMg ?? 0) *
                      DEFAULT_PRICE_PER_CREDIT
                    ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                {selectedForest.prismaForestId && (
                  <Button
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!creditInfo || (creditInfo.availableCredits ?? 0) <= 0}
                    onClick={() => {
                      setPurchaseQuantity(1);
                      setPurchaseDialogOpen(true);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {creditInfo && creditInfo.availableCredits > 0
                      ? 'Purchase Credits'
                      : 'No Credits Available'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface OverviewCardProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  value: string | number;
  unit?: string;
}
function OverviewCard({ title, icon: Icon, value, unit }: OverviewCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-green-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{unit}</p>
      </CardContent>
    </Card>
  );
}
