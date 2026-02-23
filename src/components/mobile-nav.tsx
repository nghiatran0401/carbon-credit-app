'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Leaf } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MobileNavProps {
  links: Array<{
    href: string;
    label: string;
  }>;
  isAuthenticated?: boolean;
  logout?: () => void;
}

export function MobileNav({ links, isAuthenticated, logout }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[350px] md:w-[400px] bg-white">
        <div className="flex items-center space-x-2 mb-6">
          <Leaf className="h-6 w-6 text-green-600" />
          <span className="text-xl font-bold text-green-800">EcoCredit</span>
        </div>
        <nav className="flex flex-col space-y-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-lg font-medium text-gray-900 hover:text-green-600 transition-colors touch-target flex items-center py-2"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 border-t">
            {isAuthenticated ? (
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => {
                  if (logout) logout();
                  setOpen(false);
                  router.push('/');
                }}
              >
                Logout
              </Button>
            ) : (
              <Button variant="outline" asChild className="w-full">
                <Link href="/auth" onClick={() => setOpen(false)}>
                  Get Started
                </Link>
              </Button>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
