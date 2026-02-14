/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@aivo/ui-web'],
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compress: true,
  generateEtags: true,

  // Type checking is handled by the CI TypeCheck step; skip during next build to avoid strict-mode conflicts with shared libs
  typescript: { ignoreBuildErrors: true },

  // Resolve .js extension imports to .ts files (for libs using NodeNext module resolution)
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'aivolearning.com',
      },
    ],
  },

  async rewrites() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004';

    return [
      {
        source: '/api/auth/:path*',
        destination: `${appUrl}/api/auth/:path*`,
      },
      {
        source: '/api/checkout/:path*',
        destination: `${appUrl}/api/checkout/:path*`,
      },
      {
        source: '/api/subscription/:path*',
        destination: `${appUrl}/api/subscription/:path*`,
      },
      {
        source: '/api/billing/:path*',
        destination: `${appUrl}/api/billing/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
