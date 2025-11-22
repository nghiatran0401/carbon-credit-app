/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase timeout for API routes (for large biomass predictions)
  experimental: {
    proxyTimeout: 24 * 60 * 60 * 1000, // 24 hours
  },
  // For production builds
  serverRuntimeConfig: {
    apiTimeout: 24 * 60 * 60 * 1000, // 24 hours
  },
};

module.exports = nextConfig;
