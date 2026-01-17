"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth-context";
import { useRouter } from "next/navigation";
import ForestsAdmin from "@/app/admin/ForestsAdmin";
import CreditsAdmin from "@/app/admin/CreditsAdmin";
import OrdersAdmin from "@/app/admin/OrdersAdmin";
import UsersAdmin from "@/app/admin/UsersAdmin";
import useSWR from "swr";
import { apiGet } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, Leaf, DollarSign, Users, Globe, Download } from "lucide-react";
import dynamic from "next/dynamic";
import { BarChart, Bar } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Order, CarbonCredit, Forest, User, MonthlySalesData, TopForestData, TopUserData } from "@/types";

const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });

const SECTIONS = [
  { key: "forests", label: "Forests" },
  { key: "credits", label: "Credits" },
  { key: "orders", label: "Orders" },
  { key: "users", label: "Users" },
];

function ordersToCSV(orders: Order[]): string {
  const header = ["Order ID", "User Email", "Date", "Status", "Total", "Item Certification", "Item Vintage", "Quantity", "Price Per Credit", "Subtotal"];
  const rows = orders.flatMap(
    (order) =>
      order.items?.map((item) => [
        order.id,
        order.user?.email ?? "",
        new Date(order.createdAt).toLocaleString(),
        order.status,
        order.totalPrice.toFixed(2),
        item.carbonCredit?.certification ?? "",
        item.carbonCredit?.vintage ?? "",
        item.quantity,
        item.pricePerCredit,
        item.subtotal.toFixed(2),
      ]) || []
  );
  return [header, ...rows].map((row) => row.join(",")).join("\n");
}

