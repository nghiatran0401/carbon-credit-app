"use client";
import { useState } from "react";
import { useAuth } from "@/components/auth-context";
import { useRouter } from "next/navigation";
import ForestsAdmin from "@/app/admin/ForestsAdmin";
import CreditsAdmin from "@/app/admin/CreditsAdmin";
import OrdersAdmin from "@/app/admin/OrdersAdmin";
import UsersAdmin from "@/app/admin/UsersAdmin";

const SECTIONS = [
  { key: "forests", label: "Forests" },
  { key: "credits", label: "Credits" },
  { key: "orders", label: "Orders" },
  { key: "users", label: "Users" },
];

export default function AdminPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState("forests");

  // Simple admin check (customize as needed)
  if (!isAuthenticated) {
    router.replace("/auth");
    return null;
  }

  // TODO: implement later
  // if (!user?.isAdmin) {
  //   return <div className="p-8 text-center text-red-600">Access denied. Admins only.</div>;
  // }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r p-6 flex flex-col gap-4">
        <h2 className="text-xl font-bold mb-4">Admin Panel</h2>
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            className={`text-left px-3 py-2 rounded font-medium transition-colors ${section === s.key ? "bg-green-100 text-green-700" : "hover:bg-gray-100 text-gray-700"}`}
            onClick={() => setSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </aside>
      {/* Main content */}
      <main className="flex-1 p-8">
        {section === "forests" && <ForestsAdmin />}
        {section === "credits" && <CreditsAdmin />}
        {section === "orders" && <OrdersAdmin />}
        {section === "users" && <UsersAdmin />}
      </main>
    </div>
  );
}
