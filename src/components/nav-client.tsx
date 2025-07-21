"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import { MobileNav } from "@/components/mobile-nav";

export function DesktopNav() {
  const { isAuthenticated, user, logout } = useAuth();
  return (
    <div className="hidden md:flex items-center space-x-6">
      <Link href="/dashboard" className="text-gray-600 hover:text-green-600">
        Dashboard
      </Link>
      <Link href="/marketplace" className="text-gray-600 hover:text-green-600">
        Marketplace
      </Link>
      <Link href="/analytics" className="text-gray-600 hover:text-green-600">
        Analytics
      </Link>
      <Link href="/history" className="text-gray-600 hover:text-green-600">
        History
      </Link>
      {isAuthenticated && user?.role === "admin" && (
        <Link href="/admin" className="text-gray-600 hover:text-green-600">
          Admin
        </Link>
      )}
      {isAuthenticated ? (
        <button
          onClick={() => {
            logout();
            window.location.href = "/";
          }}
          className="text-gray-600 hover:text-red-600 border border-gray-300 rounded px-3 py-1 ml-2"
        >
          Logout
        </button>
      ) : (
        <Link href="/auth" className="text-gray-600 hover:text-green-600">
          Login
        </Link>
      )}
    </div>
  );
}

export function MobileNavWrapper() {
  const { isAuthenticated, user, logout } = useAuth();
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/analytics", label: "Analytics" },
    { href: "/history", label: "History" },
    { href: "/about", label: "About" },
  ];
  if (isAuthenticated && user?.role === "admin") {
    links.push({ href: "/admin", label: "Admin" });
  }
  links.push({ href: "/auth", label: isAuthenticated ? "Logout" : "Login/Register" });
  return <MobileNav links={links} isAuthenticated={isAuthenticated} logout={logout} />;
}
