'use client';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import { MobileNav } from '@/components/mobile-nav';
import { ShoppingCart, UserCircle } from 'lucide-react';
import useSWR from 'swr';
import { apiGet } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { NotificationCenter } from '@/components/notification-center';
export function DesktopNav() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const userId = user?.id;
  const { data: cartData } = useSWR(userId ? `/api/cart?userId=${userId}` : null, apiGet);
  const cartCount = Array.isArray(cartData) ? cartData.length : cartData ? 1 : 0;
  return (
    <div className="hidden lg:flex items-center space-x-6">
      {isAuthenticated && (
        <>
          <Link href="/dashboard" className="text-gray-600 hover:text-green-600">
            Dashboard
          </Link>
          <Link href="/marketplace" className="text-gray-600 hover:text-green-600">
            Marketplace
          </Link>
          <Link href="/history" className="text-gray-600 hover:text-green-600">
            History
          </Link>
        </>
      )}
      {isAuthenticated && user?.role?.toLowerCase() === 'admin' && (
        <Link href="/admin" className="text-gray-600 hover:text-green-600">
          Admin
        </Link>
      )}
      {isAuthenticated && (
        <Link
          href="/profile"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
          title="Profile"
        >
          <UserCircle className="h-5 w-5" />
        </Link>
      )}
      {isAuthenticated && <NotificationCenter />}
      {isAuthenticated && (
        <Link
          href="/cart"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-xs text-white">
              {cartCount}
            </span>
          )}
        </Link>
      )}
      {isAuthenticated ? (
        <button
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="ml-2 rounded-md border border-gray-300 px-3 py-1 text-gray-600 transition-colors hover:border-red-200 hover:text-red-600"
        >
          Logout
        </button>
      ) : (
        <Link href="/auth" className="text-gray-600 hover:text-green-600">
          Sign In
        </Link>
      )}
    </div>
  );
}

export function MobileNavWrapper() {
  const { isAuthenticated, user, logout } = useAuth();
  const links = [
    { href: '/about', label: 'About' },
    { href: '/verify', label: 'Verify' },
  ];
  if (isAuthenticated) {
    links.push(
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/marketplace', label: 'Marketplace' },
      { href: '/history', label: 'History' },
      { href: '/notifications', label: 'Notifications' },
      { href: '/profile', label: 'Profile' },
    );
  }
  if (isAuthenticated && user?.role?.toLowerCase() === 'admin') {
    links.push({ href: '/admin', label: 'Admin' });
  }
  // Don't add logout to links array since MobileNav handles it separately
  return <MobileNav links={links} isAuthenticated={isAuthenticated} logout={logout} />;
}
