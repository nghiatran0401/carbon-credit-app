"use client";

import { usePathname } from "next/navigation";
import { DesktopNav, MobileNavWrapper } from "@/components/nav-client";
import Link from "next/link";
import { Leaf } from "lucide-react";

export function ConditionalNav() {
  const pathname = usePathname();
  const isAuthPage = pathname === "/auth";

  // Hide navigation on auth page
  if (isAuthPage) {
    return null;
  }

  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-[10000]">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center space-x-2">
            <Leaf className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-bold text-green-800">EcoCredit</span>
          </div>
        </Link>
        <DesktopNav />
        <MobileNavWrapper />
      </div>
    </nav>
  );
}

