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
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      enabled: false,
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/*.d.ts'],
      thresholds: {
        lines: 90,
        branches: 85,
        functions: 90,
        statements: 90,
      },
    },
  },
});
