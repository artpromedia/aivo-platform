/**
 * Next.js Configuration for AIVO Main App
 *
 * This file includes CORS configuration to allow the marketing site
 * to make authenticated API requests.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@aivo/ui-web', '@aivo/ts-shared'],

  // ============================================
  // CORS Headers for Marketing Site Integration
  // ============================================
  async headers() {
    const marketingUrl = process.env.MARKETING_URL || 'http://localhost:3001';

    return [
      // API routes that marketing site needs access to
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: marketingUrl,
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400', // 24 hours - cache preflight requests
          },
        ],
      },
      // Security headers for all routes
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
        ],
      },
    ];
  },

  // ============================================
  // Environment Variables
  // ============================================
  env: {
    // Expose marketing URL for client-side use if needed
    NEXT_PUBLIC_MARKETING_URL: process.env.MARKETING_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;
