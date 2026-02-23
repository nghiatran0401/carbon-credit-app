import Link from 'next/link';
import { Leaf, Github, Mail, Globe } from 'lucide-react';

const footerLinks = {
  Platform: [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/cart', label: 'Cart' },
    { href: '/history', label: 'Order History' },
  ],
  'Analytics & Tools': [
    { href: '/carbon-movement', label: 'Carbon Movement' },
    { href: '/biomass-only', label: 'Biomass Analysis' },
    { href: '/order-audit', label: 'Order Audit Trail' },
  ],
  Administration: [{ href: '/admin', label: 'Admin Console' }],
};

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center space-x-2 mb-4 group">
              <Leaf className="h-6 w-6 text-green-400 transition-transform group-hover:rotate-12" />
              <span className="text-xl font-bold">EcoCredit</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Connecting forests with the future through verified carbon credit trading from
              Vietnamese mangrove forests.
            </p>
            <div className="flex items-center space-x-4 text-gray-400">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-400 transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="mailto:contact@ecocredit.com"
                className="hover:text-green-400 transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
              <a
                href="/api/health"
                className="hover:text-green-400 transition-colors"
                aria-label="System Status"
              >
                <Globe className="h-5 w-5" />
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-4">
                {category}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-gray-400 text-sm hover:text-green-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} EcoCredit. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <Link href="/auth" className="hover:text-green-400 transition-colors">
              Sign In
            </Link>
            <Link href="/api/health" className="hover:text-green-400 transition-colors">
              System Status
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
