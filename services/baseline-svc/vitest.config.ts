import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const workspaceRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

export default defineConfig({
  resolve: {
    alias: {
      '@aivo/ts-rbac': path.resolve(workspaceRoot, 'libs/ts-rbac/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      enabled: false,

      thresholds: {
        lines: 90,
        branches: 85,
        functions: 90,
        statements: 90,
      },
    },
  },
});
