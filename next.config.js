/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Turbopack due to font loading issues with Next.js 15
  // Re-enable when Turbopack font support is stable
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@clerk/nextjs'],
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
      {
        source: "/dashboard",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/dashboard/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/account/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/transaction/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Bundle analyzer (optional)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.resolve.alias = {
        ...config.resolve.alias,
      };
      return config;
    },
  }),
};

module.exports = nextConfig;
