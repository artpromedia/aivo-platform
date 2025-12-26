/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@aivo/ui-web', '@aivo/ts-types'],
  images: {
    domains: ['localhost', 'api.aivo.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4004'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
