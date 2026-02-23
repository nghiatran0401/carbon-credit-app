import type React from 'react';
import type { Metadata } from 'next';
import { Quicksand } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { Footer } from '@/components/footer';
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

          <Footer />
          <ScrollToTop />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
