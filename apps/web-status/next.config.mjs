/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  generateEtags: true,

  // Type checking handled by CI
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  experimental: {
    scrollRestoration: true,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      // Proxy API calls to the status-page-svc backend
      {
        source: '/api/:path*',
        destination: `${process.env.STATUS_API_URL || 'http://localhost:3090'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
