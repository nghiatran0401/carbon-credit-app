/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: blob: *.openstreetmap.org *.arcgisonline.com *.basemaps.cartocdn.com; font-src 'self'; connect-src 'self' *.supabase.co *.payos.vn; frame-src *.payos.vn; object-src 'none'; base-uri 'self';"
          }
        ],
      },
    ]
  },
  
  // Note: 24-hour timeout is excessive. Consider reducing to 30-60 seconds for most routes.
  // For specific long-running routes, implement timeout handling in the route itself.
  experimental: {
    proxyTimeout: 60000, // 60 seconds (reduced from 24 hours)
  },
};

module.exports = nextConfig;
