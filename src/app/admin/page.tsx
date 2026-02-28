'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/components/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardOverview from '@/app/admin/DashboardOverview';
import ForestsAdmin from '@/app/admin/ForestsAdmin';
import CreditsAdmin from '@/app/admin/CreditsAdmin';
import OrdersAdmin from '@/app/admin/OrdersAdmin';
import UsersAdmin from '@/app/admin/UsersAdmin';
import useSWR from 'swr';
import { apiGet } from '@/lib/api';
import {
  LayoutDashboard,
  TreePine,
  Coins,
  ShoppingCart,
  Users,
  ChevronLeft,
  ChevronRight,
  ShieldX,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
import type { Order, CarbonCredit, Forest, User } from '@/types';

const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'forests', label: 'Forests', icon: TreePine },
  { key: 'credits', label: 'Credits', icon: Coins },
  { key: 'orders', label: 'Orders', icon: ShoppingCart },
  { key: 'users', label: 'Users', icon: Users },
] as const;

const ADMIN_TOOL_LINKS = [
  { href: '/carbon-movement', label: 'Carbon Movement', icon: GitBranch },
  { href: '/order-audit', label: 'Order Audit Trail', icon: ShieldCheck },
] as const;

type SectionKey = (typeof NAV_ITEMS)[number]['key'];

export default function AdminPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<SectionKey>('overview');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isClient, setIsClient] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: ordersRaw } = useSWR('/api/orders', apiGet);
  const { data: creditsRaw } = useSWR('/api/credits', apiGet);
  const { data: forestsRaw } = useSWR('/api/forests', apiGet);
  const { data: usersRaw } = useSWR('/api/users', apiGet);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const orders = useMemo((): Order[] => (Array.isArray(ordersRaw) ? ordersRaw : []), [ordersRaw]);
  const credits = useMemo(
    (): CarbonCredit[] => (Array.isArray(creditsRaw) ? creditsRaw : []),
    [creditsRaw],
  );
  const forests = useMemo(
    (): Forest[] => (Array.isArray(forestsRaw) ? forestsRaw : []),
    [forestsRaw],
  );
  const users = useMemo((): User[] => (Array.isArray(usersRaw) ? usersRaw : []), [usersRaw]);

  const sectionCounts: Partial<Record<SectionKey, number>> = {
    forests: forests.length,
    credits: credits.length,
    orders: orders.length,
    users: users.length,
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace('/auth');
    return null;
  }

  if (user?.role?.toLowerCase() !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <ShieldX className="h-16 w-16 text-red-300 mx-auto" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Mobile navigation */}
      <div className="lg:hidden border-b bg-white px-4 py-3 sticky top-0 z-30">
        <div className="flex gap-1 overflow-x-auto pb-1 -mb-1 scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0
                  ${active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {sectionCounts[item.key] !== undefined && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {sectionCounts[item.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
          {ADMIN_TOOL_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0 bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Desktop sidebar */}
        <aside
          className={`hidden lg:flex flex-col border-r bg-white shrink-0 transition-all duration-200 ${sidebarCollapsed ? 'w-[68px]' : 'w-60'}`}
        >
          <div className={`p-4 border-b ${sidebarCollapsed ? 'px-3' : ''}`}>
            {sidebarCollapsed ? (
              <div className="flex justify-center">
                <LayoutDashboard className="h-5 w-5 text-emerald-600" />
              </div>
            ) : (
              <div>
                <h2 className="font-bold text-lg tracking-tight">Admin</h2>
                <p className="text-xs text-muted-foreground">Carbon Credit Platform</p>
              </div>
            )}
          </div>

          <nav className="flex-1 p-2 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = section === item.key;
              const count = sectionCounts[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                    ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-emerald-600' : ''}`} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {count !== undefined && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="px-2 pb-2 border-t">
            {!sidebarCollapsed && (
              <p className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-wider text-gray-400">
                Admin Tools
              </p>
            )}
            <div className="space-y-0.5">
              {ADMIN_TOOL_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={sidebarCollapsed ? link.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-blue-600 hover:bg-blue-50 hover:text-blue-700 ${
                      sidebarCollapsed ? 'justify-center px-2' : ''
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!sidebarCollapsed && <span className="flex-1 text-left">{link.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="p-2 border-t">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-8 min-w-0">
          {section === 'overview' && (
            <DashboardOverview
              orders={orders}
              credits={credits}
              forests={forests}
              users={users}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              onNavigate={(s) => setSection(s as SectionKey)}
            />
          )}
          {section === 'forests' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Forest Management</h1>
                <p className="text-sm text-muted-foreground">
                  Add, edit, and manage forest conservation projects
                </p>
              </div>
              <ForestsAdmin />
            </div>
          )}
          {section === 'credits' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Credit Management</h1>
                <p className="text-sm text-muted-foreground">
                  Manage carbon credit listings, pricing, and availability
                </p>
              </div>
              <CreditsAdmin />
            </div>
          )}
          {section === 'orders' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Order Management</h1>
                <p className="text-sm text-muted-foreground">
                  Track, update, and manage customer orders
                </p>
              </div>
              <OrdersAdmin />
            </div>
          )}
          {section === 'users' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                <p className="text-sm text-muted-foreground">
                  Manage user accounts, roles, and permissions
                </p>
              </div>
              <UsersAdmin />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