export default function AdminPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState("forests");
  const [showForestModal, setShowForestModal] = useState<Forest | null>(null);
  const [showUserModal, setShowUserModal] = useState<User | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [isClient, setIsClient] = useState(false);

  // Fetch all data for analytics - these hooks must be called before any conditional returns
  const { data: ordersRaw } = useSWR("/api/orders", apiGet);
  const { data: creditsRaw } = useSWR("/api/credits", apiGet);
  const { data: forestsRaw } = useSWR("/api/forests", apiGet);
  const { data: usersRaw } = useSWR("/api/users", apiGet);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Process data
  const orders: Order[] = Array.isArray(ordersRaw) ? ordersRaw : [];
  const credits: CarbonCredit[] = Array.isArray(creditsRaw) ? creditsRaw : [];
  const forests: Forest[] = Array.isArray(forestsRaw) ? forestsRaw : [];
  const users: User[] = Array.isArray(usersRaw) ? usersRaw : [];

  // ALL useMemo hooks must be called before any conditional returns
  const totalCreditsSold = useMemo(() => {
    return orders.reduce((sum, order) => sum + (order.items?.reduce((s, item) => s + (item.quantity || 0), 0) || 0), 0);
  }, [orders]);

  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
  }, [orders]);

  const activeProjects = useMemo(() => forests.length, [forests]);
  const totalCredits = useMemo(() => credits.reduce((sum, c) => sum + (c.totalCredits || 0), 0), [credits]);
  const availableCredits = useMemo(() => credits.reduce((sum, c) => sum + (c.availableCredits || 0), 0), [credits]);
  const partnersCount = useMemo(() => users.length, [users]);

  // Monthly sales data for chart (filtered by year)
  const monthlyBarData = useMemo(() => {
    const map = new Map<number, MonthlySalesData>();
    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      if (date.getFullYear() !== selectedYear) return;
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const label = `${month}`;
      const monthNum = date.getMonth() + 1;
      if (!map.has(monthNum)) {
        map.set(monthNum, { month: label, credits: 0, revenue: 0 });
      }
      const entry = map.get(monthNum)!;
      entry.credits += order.items?.reduce((s, item) => s + (item.quantity || 0), 0) || 0;
      entry.revenue += order.totalPrice || 0;
    });
    // Ensure all months are present
    for (let m = 1; m <= 12; m++) {
      if (!map.has(m)) {
        map.set(m, { month: String(m).padStart(2, "0"), credits: 0, revenue: 0 });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [orders, selectedYear]);

  // Top forests by credits sold
  const topForests = useMemo(() => {
    const map = new Map<number, TopForestData>();
    orders.forEach((order) => {
      order.items?.forEach((item) => {
        const forestId = item.carbonCredit?.forestId;
        if (!forestId) return;
        if (!map.has(forestId)) {
          const forest = forests.find((f) => f.id === forestId);
          if (forest) {
            map.set(forestId, { forest, creditsSold: 0 });
          }
        }
        const entry = map.get(forestId);
        if (entry) {
          entry.creditsSold += item.quantity || 0;
        }
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.creditsSold - a.creditsSold)
      .slice(0, 5);
  }, [orders, forests]);

  // Top users by order value
  const topUsers = useMemo(() => {
    const map = new Map<number, TopUserData>();
    orders.forEach((order) => {
      const userId = order.user?.id;
      if (!userId) return;
      if (!map.has(userId)) {
        const u = users.find((u) => u.id === userId);
        if (u) {
          map.set(userId, { user: u, total: 0 });
        }
      }
      const entry = map.get(userId);
      if (entry) {
        entry.total += order.totalPrice || 0;
      }
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [orders, users]);

  // Export CSV function
  const handleDownloadCSV = useCallback(() => {
    if (typeof window === "undefined") return; // Server-side guard

    try {
      const csv = ordersToCSV(orders);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "orders.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading CSV:", error);
    }
  }, [orders]);

  // Auth check - after ALL hooks are called
  if (!isClient) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    router.replace("/auth");
    return null;
  }

  // Check for both uppercase (from Prisma enum) and lowercase (from API)
  if (user?.role?.toLowerCase() !== "admin") {
    return <div className="p-8 text-center text-red-600">Access denied. Admins only.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      {/* Sidebar */}
      <aside className="w-full lg:w-56 bg-white border-b lg:border-r lg:border-b-0 p-4 lg:p-6 flex flex-col gap-4">
        <h2 className="text-xl font-bold mb-4">Admin Panel</h2>
        <div className="mb-6 grid grid-cols-2 lg:grid-cols-1 gap-2">
          <Card className="mb-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Credits Sold</CardTitle>
              <Leaf className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{totalCreditsSold.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="mb-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">${totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="mb-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Globe className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{activeProjects}</div>
            </CardContent>
          </Card>
          <Card className="mb-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{totalCredits.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Available: {availableCredits.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="mb-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{partnersCount}</div>
            </CardContent>
          </Card>
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 p-4 lg:p-8">
        {/* Enhanced Analytics Dashboard */}
        <div className="mb-8">
          <Card className="mb-6">
            <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <CardTitle>Monthly Sales</CardTitle>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" /> Export Orders CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-80 bg-white rounded-lg flex items-center justify-center">
                {monthlyBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyBarData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" label={{ value: "Credits", angle: -90, position: "insideLeft" }} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: "Revenue", angle: 90, position: "insideRight" }} />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="credits" fill="#22c55e" name="Credits" />
                      <Bar yAxisId="right" dataKey="revenue" fill="#0ea5e9" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-500">No sales data available.</div>
                )}
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Forests by Credits Sold</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topForests.map(({ forest, creditsSold }) => (
                    <div key={forest.id} className="flex items-center justify-between p-2 border rounded-lg cursor-pointer hover:bg-green-50" onClick={() => setShowForestModal(forest)}>
                      <span className="font-medium">{forest.name}</span>
                      <span className="text-green-700 font-bold">{creditsSold.toLocaleString()} credits</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Users by Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topUsers.map(({ user, total }) => (
                    <div key={user.id} className="flex items-center justify-between p-2 border rounded-lg cursor-pointer hover:bg-blue-50" onClick={() => setShowUserModal(user)}>
                      <span className="font-medium">{user.email}</span>
                      <span className="text-blue-700 font-bold">${total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Drill-down modals (simple) */}
        {showForestModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={() => setShowForestModal(null)}>
                &times;
              </button>
              <h2 className="text-xl font-bold mb-2">{showForestModal.name}</h2>
              <div className="mb-2 text-sm text-gray-600">{showForestModal.location}</div>
              <div className="mb-2">
                Type: <span className="font-medium">{showForestModal.type}</span>
              </div>
              <div className="mb-2">
                Area: <span className="font-medium">{showForestModal.area} ha</span>
              </div>
              <div className="mb-2">
                Status: <span className="font-medium">{showForestModal.status}</span>
              </div>
              <div className="mb-2">
                Last Updated: <span className="font-medium">{typeof window !== "undefined" ? new Date(showForestModal.lastUpdated).toLocaleDateString() : showForestModal.lastUpdated}</span>
              </div>
              <div className="mb-2">
                Description: <span className="font-medium">{showForestModal.description}</span>
              </div>
            </div>
          </div>
        )}
        {showUserModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={() => setShowUserModal(null)}>
                &times;
              </button>
              <h2 className="text-xl font-bold mb-2">{showUserModal.email}</h2>
              <div className="mb-2">
                Name:{" "}
                <span className="font-medium">
                  {showUserModal.firstName} {showUserModal.lastName}
                </span>
              </div>
              <div className="mb-2">
                Role: <span className="font-medium">{showUserModal.role}</span>
              </div>
              <div className="mb-2">
                Company: <span className="font-medium">{showUserModal.company || "-"}</span>
              </div>
              <div className="mb-2">
                Created: <span className="font-medium">{typeof window !== "undefined" ? new Date(showUserModal.createdAt).toLocaleDateString() : showUserModal.createdAt}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs/sections */}
        <h2 className="text-2xl font-bold mb-4 text-green-700">Admin to manage data below</h2>
        <Tabs defaultValue={section} value={section} onValueChange={setSection} className="space-y-6">
          <TabsList>
            {SECTIONS.map((s) => (
              <TabsTrigger key={s.key} value={s.key}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="forests">
            <ForestsAdmin />
          </TabsContent>
          <TabsContent value="credits">
            <CreditsAdmin />
          </TabsContent>
          <TabsContent value="orders">
            <OrdersAdmin />
          </TabsContent>
          <TabsContent value="users">
            <UsersAdmin />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
