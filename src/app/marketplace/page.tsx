'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingCart,
  Leaf,
  MapPin,
  Shield,
  CreditCard,
  Trees,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Calendar,
  Package,
  ChevronRight,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/components/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import useSWR from 'swr';
import { useToast } from '@/hooks/use-toast';
import type { CarbonCredit } from '@/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatArea(ha: number): string {
  if (ha >= 100) return `${(ha / 100).toFixed(1)} km²`;
  return `${ha.toFixed(1)} ha`;
}

function AvailabilityBar({ available, total }: { available: number; total: number }) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">
          {formatNumber(available)} of {formatNumber(total)} available
        </span>
        <span className="font-medium text-gray-700">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct > 50
              ? 'bg-emerald-500'
              : pct > 20
                ? 'bg-amber-400'
                : pct > 0
                  ? 'bg-red-400'
                  : 'bg-gray-300'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const {
    data: credits,
    error,
    isLoading,
    mutate,
  } = useSWR('/api/marketplace/credits', (url: string) => apiGet<CarbonCredit[]>(url));

  const { data: exchangeRates } = useSWR('/api/exchange-rates', (url: string) =>
    apiGet<Record<string, unknown>[]>(url),
  );

  const [selectedCredit, setSelectedCredit] = useState<CarbonCredit | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [sortBy, setSortBy] = useState('price-low');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availability, setAvailability] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const addToCart = useCallback(
    async (credit: CarbonCredit, quantity: number) => {
      if (!user) {
        toast({
          title: 'Not logged in',
          description: 'Please log in to add items to your cart.',
          variant: 'info',
        });
        return;
      }
      if (quantity <= 0) {
        toast({
          title: 'Validation',
          description: 'Quantity must be greater than zero.',
          variant: 'info',
        });
        return;
      }
      try {
        await apiPost('/api/cart', {
          userId: user.id,
          carbonCreditId: credit.id,
          quantity,
        });
        toast({
          title: 'Added to cart',
          description: `${credit.forest?.name || `Credit #${credit.id}`} x${quantity} added to cart.`,
          variant: 'default',
        });
        if (user?.id) {
          const cartKey = `/api/cart?userId=${user.id}`;
          try {
            const { mutate: globalMutate } = await import('swr');
            globalMutate(cartKey);
          } catch {}
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to add to cart';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      }
    },
    [user, toast],
  );

  function getLatestExchangeRate(creditId: number) {
    if (!exchangeRates) return null;
    const rates = exchangeRates.filter(
      (r) => (r as Record<string, unknown>).carbonCreditId === creditId,
    );
    if (!rates.length) return null;
    rates.sort(
      (a, b) =>
        new Date(String(b.effectiveFrom)).getTime() - new Date(String(a.effectiveFrom)).getTime(),
    );
    return rates[0] as Record<string, unknown>;
  }

  const filteredCredits = useMemo(() => {
    if (!credits) return [];
    const filtered = credits.filter((credit: CarbonCredit) => {
      const isAvailable =
        typeof credit.availableCredits === 'number' && credit.availableCredits > 0;
      const availabilityMatch =
        availability === 'all' ||
        (availability === 'available' && isAvailable) ||
        (availability === 'unavailable' && !isAvailable);

      const nameMatch =
        !searchQuery ||
        (credit.forest?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (credit.forest?.location ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        credit.certification.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(credit.vintage).includes(searchQuery);

      return availabilityMatch && nameMatch;
    });

    const sorted = [...filtered];
    if (sortBy === 'price-low') {
      sorted.sort((a, b) => a.pricePerCredit - b.pricePerCredit);
    } else if (sortBy === 'price-high') {
      sorted.sort((a, b) => b.pricePerCredit - a.pricePerCredit);
    } else if (sortBy === 'quantity') {
      sorted.sort((a, b) => (b.availableCredits ?? 0) - (a.availableCredits ?? 0));
    } else if (sortBy === 'vintage') {
      sorted.sort((a, b) => {
        const va = a.vintage ? String(a.vintage) : '';
        const vb = b.vintage ? String(b.vintage) : '';
        return vb.localeCompare(va);
      });
    } else if (sortBy === 'credits') {
      sorted.sort((a, b) => (b.totalCredits ?? 0) - (a.totalCredits ?? 0));
    }
    return sorted;
  }, [credits, sortBy, availability, searchQuery]);

  const stats = useMemo(() => {
    if (!credits) return { total: 0, available: 0, totalCredits: 0, minPrice: 0 };
    const available = credits.filter(
      (c) => typeof c.availableCredits === 'number' && c.availableCredits > 0,
    ).length;
    const totalCredits = credits.reduce((sum, c) => sum + (c.totalCredits ?? 0), 0);
    const prices = credits.map((c) => c.pricePerCredit).filter(Boolean);
    return {
      total: credits.length,
      available,
      totalCredits,
      minPrice: prices.length ? Math.min(...prices) : 0,
    };
  }, [credits]);

  const isAvailableDialog =
    selectedCredit &&
    typeof selectedCredit.availableCredits === 'number' &&
    selectedCredit.availableCredits > 0;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return <div className="p-8 text-center">Redirecting to sign in...</div>;
  }

  if (isLoading) return <MarketplaceLoadingInline />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Something went wrong</h3>
        <p className="text-gray-500 mb-4 max-w-sm">{error.message}</p>
        <Button variant="outline" onClick={() => mutate()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!credits?.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Carbon Credit Marketplace
          </h1>
          <p className="text-gray-500">
            Browse and purchase carbon credits from forests analyzed by our service
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-gray-200">
          <Trees className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No credits available yet</h3>
          <p className="text-gray-500 mb-6 max-w-md">
            Carbon credits appear here after a forest has been analyzed. Run an analysis to
            calculate carbon credits, then come back to purchase them.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/biomass-only">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
            </Link>
            <Button variant="outline" onClick={() => mutate()}>
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasActiveFilters = availability !== 'all' || searchQuery !== '';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Carbon Credit Marketplace
          </h1>
          <p className="text-gray-500">
            Browse and purchase carbon credits from forests analyzed by our service
          </p>
        </div>
        <Link href="/biomass-only">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Analysis
          </Button>
        </Link>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
            <Package className="h-3.5 w-3.5" />
            Forests Analyzed
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Available
          </div>
          <p className="text-xl font-bold text-emerald-600">{stats.available}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
            <Leaf className="h-3.5 w-3.5" />
            Total Credits
          </div>
          <p className="text-xl font-bold text-gray-900">{formatNumber(stats.totalCredits)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
            <CreditCard className="h-3.5 w-3.5" />
            Starting At
          </div>
          <p className="text-xl font-bold text-gray-900">${stats.minPrice}</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Search & Filter</span>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setAvailability('all');
                setSearchQuery('');
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700 ml-auto underline underline-offset-2"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search forests, locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={availability} onValueChange={setAvailability}>
            <SelectTrigger aria-label="Filter by availability">
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Availability</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="unavailable">Sold Out</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger aria-label="Sort credits by">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="credits">Most Credits</SelectItem>
              <SelectItem value="quantity">Most Available</SelectItem>
              <SelectItem value="vintage">Newest Vintage</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/dashboard" className="flex items-center">
            <Button variant="outline" className="w-full text-sm" size="default">
              <Trees className="h-4 w-4 mr-2" />
              View Calculated Forests
            </Button>
          </Link>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Showing <span className="font-medium text-gray-900">{filteredCredits.length}</span>{' '}
          {filteredCredits.length === 1 ? 'credit listing' : 'credit listings'}
          {hasActiveFilters && <span> (filtered from {credits.length})</span>}
        </p>
      </div>

      {/* Empty filtered state */}
      {filteredCredits.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-200">
          <Search className="h-10 w-10 text-gray-300 mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">No matching credits</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-xs">
            Try adjusting your filters or search terms to find what you&apos;re looking for.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAvailability('all');
              setSearchQuery('');
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {/* Credit Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 mb-8">
        {filteredCredits.map((credit) => {
          const latestRate = getLatestExchangeRate(credit.id);
          const usdValue = latestRate
            ? (credit.pricePerCredit * Number(latestRate.rate)).toFixed(2)
            : null;

          return (
            <CreditCardItem
              key={credit.id}
              credit={credit}
              usdValue={usdValue}
              onSelect={(c) => {
                setSelectedCredit(c);
                setPurchaseQuantity(1);
                setDialogOpen(true);
              }}
            />
          );
        })}
      </div>

      {/* Purchase Dialog */}
      <Dialog
        open={dialogOpen && !!selectedCredit}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedCredit(null);
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }
        }}
      >
        <DialogContent
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-md p-0 overflow-hidden"
        >
          {selectedCredit && (
            <>
              {/* Dialog Header */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 border-b border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white p-2.5 shadow-sm">
                    <Leaf className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="font-semibold text-gray-900 truncate"
                      title={selectedCredit.forest?.name || `Credit #${selectedCredit.id}`}
                    >
                      {selectedCredit.forest?.name || `Credit #${selectedCredit.id}`}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs bg-white/80">
                        <Shield className="h-3 w-3 mr-1" />
                        {selectedCredit.certification}
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-white/80">
                        Vintage {selectedCredit.vintage}
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-white/80">
                        {formatNumber(selectedCredit.totalCredits)} {selectedCredit.symbol}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dialog Body */}
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <span className="text-sm text-gray-600">Price per credit</span>
                  <span className="text-lg font-bold text-gray-900">
                    ${selectedCredit.pricePerCredit}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label htmlFor="quantity" className="text-sm font-medium">
                      Quantity
                    </Label>
                    <span className="text-xs text-gray-500">
                      Max: {selectedCredit.availableCredits ?? 0}
                    </span>
                  </div>
                  <Input
                    id="quantity"
                    type="number"
                    value={purchaseQuantity}
                    onChange={(e) => {
                      const max = selectedCredit.availableCredits ?? 1;
                      let val = Number.parseInt(e.target.value) || 1;
                      if (val > max) val = max;
                      if (val < 1) val = 1;
                      setPurchaseQuantity(val);
                    }}
                    min="1"
                    max={selectedCredit.availableCredits ?? 1}
                    className="text-center text-lg font-semibold"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      ${selectedCredit.pricePerCredit} x {purchaseQuantity}
                    </span>
                    <span className="text-gray-700">
                      ${((selectedCredit.pricePerCredit || 0) * purchaseQuantity).toFixed(2)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-emerald-700">
                      ${((selectedCredit.pricePerCredit || 0) * purchaseQuantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={
                    !isAvailableDialog ||
                    purchaseQuantity < 1 ||
                    purchaseQuantity > (selectedCredit.availableCredits ?? 0)
                  }
                  onClick={() => {
                    addToCart(selectedCredit, purchaseQuantity);
                    setDialogOpen(false);
                    setSelectedCredit(null);
                  }}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={
                    !isAvailableDialog ||
                    purchaseQuantity < 1 ||
                    purchaseQuantity > (selectedCredit.availableCredits ?? 0)
                  }
                  onClick={async () => {
                    await addToCart(selectedCredit, purchaseQuantity);
                    setDialogOpen(false);
                    setSelectedCredit(null);
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

const CreditCardItem = React.memo(function CreditCardItem({
  credit,
  usdValue,
  onSelect,
}: {
  credit: CarbonCredit;
  usdValue: string | null;
  onSelect: (c: CarbonCredit) => void;
}) {
  const isAvailable = typeof credit.availableCredits === 'number' && credit.availableCredits > 0;
  const forest = credit.forest;

  return (
    <div
      className={`group bg-white rounded-xl border transition-all ${
        isAvailable
          ? 'border-gray-200 hover:border-emerald-300 hover:shadow-lg'
          : 'border-gray-100 opacity-60'
      }`}
    >
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 rounded-lg bg-emerald-50 p-2">
              <Leaf className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h3
                className="font-semibold text-gray-900 truncate text-sm"
                title={forest?.name || `Credit #${credit.id}`}
              >
                {forest?.name || `Credit #${credit.id}`}
              </h3>
              {forest && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{forest.location}</span>
                  {forest.area > 0 && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="whitespace-nowrap">{formatArea(forest.area)}</span>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
          {!isAvailable ? (
            <Badge
              variant="outline"
              className="shrink-0 border-red-200 bg-red-50 text-red-600 text-xs"
            >
              Sold Out
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 text-xs"
            >
              Available
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-xs font-normal bg-gray-100 text-gray-600">
            <Shield className="h-3 w-3 mr-1" />
            {credit.certification}
          </Badge>
          <Badge variant="secondary" className="text-xs font-normal bg-gray-100 text-gray-600">
            <Calendar className="h-3 w-3 mr-1" />
            {credit.vintage}
          </Badge>
          <Badge variant="secondary" className="text-xs font-normal bg-emerald-50 text-emerald-700">
            {formatNumber(credit.totalCredits)} {credit.symbol}
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="p-4 pt-3">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <span className="text-2xl font-bold text-gray-900">${credit.pricePerCredit}</span>
            <span className="text-sm text-gray-500 ml-1">/ credit</span>
            {usdValue && <span className="text-xs text-gray-400 ml-2">≈ ${usdValue} USD</span>}
          </div>
        </div>

        <AvailabilityBar
          available={credit.availableCredits ?? 0}
          total={credit.totalCredits ?? 0}
        />

        <Button
          className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={!isAvailable}
          onClick={() => onSelect(credit)}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {isAvailable ? 'Purchase Credits' : 'Sold Out'}
          {isAvailable && <ChevronRight className="h-4 w-4 ml-auto" />}
        </Button>
      </div>
    </div>
  );
});

function MarketplaceLoadingInline() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-8 w-72 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[100px] w-full rounded-xl mb-8" />
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 pb-3">
              <div className="flex items-start gap-3 mb-3">
                <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
            <Separator />
            <div className="p-4 pt-3 space-y-3">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
