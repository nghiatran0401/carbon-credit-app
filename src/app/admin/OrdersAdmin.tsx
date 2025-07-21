"use client";
import useSWR from "swr";
import { useState } from "react";
import { apiGet, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function OrdersAdmin() {
  const fetcher = (url: string) => apiGet<any[]>(url);
  const { data: orders, error, isLoading, mutate } = useSWR("/api/orders", fetcher);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error.message}</div>;
  if (!orders?.length) return <div className="p-8 text-center">No orders available.</div>;

  const totalOrders = orders.length;
  const totalValue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  const handleSelect = (id: number) => {
    setSelectedOrders((prev) => (prev.includes(id) ? prev.filter((oid) => oid !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (!window.confirm("Delete selected orders? This cannot be undone.")) return;
    for (const id of selectedOrders) {
      await apiDelete("/api/orders", { id });
    }
    setSelectedOrders([]);
    mutate();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-700">
          Total Orders: <b>{totalOrders}</b> | Total Value: <b>${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>
        </div>
        <Button variant="destructive" onClick={handleBulkDelete} disabled={selectedOrders.length === 0}>
          Delete Selected
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th></th>
              <th>ID</th>
              <th>User</th>
              <th>Status</th>
              <th>Created</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b">
                <td>
                  <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleSelect(order.id)} />
                </td>
                <td>{order.id}</td>
                <td>{order.user?.email || order.userId}</td>
                <td>{order.status}</td>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
                <td>${order.totalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td>
                  <Button size="sm" variant="outline" disabled>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" disabled>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8 text-gray-400 text-xs">[Order status update/edit coming soon]</div>
    </div>
  );
}
