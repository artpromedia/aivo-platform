import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const workspaceRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

export default defineConfig({
  resolve: {
    alias: {
      '@aivo/ts-data-access': path.resolve(workspaceRoot, 'libs/ts-data-access/src'),
      '@aivo/ts-rbac': path.resolve(workspaceRoot, 'libs/ts-rbac/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      enabled: false,
    },
  },
});
