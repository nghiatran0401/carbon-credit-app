"use client";
import useSWR from "swr";
import { useState } from "react";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function UsersAdmin() {
  const fetcher = (url: string) => apiGet<any[]>(url);
  const { data: users, error, isLoading } = useSWR("/api/users", fetcher);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error.message}</div>;
  if (!users?.length) return <div className="p-8 text-center">No users found.</div>;

  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.isAdmin).length;

  const handleSelect = (id: number) => {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]));
  };

  const handleBulkDeactivate = async () => {
    if (!window.confirm("Deactivate selected users?")) return;
    // Placeholder: implement API call to deactivate users
    setSelectedUsers([]);
    // mutate(); // Uncomment if you add mutation
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-700">
          Total Users: <b>{totalUsers}</b> | Admins: <b>{totalAdmins}</b>
        </div>
        <Button variant="destructive" onClick={handleBulkDeactivate} disabled={selectedUsers.length === 0}>
          Deactivate Selected
        </Button>
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
              <th>Admin</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b">
                <td>
                  <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => handleSelect(user.id)} />
                </td>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>
                  {user.firstName} {user.lastName}
                </td>
                <td>{user.company || "-"}</td>
                <td>{user.isAdmin ? "Yes" : "No"}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
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
      <div className="mt-8 text-gray-400 text-xs">[User role management/edit coming soon]</div>
    </div>
  );
}
