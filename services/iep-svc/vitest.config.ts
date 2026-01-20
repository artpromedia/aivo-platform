import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'src/__tests__/**',
        '**/*.d.ts',
        'vitest.config.ts',
      ],
    },
    // Ensure proper handling of ES modules
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
    // Setup file for mocks
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
