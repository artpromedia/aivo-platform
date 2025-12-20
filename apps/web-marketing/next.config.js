/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@aivo/ui-web'],

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return [
      // Proxy auth API requests to main app (development only)
      {
        source: '/api/auth/:path*',
        destination: `${appUrl}/api/auth/:path*`,
      },
      // Proxy checkout API requests
      {
        source: '/api/checkout/:path*',
        destination: `${appUrl}/api/checkout/:path*`,
      },
      // Proxy subscription API requests
      {
        source: '/api/subscription/:path*',
        destination: `${appUrl}/api/subscription/:path*`,
      },
      // Proxy billing API requests
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
        ],
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
