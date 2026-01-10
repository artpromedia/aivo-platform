/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@aivo/ui-web'],
  experimental: {
    scrollRestoration: true,
    optimizePackageImports: ['@aivo/ui-web', 'lucide-react'],
  },
};

export default nextConfig;
