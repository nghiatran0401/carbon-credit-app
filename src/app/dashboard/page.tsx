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
import { ConfirmDialog } from '@/components/confirm-dialog';
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
  ChevronDown,
  FlaskConical,
  ArrowRight,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import BiomassMapBase from '@/components/biomass-map-base';
import { useAuth } from '@/components/auth-context';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { apiGet, apiPost } from '@/lib/api';
import {
  biomassToCredits,
  DEFAULT_PRICE_PER_CREDIT,
  CARBON_FRACTION,
  CO2_C_RATIO,
} from '@/lib/constants';
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

  const [formulaOpen, setFormulaOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dashboard-formula-open') !== 'false';
    }
    return true;
  });
  const toggleFormula = useCallback(() => {
    setFormulaOpen((prev) => {
      localStorage.setItem('dashboard-formula-open', String(!prev));
      return !prev;
    });
  }, []);

  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; open: boolean }>({
    id: '',
    open: false,
  });

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

  const handleDeleteConfirm = async () => {
    const id = deleteTarget.id;
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

      {/* Conversion Formula */}
      <ConversionFormula
        open={formulaOpen}
        onToggle={toggleFormula}
        biomassMg={selectedForest?.stats?.forestBiomassMg ?? null}
        forestName={selectedForest?.name ?? null}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2 h-[600px] bg-white rounded-lg shadow overflow-hidden border relative isolate">
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ id: forest.id, open: true });
                        }}
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

      <ConfirmDialog
        open={deleteTarget.open}
        onOpenChange={(open) => setDeleteTarget((prev) => ({ ...prev, open }))}
        title="Delete forest"
        description="Are you sure you want to delete this forest? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />

      {/* Purchase Dialog */}
      <Dialog
        open={purchaseDialogOpen && !!creditInfo}
        onOpenChange={(open) => {
          setPurchaseDialogOpen(open);
          if (!open && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        }}
      >
        <DialogContent
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-md p-0 overflow-hidden"
        >
          {creditInfo && (
            <>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 border-b border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white p-2.5 shadow-sm">
                    <Leaf className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="font-semibold text-gray-900 truncate"
                      title={selectedForest?.name || 'Forest Credit'}
                    >
                      {selectedForest?.name || 'Forest Credit'}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs bg-white/80">
                        <Shield className="h-3 w-3 mr-1" />
                        {creditInfo.certification}
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-white/80">
                        <Calendar className="h-3 w-3 mr-1" />
                        Vintage {creditInfo.vintage}
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-white/80">
                        {creditInfo.totalCredits.toLocaleString()} {creditInfo.symbol}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <span className="text-sm text-gray-600">Price per credit</span>
                  <span className="text-lg font-bold text-gray-900">
                    ${creditInfo.pricePerCredit}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label htmlFor="purchase-quantity" className="text-sm font-medium">
                      Quantity
                    </Label>
                    <span className="text-xs text-gray-500">
                      Max: {creditInfo.availableCredits ?? 0}
                    </span>
                  </div>
                  <Input
                    id="purchase-quantity"
                    type="number"
                    value={purchaseQuantity}
                    onChange={(e) => {
                      const max = creditInfo.availableCredits ?? 1;
                      let val = Number.parseInt(e.target.value) || 1;
                      if (val > max) val = max;
                      if (val < 1) val = 1;
                      setPurchaseQuantity(val);
                    }}
                    min="1"
                    max={creditInfo.availableCredits ?? 1}
                    className="text-center text-lg font-semibold"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      ${creditInfo.pricePerCredit} x {purchaseQuantity}
                    </span>
                    <span className="text-gray-700">
                      ${((creditInfo.pricePerCredit || 0) * purchaseQuantity).toFixed(2)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-emerald-700">
                      ${((creditInfo.pricePerCredit || 0) * purchaseQuantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={
                    purchaseQuantity < 1 || purchaseQuantity > (creditInfo.availableCredits ?? 0)
                  }
                  onClick={() => {
                    addToCart(creditInfo.id, purchaseQuantity);
                    setPurchaseDialogOpen(false);
                  }}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={
                    purchaseQuantity < 1 || purchaseQuantity > (creditInfo.availableCredits ?? 0)
                  }
                  onClick={async () => {
                    await addToCart(creditInfo.id, purchaseQuantity);
                    setPurchaseDialogOpen(false);
                    router.push('/cart?checkout=1');
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Buy Now
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
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

/* ─── Conversion Formula ─────────────────────────────────────────────────── */

const CAN_GIO_BIOMASS = 1000;
const CAN_GIO_CARBON = CAN_GIO_BIOMASS * CARBON_FRACTION;
const CAN_GIO_CO2E = CAN_GIO_BIOMASS * CARBON_FRACTION * CO2_C_RATIO;
const CAN_GIO_VALUE = CAN_GIO_CO2E * DEFAULT_PRICE_PER_CREDIT;

interface ConversionFormulaProps {
  open: boolean;
  onToggle: () => void;
  biomassMg: number | null;
  forestName: string | null;
}

function ConversionFormula({ open, onToggle, biomassMg, forestName }: ConversionFormulaProps) {
  const hasLive = biomassMg != null && biomassMg > 0;
  const liveCarbon = hasLive ? biomassMg * CARBON_FRACTION : 0;
  const liveCo2e = hasLive ? biomassToCredits(biomassMg) : 0;
  const liveValue = liveCo2e * DEFAULT_PRICE_PER_CREDIT;

  return (
    <div className="mb-8">
      <button
        onClick={onToggle}
        className="group flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-3"
      >
        <FlaskConical className="h-4 w-4" />
        <span>How Carbon Credits Are Calculated</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white via-white to-emerald-50/40 shadow-sm">
            {/* Top: formula + explanation */}
            <div className="p-5 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    From Trees to Carbon Credits
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    We measure how much wood (biomass) a forest has, then calculate how much CO₂ it
                    holds
                  </p>
                </div>
                <div className="bg-gray-900 text-white rounded-lg px-3 py-2 font-mono text-sm whitespace-nowrap shrink-0">
                  tCO₂e = Biomass × {CARBON_FRACTION} × {CO2_C_RATIO.toFixed(2)}
                </div>
              </div>

              {/* 3 step explainer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex gap-3 items-start">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Measure the forest</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      AI analyzes satellite images to estimate the total biomass (weight of all
                      organic material) in <strong>Megagrams (Mg)</strong>
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Extract the carbon</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      About <strong>47%</strong> of wood biomass is pure carbon. Multiply by 0.47
                      (IPCC standard)
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-sky-100 text-sky-700 text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Convert to CO₂</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Each carbon atom pairs with two oxygens. Multiply by <strong>3.67</strong>{' '}
                      (molecular weight ratio 44÷12) to get tonnes of CO₂ equivalent
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Can Gio worked example */}
            <div className="border-t border-gray-100 bg-gradient-to-r from-emerald-50/60 via-emerald-50/30 to-transparent px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Trees className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                  Worked Example — Can Gio Mangrove Forest
                </span>
              </div>

              {/* Pipeline visual */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:gap-0">
                {/* Step: Biomass */}
                <div className="flex-1 rounded-lg border border-emerald-200 bg-white p-3">
                  <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">
                    Biomass
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums text-gray-900">
                    {CAN_GIO_BIOMASS.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Megagrams (Mg)</div>
                </div>

                {/* Arrow + operator */}
                <div className="flex sm:flex-col items-center justify-center px-1.5 py-1 sm:py-0 shrink-0">
                  <ArrowRight className="hidden sm:block h-4 w-4 text-gray-300" />
                  <span className="text-[11px] font-mono font-bold text-amber-600">× 0.47</span>
                </div>

                {/* Step: Carbon */}
                <div className="flex-1 rounded-lg border border-amber-200 bg-white p-3">
                  <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">
                    Carbon
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums text-gray-900">
                    {CAN_GIO_CARBON.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-gray-500">tonnes of Carbon (tC)</div>
                </div>

                {/* Arrow + operator */}
                <div className="flex sm:flex-col items-center justify-center px-1.5 py-1 sm:py-0 shrink-0">
                  <ArrowRight className="hidden sm:block h-4 w-4 text-gray-300" />
                  <span className="text-[11px] font-mono font-bold text-sky-600">× 3.67</span>
                </div>

                {/* Step: CO₂ */}
                <div className="flex-1 rounded-lg border border-sky-200 bg-white p-3">
                  <div className="text-[10px] font-semibold text-sky-600 uppercase tracking-wider mb-1">
                    Carbon Credits
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums text-gray-900">
                    {CAN_GIO_CO2E.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-gray-500">tonnes CO₂ equivalent</div>
                </div>

                {/* Arrow + operator */}
                <div className="flex sm:flex-col items-center justify-center px-1.5 py-1 sm:py-0 shrink-0">
                  <ArrowRight className="hidden sm:block h-4 w-4 text-gray-300" />
                  <span className="text-[11px] font-mono font-bold text-green-600">
                    × ${DEFAULT_PRICE_PER_CREDIT}
                  </span>
                </div>

                {/* Result: Value */}
                <div className="flex-1 rounded-lg border-2 border-green-400 bg-green-50 p-3 ring-1 ring-green-100">
                  <div className="text-[10px] font-semibold text-green-700 uppercase tracking-wider mb-1">
                    Est. Value
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums text-green-700">
                    ${CAN_GIO_VALUE.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-green-600/70">USD</div>
                </div>
              </div>

              {/* Inline equation recap */}
              <p className="mt-3 text-xs text-gray-500 font-mono text-center sm:text-left">
                {CAN_GIO_BIOMASS.toLocaleString()} Mg × 0.47 ={' '}
                {CAN_GIO_CARBON.toLocaleString(undefined, { maximumFractionDigits: 0 })} tC × 3.67 ={' '}
                <strong className="text-gray-700">
                  {CAN_GIO_CO2E.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e
                </strong>{' '}
                × ${DEFAULT_PRICE_PER_CREDIT} ={' '}
                <strong className="text-green-700">
                  ${CAN_GIO_VALUE.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </strong>
              </p>
            </div>

            {/* Live forest values */}
            {hasLive && forestName && (
              <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Leaf className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="font-medium text-gray-700">{forestName}:</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-gray-600">
                  <span>
                    {biomassMg.toLocaleString(undefined, { maximumFractionDigits: 0 })} Mg
                  </span>
                  <ArrowRight className="h-3 w-3 text-gray-300 hidden sm:block" />
                  <span>
                    {liveCarbon.toLocaleString(undefined, { maximumFractionDigits: 0 })} tC
                  </span>
                  <ArrowRight className="h-3 w-3 text-gray-300 hidden sm:block" />
                  <span className="font-semibold text-gray-800">
                    {liveCo2e.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e
                  </span>
                  <ArrowRight className="h-3 w-3 text-gray-300 hidden sm:block" />
                  <span className="font-semibold text-green-700">
                    ${liveValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            )}

            {/* Footer: source */}
            <div className="border-t border-gray-100 px-5 py-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <Info className="h-3 w-3 shrink-0" />
                <span>
                  Based on IPCC 2006 Guidelines, Vol 4 · CF = 0.47 (Table 4.3) · CO₂/C molar ratio =
                  44/12 · Adopted by Verra VCS, Gold Standard, ACR
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 pl-[18px] text-[11px]">
                <a
                  href="https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/4_Volume4/V4_04_Ch4_Forest_Land.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600/70 underline decoration-emerald-300/50 hover:text-emerald-700 transition-colors"
                >
                  CF = 0.47 — IPCC Vol 4, Ch 4, Table 4.3
                </a>
                <a
                  href="https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/4_Volume4/V4_04_Ch4_Forest_Land.pdf#page=48"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600/70 underline decoration-sky-300/50 hover:text-sky-700 transition-colors"
                >
                  44/12 ≈ 3.67 — IPCC Vol 4, Ch 4, Eq. 2.10
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
