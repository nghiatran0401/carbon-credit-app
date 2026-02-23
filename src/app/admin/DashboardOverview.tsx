'use client';

import { useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  Leaf,
  Globe,
  Users,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { Order, CarbonCredit, Forest, User } from '@/types';

const ResponsiveContainer = dynamic(() => import('recharts').then((m) => m.ResponsiveContainer), {
  ssr: false,
});
const AreaChart = dynamic(() => import('recharts').then((m) => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then((m) => m.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((m) => m.CartesianGrid), {
  ssr: false,
});

const STATUS_BAR_COLORS: Record<string, string> = {
  COMPLETED: 'bg-emerald-500',
  PAID: 'bg-blue-500',
  PENDING: 'bg-amber-500',
  PROCESSING: 'bg-violet-500',
  CANCELLED: 'bg-red-500',
  FAILED: 'bg-gray-500',
  EXPIRED: 'bg-gray-400',
};

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAID: 'bg-blue-50 text-blue-700 border-blue-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PROCESSING: 'bg-violet-50 text-violet-700 border-violet-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  FAILED: 'bg-gray-50 text-gray-700 border-gray-200',
  EXPIRED: 'bg-gray-50 text-gray-500 border-gray-200',
};

interface DashboardOverviewProps {
  orders: Order[];
  credits: CarbonCredit[];
  forests: Forest[];
  users: User[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  onNavigate: (section: string) => void;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function DeltaIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">No change</span>;
  const positive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-emerald-600' : 'text-red-600'}`}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
      <span className="text-muted-foreground font-normal ml-1">vs last mo.</span>
    </span>
  );
}

export default function DashboardOverview({
  orders,
  credits,
  forests,
  users,
  selectedYear,
  onYearChange,
  onNavigate,
}: DashboardOverviewProps) {
  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  const totalRevenue = useMemo(
    () => orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
    [orders],
  );

  const totalCreditsSold = useMemo(
    () =>
      orders.reduce(
        (sum, o) => sum + (o.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0),
        0,
      ),
    [orders],
  );

  const isPrevMonth = useCallback(
    (d: Date) =>
      (curMonth === 0 && d.getMonth() === 11 && d.getFullYear() === curYear - 1) ||
      (curMonth > 0 && d.getMonth() === curMonth - 1 && d.getFullYear() === curYear),
    [curMonth, curYear],
  );

  const isCurMonth = useCallback(
    (d: Date) => d.getMonth() === curMonth && d.getFullYear() === curYear,
    [curMonth, curYear],
  );

  const revenueChange = useMemo(() => {
    let curr = 0,
      prev = 0;
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      if (isCurMonth(d)) curr += o.totalPrice || 0;
      else if (isPrevMonth(d)) prev += o.totalPrice || 0;
    });
    return prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
  }, [orders, isCurMonth, isPrevMonth]);

  const creditsChange = useMemo(() => {
    let curr = 0,
      prev = 0;
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const qty = o.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
      if (isCurMonth(d)) curr += qty;
      else if (isPrevMonth(d)) prev += qty;
    });
    return prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
  }, [orders, isCurMonth, isPrevMonth]);

  const userGrowthChange = useMemo(() => {
    let curr = 0,
      prev = 0;
    users.forEach((u) => {
      const d = new Date(u.createdAt);
      if (isCurMonth(d)) curr++;
      else if (isPrevMonth(d)) prev++;
    });
    return prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
  }, [users, isCurMonth, isPrevMonth]);

  const totalCreditsAvailable = useMemo(
    () => credits.reduce((sum, c) => sum + (c.availableCredits || 0), 0),
    [credits],
  );
  const totalCreditsSupply = useMemo(
    () => credits.reduce((sum, c) => sum + (c.totalCredits || 0), 0),
    [credits],
  );
  const creditUtilization =
    totalCreditsSupply > 0
      ? ((totalCreditsSupply - totalCreditsAvailable) / totalCreditsSupply) * 100
      : 0;

  const monthlyData = useMemo(() => {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const data = months.map((month) => ({ month, revenue: 0, credits: 0 }));
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      if (d.getFullYear() !== selectedYear) return;
      data[d.getMonth()].revenue += o.totalPrice || 0;
      data[d.getMonth()].credits += o.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
    });
    return data;
  }, [orders, selectedYear]);

  const orderStatusData = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const status = o.status?.toUpperCase() || 'UNKNOWN';
      map.set(status, (map.get(status) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [orders]);

  const forestUtilization = useMemo(() => {
    const map = new Map<number, { name: string; total: number; available: number }>();
    credits.forEach((c) => {
      const name = c.forest?.name || `Forest #${c.forestId}`;
      if (!map.has(c.forestId)) map.set(c.forestId, { name, total: 0, available: 0 });
      const entry = map.get(c.forestId)!;
      entry.total += c.totalCredits || 0;
      entry.available += c.availableCredits || 0;
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [credits]);

  const topForests = useMemo(() => {
    const map = new Map<number, { name: string; creditsSold: number; revenue: number }>();
    orders.forEach((o) =>
      o.items?.forEach((item) => {
        const fid = item.carbonCredit?.forestId;
        if (!fid) return;
        const forest = forests.find((f) => f.id === fid);
        if (!forest) return;
        if (!map.has(fid)) map.set(fid, { name: forest.name, creditsSold: 0, revenue: 0 });
        const entry = map.get(fid)!;
        entry.creditsSold += item.quantity || 0;
        entry.revenue += item.subtotal || 0;
      }),
    );
    return Array.from(map.values())
      .sort((a, b) => b.creditsSold - a.creditsSold)
      .slice(0, 5);
  }, [orders, forests]);

  const topUsers = useMemo(() => {
    const map = new Map<
      number,
      { email: string; name: string; totalSpent: number; orderCount: number }
    >();
    orders.forEach((o) => {
      const uid = o.user?.id;
      if (!uid) return;
      if (!map.has(uid))
        map.set(uid, {
          email: o.user!.email,
          name: `${o.user!.firstName} ${o.user!.lastName}`,
          totalSpent: 0,
          orderCount: 0,
        });
      const entry = map.get(uid)!;
      entry.totalSpent += o.totalPrice || 0;
      entry.orderCount++;
    });
    return Array.from(map.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }, [orders]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [orders],
  );

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    orders.forEach((o) => years.add(new Date(o.createdAt).getFullYear()));
    if (years.size === 0) years.add(curYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [orders, curYear]);

  const handleDownloadCSV = useCallback(() => {
    const header = [
      'Order ID',
      'Order Code',
      'User Email',
      'Date',
      'Status',
      'Total',
      'Item Certification',
      'Item Vintage',
      'Quantity',
      'Price Per Credit',
      'Subtotal',
    ];
    const rows = orders.flatMap(
      (o) =>
        o.items?.map((item) => [
          o.id,
          o.orderCode,
          o.user?.email ?? '',
          new Date(o.createdAt).toLocaleString(),
          o.status,
          o.totalPrice.toFixed(2),
          item.carbonCredit?.certification ?? '',
          item.carbonCredit?.vintage ?? '',
          item.quantity,
          item.pricePerCredit,
          item.subtotal.toFixed(2),
        ]) || [],
    );
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [orders, selectedYear]);

  const rankStyles = [
    'bg-amber-100 text-amber-700',
    'bg-gray-100 text-gray-600',
    'bg-orange-100 text-orange-700',
    'bg-gray-50 text-gray-500',
    'bg-gray-50 text-gray-500',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">
            Monitor your carbon credit platform performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                <DeltaIndicator value={revenueChange} />
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Credits Sold</p>
                <p className="text-2xl font-bold">{formatNumber(totalCreditsSold)}</p>
                <DeltaIndicator value={creditsChange} />
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                <Leaf className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold">{forests.length}</p>
                <span className="text-xs text-muted-foreground">
                  {credits.length} credit listings
                </span>
              </div>
              <div className="h-12 w-12 rounded-full bg-violet-50 flex items-center justify-center">
                <Globe className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
                <DeltaIndicator value={userGrowthChange} />
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                <Users className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Credits Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Revenue & Credits Sold</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCredits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#gRevenue)"
                  name="Revenue ($)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="credits"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#gCredits)"
                  name="Credits Sold"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Order Status + Credit Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Order Status</CardTitle>
              <button
                onClick={() => onNavigate('orders')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all &rarr;
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.length > 0 && (
                <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                  {orderStatusData.map(({ name, value }) => (
                    <div
                      key={name}
                      className={`${STATUS_BAR_COLORS[name] || 'bg-gray-400'} transition-all`}
                      style={{ width: `${(value / orders.length) * 100}%` }}
                      title={`${name}: ${value}`}
                    />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {orderStatusData.map(({ name, value }) => (
                  <div key={name} className="flex items-center gap-3 p-2 rounded-lg">
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${STATUS_BAR_COLORS[name] || 'bg-gray-400'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{name.toLowerCase()}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{value}</p>
                    <p className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                      {((value / orders.length) * 100).toFixed(0)}%
                    </p>
                  </div>
                ))}
              </div>
              {orders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Credit Utilization</CardTitle>
              <span className="text-2xl font-bold text-emerald-600 tabular-nums">
                {creditUtilization.toFixed(0)}%
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 mb-6">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Sold: {formatNumber(totalCreditsSupply - totalCreditsAvailable)}</span>
                <span>Available: {formatNumber(totalCreditsAvailable)}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                  style={{ width: `${creditUtilization}%` }}
                />
              </div>
            </div>
            <div className="space-y-3">
              {forestUtilization.map((f) => {
                const used = f.total - f.available;
                const pct = f.total > 0 ? (used / f.total) * 100 : 0;
                return (
                  <div key={f.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate mr-2">{f.name}</span>
                      <span className="text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatNumber(used)} / {formatNumber(f.total)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {forestUtilization.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No credit data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Forests + Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Top Forests by Sales</CardTitle>
              <button
                onClick={() => onNavigate('forests')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Manage &rarr;
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {topForests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {topForests.map((f, i) => (
                  <div key={f.name} className="flex items-center gap-3">
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${rankStyles[i] || rankStyles[4]}`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(f.revenue)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600 tabular-nums">
                        {formatNumber(f.creditsSold)}
                      </p>
                      <p className="text-xs text-muted-foreground">credits</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Top Buyers</CardTitle>
              <button
                onClick={() => onNavigate('users')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Manage &rarr;
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {topUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No user data yet</p>
            ) : (
              <div className="space-y-3">
                {topUsers.map((u, i) => (
                  <div key={u.email} className="flex items-center gap-3">
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${rankStyles[i] || rankStyles[4]}`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-600 tabular-nums">
                        {formatCurrency(u.totalSpent)}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.orderCount} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Orders</CardTitle>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all &rarr;
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="text-left pb-3 pl-6 font-medium">Order</th>
                    <th className="text-left pb-3 font-medium">Customer</th>
                    <th className="text-left pb-3 font-medium">Status</th>
                    <th className="text-left pb-3 font-medium">Date</th>
                    <th className="text-right pb-3 pr-6 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const statusKey = order.status?.toUpperCase() || '';
                    return (
                      <tr
                        key={order.id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 pl-6 text-sm font-medium">
                          #{order.orderCode || order.id}
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {order.user?.email || '-'}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[statusKey] || 'bg-gray-50 text-gray-700 border-gray-200'}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-6 text-sm font-medium text-right tabular-nums">
                          $
                          {order.totalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
