import type React from 'react';
import type { Metadata } from 'next';
import { Quicksand } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import Link from 'next/link';
import { Leaf } from 'lucide-react';
import './globals.css';
import { AuthProvider } from '@/components/auth-context';
import { ConditionalNav } from '@/components/conditional-nav';
import { ScrollToTop } from '@/components/scroll-to-top';

const quicksand = Quicksand({
  subsets: ['latin'],
  variable: '--font-quicksand', // optional
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EcoCredit - Forest Carbon Credit Trading Platform',
  description:
    'Trade verified carbon credits from Vietnamese mangrove forests. Supporting global forest conservation through innovative digital marketplace.',
  keywords:
    'carbon credits, mangrove forests, Vietnam, Cần Giờ, environmental trading, climate action',
  authors: [{ name: 'EcoCredit Team' }],
  creator: 'EcoCredit',
  publisher: 'EcoCredit',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'EcoCredit - Forest Carbon Credit Trading Platform',
    description:
      'Trade verified carbon credits from Vietnamese mangrove forests. Supporting global forest conservation through innovative digital marketplace.',
    url: '/',
    siteName: 'EcoCredit',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'EcoCredit Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EcoCredit - Forest Carbon Credit Trading Platform',
    description:
      'Trade verified carbon credits from Vietnamese mangrove forests. Supporting global forest conservation through innovative digital marketplace.',
    images: ['/logo.png'],
    creator: '@ecocredit',
  },
  icons: {
    icon: [
      { url: '/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/logo.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/logo.png'],
  },
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
      </head>

      <body className={quicksand.variable}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:rounded focus:shadow"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <ConditionalNav />

          <main id="main-content" className="min-h-screen bg-gray-50">
            {children}
          </main>

          <footer className="bg-gray-900 text-white py-12">
            <div className="container">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Leaf className="h-6 w-6 text-green-400" />
                    <span className="text-xl font-bold">EcoCredit</span>
                  </div>
                  <p className="text-gray-400">
                    Connecting forests with the future through verified carbon credit trading.
                  </p>
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
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Resources</h3>
                  <ul className="space-y-2 text-gray-400">
                    <li>
                      <Link href="/history">Order History</Link>
                    </li>
                    <li>
                      <Link href="/cart">Cart</Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Support</h3>
                  <ul className="space-y-2 text-gray-400">
                    <li>
                      <Link href="/api/health">System Status</Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                <p>&copy; {new Date().getFullYear()} EcoCredit. All rights reserved.</p>
              </div>
            </div>
          </footer>
          <ScrollToTop />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
