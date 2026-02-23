'use client';

import { usePathname } from 'next/navigation';
import { DesktopNav, MobileNavWrapper } from '@/components/nav-client';
import Link from 'next/link';
import { Leaf, ShieldCheck } from 'lucide-react';

export function ConditionalNav() {
  const pathname = usePathname();
  const isAuthPage = pathname === '/auth';

  if (isAuthPage) {
    return null;
  }

  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-[10000]">
      <div className="container py-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/">
            <div className="flex items-center space-x-2">
              <Leaf className="h-8 w-8 text-green-600" />
              <span className="text-2xl font-bold text-green-800">EcoCredit</span>
            </div>
          </Link>
          <div className="hidden lg:flex items-center space-x-6">
            <Link href="/about" className="text-gray-600 hover:text-green-600">
              About
            </Link>
            <Link
              href="/verify"
              className="inline-flex items-center gap-1.5 text-gray-600 hover:text-green-600"
            >
              <ShieldCheck className="h-4 w-4" />
              Verify
            </Link>
          </div>
        </div>
        <DesktopNav />
        <MobileNavWrapper />
      </div>
    </nav>
  );
}
