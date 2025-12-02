"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import { MobileNav } from "@/components/mobile-nav";
import { ShoppingCart } from "lucide-react";
import useSWR from "swr";
import { apiGet } from "@/lib/api";
import { useRouter } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";

export function DesktopNav() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const userId = user?.id;
  const { data: cartData } = useSWR(userId ? `/api/cart?userId=${userId}` : null, apiGet);
  const cartCount = Array.isArray(cartData) ? cartData.length : cartData ? 1 : 0;
  return (
    <div className="hidden lg:flex items-center space-x-6">
      <Link href="/dashboard" className="text-gray-600 hover:text-green-600">
        Dashboard
      </Link>

      <Link href="/wallet" className="text-gray-600 hover:text-green-600">
        Wallet
      </Link>

      <Link href="/marketplace_new" className="text-gray-600 hover:text-green-600">
        Marketplace
      </Link>
      
      <Link href="/biomass-only" className="text-gray-600 hover:text-green-600">
        Upload Assets
      </Link>

      <Link href="/history" className="text-gray-600 hover:text-green-600">
        History
      </Link>
      {isAuthenticated && user?.role === "admin" && (
        <Link href="/admin" className="text-gray-600 hover:text-green-600">
          Admin
        </Link>
      )}
      {/* Cart Icon */}
      {isAuthenticated && (
        <Link href="/cart" className="relative text-gray-600 hover:text-green-600">
          <ShoppingCart className="h-6 w-6" />
          {cartCount > 0 && <span className="absolute -top-2 -right-2 bg-green-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">{cartCount}</span>}
        </Link>
      )}
      {/* Notification Bell */}
      {isAuthenticated && <NotificationBell />}
      {isAuthenticated ? (
        <button
          onClick={() => {
            logout();
            router.push("/");
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
    { href: "/history", label: "History" },
    { href: "/about", label: "About" },
  ];
  if (isAuthenticated && user?.role === "admin") {
    links.push({ href: "/admin", label: "Admin" });
  }
  // Don't add logout to links array since MobileNav handles it separately
  return <MobileNav links={links} isAuthenticated={isAuthenticated} logout={logout} />;
}
