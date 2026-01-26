import path from 'node:path';
import { defineConfig } from 'vitest/config';

const workspaceRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@aivo/ts-rbac': path.resolve(workspaceRoot, 'libs/ts-rbac/src'),
      '@aivo/ts-api-utils': path.resolve(workspaceRoot, 'libs/ts-api-utils/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      enabled: false,
    },
  },
});
