import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  // Bundle CJS packages inline so ESM wrapper handles their require() calls
  // This prevents "Named export not found" errors at runtime
  noExternal: [
    'jsonwebtoken',
    'bcryptjs',
    'express',
    'nodemailer',
    'pdfkit',
    'handlebars',
    'firebase-admin',
  ],
  // Keep Node.js builtins and Prisma as externals
  external: [/^node:/, '@prisma/client'],
  esbuildPlugins: [
    {
      name: 'prisma-path-rewrite',
      setup(build) {
        // Rewrite ../../generated/prisma-client paths to ../generated/prisma-client
        // because tsup bundles src/**/* into dist/index.js (flattened),
        // so ../../ from src/prisma/ becomes ../ from dist/
        build.onResolve({ filter: /generated\/prisma-client/ }, (args) => {
          return {
            path: '../generated/prisma-client/index.js',
            external: true,
          };
        });
      },
    },
  ],
  // Allow dynamic require for bundled CJS packages
  banner: {
    js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
  },
});
