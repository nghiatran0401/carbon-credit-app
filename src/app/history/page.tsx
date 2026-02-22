'use client';
import { useAuth } from '@/components/auth-context';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { apiGet } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileText, Package } from 'lucide-react';
import Link from 'next/link';
import type { Order, OrderItem, User } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

function ordersToCSV(orders: Order[]): string {
  const header = [
    'Order ID',
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
    (order) =>
      order.items?.map((item: OrderItem) => [
        order.id,
        order.user?.email ?? '',
        new Date(order.createdAt).toLocaleString(),
        order.status,
        order.totalPrice.toFixed(2),
        item.carbonCredit?.certification ?? '',
        item.carbonCredit?.vintage ?? '',
        item.quantity,
        item.pricePerCredit,
        item.subtotal.toFixed(2),
      ]) || [],
  );
  return [header, ...rows].map((row) => row.join(',')).join('\n');
}

export default function HistoryPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const { data: usersRaw } = useSWR(
    user?.role?.toLowerCase() === 'admin' ? '/api/users' : null,
    apiGet,
  );
  const users = Array.isArray(usersRaw) ? usersRaw : [];
  const [selectedUser, setSelectedUser] = useState<string>('all');

  // For admin: fetch all orders, for user: fetch only their orders
  const ordersUrl =
    user?.role?.toLowerCase() === 'admin'
      ? '/api/orders'
      : user?.id
        ? `/api/orders?userId=${user.id}`
        : null;
  const { data: ordersRaw, isLoading, error, mutate } = useSWR(ordersUrl, apiGet);
  const orders = useMemo(() => (Array.isArray(ordersRaw) ? ordersRaw : []), [ordersRaw]);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, router]);

  // For admin: filter by selected user
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (user?.role?.toLowerCase() === 'admin' && selectedUser !== 'all') {
      filtered = filtered.filter((order: Order) => String(order.user?.id) === selectedUser);
    }
    return filtered.filter((order: Order) => {
      const statusMatch = statusFilter === 'all' || order.status === statusFilter;
      const searchMatch =
        search === '' ||
        order.id.toString().includes(search) ||
        order.items?.some(
          (item: OrderItem) =>
            item.carbonCredit?.certification?.toLowerCase().includes(search.toLowerCase()) ||
            item.carbonCredit?.vintage?.toString().includes(search),
        );
      return statusMatch && searchMatch;
    });
  }, [orders, statusFilter, search, user, selectedUser]);

  const totalPages = Math.ceil(filteredOrders.length / DEFAULT_PAGE_SIZE);
  const paginatedOrders = filteredOrders.slice(
    (page - 1) * DEFAULT_PAGE_SIZE,
    page * DEFAULT_PAGE_SIZE,
  );

  const handleDownloadCSV = () => {
    const csv = ordersToCSV(filteredOrders);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'order-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return <div className="p-8 text-center">Redirecting to sign in...</div>;
  }
  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-emerald-200 border-t-emerald-600" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  if (error) return <div className="p-8 text-center text-red-600">{error.message}</div>;

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold">History</h1>
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <Input
            placeholder="Search by order, certification, vintage..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            // className="max-w-xs"
          />
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-80" aria-label="Filter by order status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {user?.role?.toLowerCase() === 'admin' && (
            <Select
              value={selectedUser}
              onValueChange={(val) => {
                setSelectedUser(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48" aria-label="Filter by user">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((u: User) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {user?.role?.toLowerCase() === 'admin' && (
            <Button
              variant="outline"
              onClick={handleDownloadCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Download CSV
            </Button>
          )}
        </div>
      </div>
      {paginatedOrders.length > 0 ? (
        <div className="space-y-4">
          {paginatedOrders.map((order: Order) => (
            <Card key={order.id} className="shadow-md border border-gray-200">
              <CardHeader className="bg-gray-50 rounded-t-lg flex flex-col md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-lg">
                  Order #{order.id}{' '}
                  <span className="text-xs font-normal text-gray-500 ml-2">({order.status})</span>
                </CardTitle>
                <div className="text-sm text-gray-500 mt-1 md:mt-0">
                  Placed: {new Date(order.createdAt).toLocaleString()}
                  <br />
                  {user?.role?.toLowerCase() === 'admin' && <span>User: {order.user?.email}</span>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {order.items?.map((item: OrderItem) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="font-medium">
                        {item.carbonCredit?.certification} ({item.carbonCredit?.vintage})
                      </span>
                      <span>
                        {item.quantity} × ${item.pricePerCredit} ={' '}
                        <span className="font-semibold">${item.subtotal.toFixed(2)}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <Separator className="my-2" />
                <div className="font-bold text-right">Total: ${order.totalPrice.toFixed(2)}</div>
                {/* Payment status and details */}
                {order.payments && order.payments.length > 0 && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Payment Status:</span>{' '}
                    {order.payments[order.payments.length - 1].status}
                    {order.payments[order.payments.length - 1].status === 'failed' &&
                      order.payments[order.payments.length - 1].failureReason && (
                        <span className="ml-2 text-red-600">
                          ({order.payments[order.payments.length - 1].failureReason})
                        </span>
                      )}
                    {order.paidAt && (
                      <span className="ml-4 text-green-700">
                        Paid at: {new Date(order.paidAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}

                {/* Certificate button for completed orders */}
                {order.status === 'Completed' && (
                  <div className="mt-3 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-700 border-green-300 hover:bg-green-50"
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/certificates?orderId=${order.id}`);
                          if (response.ok) {
                            const certificate = await response.json();
                            // Open certificate in new window
                            window.open(`/certificates/${certificate.id}`, '_blank');
                          } else {
                            // Generate certificate if it doesn't exist
                            const genResponse = await fetch('/api/certificates', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ orderId: order.id }),
                            });
                            if (genResponse.ok) {
                              const certificate = await genResponse.json();
                              window.open(`/certificates/${certificate.id}`, '_blank');
                            }
                          }
                        } catch (err) {
                          console.error('Error accessing certificate:', err);
                        }
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Certificate
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm">
            You haven&apos;t placed any orders. When you purchase carbon credits from the
            marketplace, they will appear here.
          </p>
          <Link href="/marketplace">
            <Button className="bg-emerald-600 hover:bg-emerald-700">Browse Marketplace</Button>
          </Link>
        </div>
      )}
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="px-2 py-1 text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
