"use client";
import useSWR from "swr";
import { useState } from "react";
import { apiGet, apiPut } from "@/lib/api";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface UserForm {
  id: number;
  role: string;
  emailVerified: boolean;
}

export default function UsersAdmin() {
  const fetcher = (url: string) => apiGet<User[]>(url);
  const { data: users, error, isLoading, mutate } = useSWR("/api/users", fetcher);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState<UserForm>({ id: 0, role: "", emailVerified: false });
  const [formLoading, setFormLoading] = useState(false);
  const { toast } = useToast();

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error.message}</div>;
  if (!users?.length) return <div className="p-8 text-center">No users found.</div>;

  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role?.toLowerCase() === "admin").length;
  const verifiedUsers = users.filter((u) => u.emailVerified).length;

  const handleSelect = (id: number) => {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]));
  };

  const openUserModal = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
  };

  const openEditModal = (user: User) => {
    setForm({
      id: user.id,
      role: user.role,
      emailVerified: user.emailVerified,
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      await apiPut("/api/users", form);
      toast({ title: "User Updated", description: "User was updated successfully.", variant: "default" });
      setShowEditModal(false);
      mutate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      console.error("User update error:", err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleBulkRoleUpdate = async (newRole: string) => {
    if (!window.confirm(`Update ${selectedUsers.length} selected users to role "${newRole}"?`)) return;

    try {
      for (const id of selectedUsers) {
        await apiPut("/api/users", { id, role: newRole });
      }
      setSelectedUsers([]);
      toast({ title: "Bulk Update", description: `${selectedUsers.length} users were updated to ${newRole} role.`, variant: "default" });
      mutate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      console.error("Bulk role update error:", err);
    }
  };

  const getRoleBadge = (role: string) => {
    return role?.toLowerCase() === "admin" ? <Badge variant="default">Admin</Badge> : <Badge variant="secondary">User</Badge>;
  };

  const getVerificationBadge = (verified: boolean) => {
    return verified ? <Badge variant="default">Verified</Badge> : <Badge variant="outline">Unverified</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-700 space-x-4">
          <span>
            Total Users: <b>{totalUsers}</b>
          </span>
          <span>
            Admins: <b>{totalAdmins}</b>
          </span>
          <span>
            Verified: <b>{verifiedUsers}</b>
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleBulkRoleUpdate("user")} disabled={selectedUsers.length === 0}>
            Make Users ({selectedUsers.length})
          </Button>
          <Button variant="outline" onClick={() => handleBulkRoleUpdate("admin")} disabled={selectedUsers.length === 0}>
            Make Admins ({selectedUsers.length})
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th></th>
              <th>ID</th>
              <th>Email</th>
              <th>Name</th>
              <th>Company</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td>
                  <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => handleSelect(user.id)} />
                </td>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>
                  {user.firstName} {user.lastName}
                </td>
                <td>{user.company || "-"}</td>
                <td>{getRoleBadge(user.role)}</td>
                <td>{getVerificationBadge(user.emailVerified)}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <Button size="sm" variant="outline" onClick={() => openUserModal(user)} className="mr-1">
                    View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEditModal(user)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <Dialog open={showUserModal} onOpenChange={closeUserModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details - {selectedUser.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">User Information</h3>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>ID:</strong> {selectedUser.id}
                    </div>
                    <div>
                      <strong>Email:</strong> {selectedUser.email}
                    </div>
                    <div>
                      <strong>Name:</strong> {selectedUser.firstName} {selectedUser.lastName}
                    </div>
                    <div>
                      <strong>Company:</strong> {selectedUser.company || "N/A"}
                    </div>
                    <div>
                      <strong>Role:</strong> {getRoleBadge(selectedUser.role)}
                    </div>
                    <div>
                      <strong>Email Verified:</strong> {getVerificationBadge(selectedUser.emailVerified)}
                    </div>
                    <div>
                      <strong>Created:</strong> {new Date(selectedUser.createdAt).toLocaleString()}
                    </div>
                    <div>
                      <strong>Last Updated:</strong> {new Date(selectedUser.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Account Statistics</h3>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Total Orders:</strong> {selectedUser.orders?.length || 0}
                    </div>
                    <div>
                      <strong>Account Age:</strong> {Math.floor((Date.now() - new Date(selectedUser.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                    </div>
                  </div>
                </div>
              </div>

              {selectedUser.orders && selectedUser.orders.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Recent Orders</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedUser.orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="border rounded p-2 text-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <strong>Order #{order.id}</strong> - {getRoleBadge(order.status)}
                          </div>
                          <div>${order.totalPrice.toFixed(2)}</div>
                        </div>
                        <div className="text-gray-500 text-xs">{new Date(order.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={closeEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-1">
                Role
              </label>
              <select id="role" name="role" value={form.role} onChange={handleFormChange} required className="w-full border rounded p-2">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="emailVerified" name="emailVerified" checked={form.emailVerified} onChange={handleFormChange} className="rounded" />
              <label htmlFor="emailVerified" className="text-sm font-medium">
                Email Verified
              </label>
            </div>
            <Button type="submit" disabled={formLoading} className="w-full">
              {formLoading ? "Updating..." : "Update User"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
