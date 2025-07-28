"use client";
import useSWR from "swr";
import { useState } from "react";
import { apiGet, apiPut, apiDelete } from "@/lib/api";
import type { Order, OrderItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function OrdersAdmin() {
  const fetcher = (url: string) => apiGet<Order[]>(url);
  const { data: orders, error, isLoading, mutate } = useSWR("/api/orders", fetcher);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const { toast } = useToast();

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error.message}</div>;
  if (!orders?.length) return <div className="p-8 text-center">No orders available.</div>;

  const totalOrders = orders.length;
  const totalValue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;

  const handleSelect = (id: number) => {
    setSelectedOrders((prev) => (prev.includes(id) ? prev.filter((oid) => oid !== id) : [...prev, id]));
  };

  const openOrderModal = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
  };

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    setStatusUpdateLoading(true);
    try {
      await apiPut("/api/orders", { id: orderId, status: newStatus });
      toast({ title: "Status Updated", description: `Order status updated to ${newStatus}`, variant: "default" });
      mutate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      console.error("Status update error:", err);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return;
    }
    try {
      await apiDelete("/api/orders", { id });
      toast({ title: "Order Deleted", description: "Order was deleted successfully.", variant: "default" });
      mutate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      console.error("Order delete error:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedOrders.length} selected orders? This cannot be undone.`)) return;

    try {
      for (const id of selectedOrders) {
        await apiDelete("/api/orders", { id });
      }
      setSelectedOrders([]);
      toast({ title: "Bulk Delete", description: `${selectedOrders.length} orders were deleted successfully.`, variant: "default" });
      mutate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      console.error("Bulk delete error:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      completed: "default",
      cancelled: "destructive",
      failed: "destructive",
      processing: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-700 space-x-4">
          <span>
            Total Orders: <b>{totalOrders}</b>
          </span>
          <span>
            Total Value: <b>${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>
          </span>
          <span>
            Pending: <b>{pendingOrders}</b>
          </span>
          <span>
            Completed: <b>{completedOrders}</b>
          </span>
        </div>
        <Button variant="destructive" onClick={handleBulkDelete} disabled={selectedOrders.length === 0}>
          Delete Selected ({selectedOrders.length})
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
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td>
                  <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleSelect(order.id)} />
                </td>
                <td>{order.id}</td>
                <td>{order.user?.email || order.userId}</td>
                <td>{getStatusBadge(order.status)}</td>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
                <td>${order.totalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td>
                  <Button size="sm" variant="outline" onClick={() => openOrderModal(order)} className="mr-1">
                    View
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(order.id)} disabled={statusUpdateLoading}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Dialog open={showOrderModal} onOpenChange={closeOrderModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - #{selectedOrder.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Order Information</h3>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Order ID:</strong> {selectedOrder.id}
                    </div>
                    <div>
                      <strong>Status:</strong> {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div>
                      <strong>Created:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}
                    </div>
                    <div>
                      <strong>Total Price:</strong> ${selectedOrder.totalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    {selectedOrder.paidAt && (
                      <div>
                        <strong>Paid At:</strong> {new Date(selectedOrder.paidAt).toLocaleString()}
                      </div>
                    )}
                    {selectedOrder.failureReason && (
                      <div>
                        <strong>Failure Reason:</strong> <span className="text-red-600">{selectedOrder.failureReason}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Email:</strong> {selectedOrder.user?.email}
                    </div>
                    <div>
                      <strong>Name:</strong> {selectedOrder.user?.firstName} {selectedOrder.user?.lastName}
                    </div>
                    <div>
                      <strong>Company:</strong> {selectedOrder.user?.company || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <h3 className="font-semibold mb-2">Update Status</h3>
                <div className="flex gap-2">
                  {["pending", "processing", "completed", "cancelled", "failed"].map((status) => (
                    <Button key={status} size="sm" variant={selectedOrder.status === status ? "default" : "outline"} onClick={() => handleStatusUpdate(selectedOrder.id, status)} disabled={statusUpdateLoading}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2">Forest</th>
                        <th className="text-left p-2">Certification</th>
                        <th className="text-left p-2">Vintage</th>
                        <th className="text-right p-2">Quantity</th>
                        <th className="text-right p-2">Price/Credit</th>
                        <th className="text-right p-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-2">{item.carbonCredit?.forest?.name || "Unknown Forest"}</td>
                          <td className="p-2">{item.carbonCredit?.certification}</td>
                          <td className="p-2">{item.carbonCredit?.vintage}</td>
                          <td className="p-2 text-right">{item.quantity.toLocaleString()}</td>
                          <td className="p-2 text-right">${item.pricePerCredit.toFixed(2)}</td>
                          <td className="p-2 text-right">${item.subtotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment History */}
              {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Payment History</h3>
                  <div className="space-y-2">
                    {selectedOrder.payments.map((payment) => (
                      <div key={payment.id} className="border rounded p-3 text-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <strong>Payment #{payment.id}</strong> - {getStatusBadge(payment.status)}
                          </div>
                          <div>
                            ${payment.amount.toFixed(2)} {payment.currency}
                          </div>
                        </div>
                        <div className="text-gray-600 mt-1">
                          {payment.method && <span>Method: {payment.method}</span>}
                          {payment.failureReason && <span className="text-red-600 ml-2">Reason: {payment.failureReason}</span>}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">{new Date(payment.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order History */}
              {selectedOrder.orderHistory && selectedOrder.orderHistory.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Order History</h3>
                  <div className="space-y-2">
                    {selectedOrder.orderHistory.map((history) => (
                      <div key={history.id} className="border rounded p-3 text-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <strong>{history.event}</strong>
                          </div>
                          <div className="text-gray-500 text-xs">{new Date(history.createdAt).toLocaleString()}</div>
                        </div>
                        {history.message && <div className="text-gray-600 mt-1">{history.message}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
