const nextConfig = {
  webpack: (config) => {
    config.externals = [...config.externals, "canvas", "jsdom"];
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: false,
  },
};

export default nextConfig;
