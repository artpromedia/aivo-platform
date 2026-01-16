import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@aivo/ts-data-access': path.resolve(__dirname, '../../libs/ts-data-access/src'),
      '@aivo/ts-rbac': path.resolve(__dirname, '../../libs/ts-rbac/src'),
      '@aivo/events': path.resolve(__dirname, '../../libs/events/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'generated/'],
    },
  },
});
