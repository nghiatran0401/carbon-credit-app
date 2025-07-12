import type React from "react";
import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { MobileNav } from "@/components/mobile-nav";
import Link from "next/link";
import { Leaf } from "lucide-react";
import "./globals.css";

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand", // optional
  display: "swap",
});

export const metadata: Metadata = {
  title: "EcoCredit - Forest Carbon Credit Trading Platform",
  description: "Trade verified carbon credits from Vietnamese mangrove forests. Supporting global forest conservation through innovative digital marketplace.",
  keywords: "carbon credits, mangrove forests, Vietnam, Cần Giờ, environmental trading, climate action",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
      </head>

      <body className={quicksand.variable}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {/* Header */}
          <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <Link href="/">
                <div className="flex items-center space-x-2">
                  <Leaf className="h-8 w-8 text-green-600" />
                  <span className="text-2xl font-bold text-green-800">EcoCredit</span>
                </div>
              </Link>
              <div className="hidden md:flex items-center space-x-6">
                <Link href="/dashboard" className="text-gray-600 hover:text-green-600">
                  Dashboard
                </Link>
                <Link href="/marketplace" className="text-gray-600 hover:text-green-600">
                  Marketplace
                </Link>
                <Link href="/about" className="text-gray-600 hover:text-green-600">
                  About
                </Link>
                <Link href="/auth" className="text-gray-600 hover:text-green-600">
                  Login/Register
                </Link>
              </div>
              <MobileNav
                links={[
                  { href: "/dashboard", label: "Dashboard" },
                  { href: "/marketplace", label: "Marketplace" },
                  { href: "/about", label: "About" },
                  { href: "/auth", label: "Login/Register" },
                ]}
              />
            </div>
          </nav>

          {/* Main Content */}
          {children}

          {/* Footer */}
          <footer className="bg-gray-900 text-white py-12">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Leaf className="h-6 w-6 text-green-400" />
                    <span className="text-xl font-bold">EcoCredit</span>
                  </div>
                  <p className="text-gray-400">Connecting forests with the future through verified carbon credit trading.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Platform</h3>
                  <ul className="space-y-2 text-gray-400">
                    <li>
                      <Link href="/dashboard">Dashboard</Link>
                    </li>
                    <li>
                      <Link href="/marketplace">Marketplace</Link>
                    </li>
                    <li>
                      <Link href="/analytics">Analytics</Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Company</h3>
                  <ul className="space-y-2 text-gray-400">
                    <li>
                      <Link href="/about">About</Link>
                    </li>
                    <li>
                      <Link href="/team">Team</Link>
                    </li>
                    <li>
                      <Link href="/contact">Contact</Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Support</h3>
                  <ul className="space-y-2 text-gray-400">
                    <li>
                      <Link href="/help">Help Center</Link>
                    </li>
                    <li>
                      <Link href="/docs">Documentation</Link>
                    </li>
                    <li>
                      <Link href="/api">API</Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                <p>&copy; 2024 EcoCredit. All rights reserved.</p>
              </div>
            </div>
          </footer>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
