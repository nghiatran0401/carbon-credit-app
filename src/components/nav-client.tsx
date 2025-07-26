"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import { MobileNav } from "@/components/mobile-nav";
import { ShoppingCart } from "lucide-react";
import useSWR from "swr";
import { apiGet } from "@/lib/api";
import { useRouter } from "next/navigation";
import { withBasePath } from "@/lib/utils";

export function DesktopNav() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const userId = user?.id;
  const { data: cartData } = useSWR(userId ? `/api/cart?userId=${userId}` : null, apiGet);
  const cartCount = Array.isArray(cartData) ? cartData.length : cartData ? 1 : 0;
  return (
    <div className="hidden md:flex items-center space-x-6">
      <Link href={withBasePath("/dashboard")} className="text-gray-600 hover:text-green-600">
        Dashboard
      </Link>
      <Link href={withBasePath("/marketplace")} className="text-gray-600 hover:text-green-600">
        Marketplace
      </Link>

      <Link href={withBasePath("/history")} className="text-gray-600 hover:text-green-600">
        History
      </Link>
      {isAuthenticated && user?.role === "admin" && (
        <Link href={withBasePath("/admin")} className="text-gray-600 hover:text-green-600">
          Admin
        </Link>
      )}
      {/* Cart Icon */}
      {isAuthenticated && (
        <Link href={withBasePath("/cart")} className="relative text-gray-600 hover:text-green-600">
          <ShoppingCart className="h-6 w-6" />
          {cartCount > 0 && <span className="absolute -top-2 -right-2 bg-green-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">{cartCount}</span>}
        </Link>
      )}
      {isAuthenticated ? (
        <button
          onClick={() => {
            logout();
            router.push(withBasePath("/"));
          }}
          className="text-gray-600 hover:text-red-600 border border-gray-300 rounded px-3 py-1 ml-2"
        >
          Logout
        </button>
      ) : (
        <Link href={withBasePath("/auth")} className="text-gray-600 hover:text-green-600">
          Login
        </Link>
      )}
    </div>
  );
}

export function MobileNavWrapper() {
  const { isAuthenticated, user, logout } = useAuth();
  const links = [
    { href: withBasePath("/dashboard"), label: "Dashboard" },
    { href: withBasePath("/marketplace"), label: "Marketplace" },
    { href: withBasePath("/history"), label: "History" },
    { href: withBasePath("/about"), label: "About" },
  ];
  if (isAuthenticated && user?.role === "admin") {
    links.push({ href: withBasePath("/admin"), label: "Admin" });
  }
  links.push({ href: withBasePath("/auth"), label: isAuthenticated ? "Logout" : "Login/Register" });
  return <MobileNav links={links} isAuthenticated={isAuthenticated} logout={logout} />;
}
