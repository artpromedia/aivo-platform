import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';

/**
 * Vite Configuration with Bundle Analysis and Optimization
 *
 * Features:
 * - Bundle visualization with stats output
 * - Code splitting strategies
 * - Compression (gzip + brotli)
 * - Tree shaking optimization
 */

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),

    // Bundle analyzer - generates stats.html and stats.json
    visualizer({
      filename: 'dist/stats.html',
      open: mode === 'analyze',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // 'treemap' | 'sunburst' | 'network'
      sourcemap: true,
    }),

    // Generate JSON stats for CI
    visualizer({
      filename: 'dist/stats.json',
      template: 'raw-data',
      gzipSize: true,
      brotliSize: true,
    }),

    // Gzip compression
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br)$/, /\.(gz)$/],
      threshold: 1024, // Only compress files > 1KB
    }),

    // Brotli compression
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br)$/, /\.(gz)$/],
      threshold: 1024,
    }),
  ],

  build: {
    // Generate sourcemaps for production debugging
    sourcemap: mode === 'development' || mode === 'analyze',

    // Rollup options for code splitting
    rollupOptions: {
      output: {
        // Chunk splitting strategy
        manualChunks: {
          // Vendor chunks - split large dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tooltip',
          ],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': ['recharts', 'd3'],
          'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit'],
          'vendor-utils': ['lodash-es', 'date-fns'],
        },

        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];

          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }

          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }

          if (ext === 'css') {
            return `assets/css/[name]-[hash][extname]`;
          }

          return `assets/[name]-[hash][extname]`;
        },

        // Chunk file naming
        chunkFileNames: 'assets/js/[name]-[hash].js',

        // Entry file naming
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 500, // 500KB warning threshold

    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },

    // CSS options
    cssCodeSplit: true,
    cssMinify: true,

    // Target modern browsers for smaller bundles
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
  },

  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
    ],
    exclude: ['@vite/client', '@vite/env'],
  },

  // Performance hints
  esbuild: {
    // Remove console.log in production
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
  },
}));
