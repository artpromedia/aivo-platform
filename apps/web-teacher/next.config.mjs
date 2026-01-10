import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@aivo/ui-web'],

  // ============================================================================
  // PERFORMANCE OPTIMIZATIONS
  // ============================================================================

  // Enable React Strict Mode for better development experience
  reactStrictMode: true,

  // Optimize production builds
  productionBrowserSourceMaps: false,

  // Compress responses
  compress: true,

  // Power efficient rendering
  poweredByHeader: false,

  // ============================================================================
  // IMAGE OPTIMIZATION
  // ============================================================================
  images: {
    // Enable modern image formats
    formats: ['image/avif', 'image/webp'],

    // Image sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Minimize memory usage
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days

    // Remote image domains (add your CDN domains)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.aivo.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
    ],

    // Enable AVIF for better compression
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // ============================================================================
  // EXPERIMENTAL FEATURES FOR PERFORMANCE
  // ============================================================================
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: [
      '@aivo/ui-web',
      'lucide-react',
      'date-fns',
      'lodash',
      'recharts',
    ],

    // Turbopack for faster development builds
    // turbo: {}, // Uncomment when stable

    // Enable scroll restoration
    scrollRestoration: true,
  },

  // ============================================================================
  // WEBPACK OPTIMIZATION
  // ============================================================================
  webpack: (config, { isServer }) => {
    // Tree shake lodash properly
    config.resolve.alias = {
      ...config.resolve.alias,
      lodash: 'lodash-es',
    };

    // Split chunks more aggressively for better caching
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000, // Keep chunks under 244KB for HTTP/2
        cacheGroups: {
          // React and React DOM
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'react',
            priority: 40,
            reuseExistingChunk: true,
          },
          // UI library
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|@headlessui|framer-motion)[\\/]/,
            name: 'ui',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Charts library
          charts: {
            test: /[\\/]node_modules[\\/](recharts|d3|victory)[\\/]/,
            name: 'charts',
            priority: 25,
            reuseExistingChunk: true,
          },
          // Date utilities
          dates: {
            test: /[\\/]node_modules[\\/](date-fns|dayjs|moment)[\\/]/,
            name: 'dates',
            priority: 20,
            reuseExistingChunk: true,
          },
          // All other vendor code
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },

  // ============================================================================
  // HEADERS (Security + Caching)
  // ============================================================================
  async headers() {
    return [
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
      // Cache static assets aggressively
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      // Cache JS/CSS bundles with immutable (hashed filenames)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API routes - no caching by default
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      // Font caching
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },

  // ============================================================================
  // REDIRECTS AND REWRITES
  // ============================================================================
  async redirects() {
    return [];
  },

  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },

  // ============================================================================
  // OUTPUT CONFIGURATION
  // ============================================================================
  output: 'standalone', // Optimized for containerized deployments

  // Generate ETags for caching
  generateEtags: true,

  // Trailing slash configuration
  trailingSlash: false,

  // Page extensions
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

export default withBundleAnalyzer(nextConfig);
