import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/core/index.ts',
    'src/state/index.ts',
    'src/memory/index.ts',
    'src/tools/index.ts',
    'src/providers/index.ts',
    'src/conversation/index.ts',
    'src/educational/index.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['ioredis', '@anthropic-ai/sdk', 'openai'],
  treeshake: true,
  minify: false,
});
