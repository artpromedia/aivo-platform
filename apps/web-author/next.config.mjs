/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  // Resolve .js extension imports to .ts files (for libs using NodeNext module resolution)
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },

  async rewrites() {
    const authoringSvcUrl = process.env.AUTHORING_SVC_URL || 'http://localhost:4060';
    const learnerModelSvcUrl = process.env.LEARNER_MODEL_SVC_URL || 'http://localhost:4025';

    return [
      {
        source: '/api/authoring/:path*',
        destination: `${authoringSvcUrl}/api/v1/authoring/:path*`,
      },
      {
        source: '/api/learner-model/:path*',
        destination: `${learnerModelSvcUrl}/api/v1/learner-model/:path*`,
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
        ],
      },
    ];
  },
};

export default nextConfig;
