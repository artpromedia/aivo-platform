/**
 * Copy non-TypeScript assets to dist/ after tsc compilation.
 * Handlebars templates and locale JSON files are not emitted by tsc,
 * so we copy them manually to mirror the source directory structure.
 */
import { cpSync } from 'node:fs';

const assets = [
  { src: 'src/channels/email/templates', dest: 'dist/src/channels/email/templates' },
  { src: 'src/channels/email/locales',   dest: 'dist/src/channels/email/locales' },
];

for (const { src, dest } of assets) {
  cpSync(src, dest, { recursive: true });
  console.log(`[copy-assets] ${src} → ${dest}`);
}
