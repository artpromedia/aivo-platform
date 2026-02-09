/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@aivo/ui-web'],
  experimental: {
    scrollRestoration: true,
    optimizePackageImports: ['@aivo/ui-web', 'lucide-react'],
  },
};

export default nextConfig;
