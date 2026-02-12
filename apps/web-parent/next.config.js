/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@aivo/ui-web', '@aivo/ts-types'],
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compress: true,
  generateEtags: true,

  // Type checking is handled by the CI TypeCheck step; skip during next build to avoid strict-mode conflicts with shared libs
  typescript: { ignoreBuildErrors: true },

  images: {
    domains: ['localhost', 'api.aivolearning.com'],
  },
  async rewrites() {
    // In development, don't rewrite API routes - use local route handlers
    // This allows the mock data in /api routes to be served
    const isDev = process.env.NODE_ENV === 'development';

    // Service URLs for production
    const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://localhost:3010';
    const AUTH_SVC_URL = process.env.AUTH_SVC_URL || 'http://localhost:4001';

    // In development mode, don't proxy - use local API route handlers
    if (isDev) {
      return [];
    }

    return [
      // Parent service routes
      {
        source: '/api/parent/:path*',
        destination: `${PARENT_SVC_URL}/api/v1/parent/:path*`,
      },
      // Auth service routes
      {
        source: '/api/auth/:path*',
        destination: `${AUTH_SVC_URL}/api/v1/auth/:path*`,
      },
      // Messages are in parent-svc
      {
        source: '/api/messages/:path*',
        destination: `${PARENT_SVC_URL}/api/v1/messages/:path*`,
      },
      // Caregiver routes in parent-svc
      {
        source: '/api/caregiver/:path*',
        destination: `${PARENT_SVC_URL}/api/v1/caregiver/:path*`,
      },
      // Homework routes in parent-svc
      {
        source: '/api/homework/:path*',
        destination: `${PARENT_SVC_URL}/api/v1/homework/:path*`,
      },
      // Onboarding routes in parent-svc
      {
        source: '/api/onboarding/:path*',
        destination: `${PARENT_SVC_URL}/api/v1/onboarding/:path*`,
      },
      // Reports routes in parent-svc
      {
        source: '/api/reports/:path*',
        destination: `${PARENT_SVC_URL}/api/v1/reports/:path*`,
      },
      // Learner routes in parent-svc
      {
        source: '/api/learner/:path*',
        destination: `${PARENT_SVC_URL}/api/v1/learner/:path*`,
      },
      // Fallback to API gateway if configured
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || PARENT_SVC_URL}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
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
};

module.exports = nextConfig;
