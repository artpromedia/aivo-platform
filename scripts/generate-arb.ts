#!/usr/bin/env node
/**
 * generate-arb.ts
 *
 * Converts packages/i18n/src/locales/*.json  →  Flutter ARB files
 * for any Flutter app that needs them.
 *
 * Usage:
 *   npx tsx scripts/generate-arb.ts                      # generates to all apps
 *   npx tsx scripts/generate-arb.ts --app mobile-learner  # single app
 *   npx tsx scripts/generate-arb.ts --out libs/flutter-common/lib/l10n  # custom dir
 *
 * The script:
 *   1. Reads all JSON locale files from packages/i18n/src/locales/
 *   2. Flattens nested keys into dot-notation (common.save → commonSave)
 *   3. Produces ARB files with @@locale and @-descriptions
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ── CLI args ─────────────────────────────────────────────────
const args = process.argv.slice(2);
const appIndex = args.indexOf('--app');
const outIndex = args.indexOf('--out');

const DEFAULT_TARGETS = [
  'apps/mobile-learner/lib/l10n',
  'apps/mobile-parent/lib/l10n',
  'apps/mobile-teacher/lib/l10n',
  'libs/flutter-common/lib/l10n',
];

const ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'packages', 'i18n', 'src', 'locales');

function getTargets(): string[] {
  if (outIndex !== -1 && args[outIndex + 1]) {
    return [path.resolve(ROOT, args[outIndex + 1])];
  }
  if (appIndex !== -1 && args[appIndex + 1]) {
    const match = DEFAULT_TARGETS.find((t) => t.includes(args[appIndex + 1]));
    if (!match) {
      console.error(`Unknown app: ${args[appIndex + 1]}`);
      process.exit(1);
    }
    return [path.resolve(ROOT, match)];
  }
  return DEFAULT_TARGETS.map((t) => path.resolve(ROOT, t));
}

// ── Flatten nested JSON ──────────────────────────────────────
function flatten(
  obj: Record<string, unknown>,
  prefix = '',
  result: Record<string, string> = {}
): Record<string, string> {
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}${capitalize(key)}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flatten(value as Record<string, unknown>, newKey, result);
    } else {
      result[newKey] = String(value);
    }
  }
  return result;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── ICU → ARB placeholders ──────────────────────────────────
// Detect {name} placeholders and add ARB @-metadata
function extractPlaceholders(key: string, value: string): Record<string, unknown> | null {
  const matches = [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  if (matches.length === 0) return null;

  const placeholders: Record<string, { type: string }> = {};
  for (const name of matches) {
    // Heuristic: "count" → int, others → String
    placeholders[name] = { type: name === 'count' ? 'int' : 'String' };
  }

  return {
    [`@${key}`]: {
      description: key,
      placeholders,
    },
  };
}

// ── Convert one locale JSON → one ARB ────────────────────────
function jsonToArb(locale: string, jsonContent: Record<string, unknown>): string {
  const flat = flatten(jsonContent);
  const arb: Record<string, unknown> = {
    '@@locale': locale,
    '@@last_modified': new Date().toISOString(),
  };

  for (const [key, value] of Object.entries(flat)) {
    arb[key] = value;
    const meta = extractPlaceholders(key, value);
    if (meta) {
      Object.assign(arb, meta);
    }
  }

  return JSON.stringify(arb, null, 2) + '\n';
}

// ── Merge: preserve manually-added ARB keys ─────────────────
// Keys in the existing ARB that are NOT produced by the JSON source
// are preserved so that app-specific entries survive regeneration.
function mergeArb(generated: string, existingPath: string): string {
  if (!fs.existsSync(existingPath)) return generated;

  const existing: Record<string, unknown> = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
  const gen: Record<string, unknown> = JSON.parse(generated);

  // Collect keys produced by generate (including @-metadata)
  const genKeys = new Set(Object.keys(gen));

  // Preserve any key from existing that is NOT in the generated set
  for (const [key, value] of Object.entries(existing)) {
    if (!genKeys.has(key)) {
      gen[key] = value;
    }
  }

  return JSON.stringify(gen, null, 2) + '\n';
}

// ── Main ─────────────────────────────────────────────────────
function main() {
  const targets = getTargets();

  // Read all locale JSON files
  const localeFiles = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'));
  if (localeFiles.length === 0) {
    console.error(`No locale JSON files found in ${LOCALES_DIR}`);
    process.exit(1);
  }

  console.log(
    `Found ${localeFiles.length} locale(s): ${localeFiles.map((f) => f.replace('.json', '')).join(', ')}`
  );

  for (const target of targets) {
    // Ensure output dir exists
    fs.mkdirSync(target, { recursive: true });

    for (const file of localeFiles) {
      const locale = file.replace('.json', '');
      const json = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf-8'));
      const generated = jsonToArb(locale, json);
      const outFile = path.join(target, `app_${locale}.arb`);
      // Merge: generated keys take precedence, but manually-added keys are kept
      const merged = mergeArb(generated, outFile);
      fs.writeFileSync(outFile, merged, 'utf-8');
    }

    console.log(`  ✓ ${path.relative(ROOT, target)}: ${localeFiles.length} ARB file(s)`);
  }

  console.log('\nDone. Run `flutter gen-l10n` in each Flutter app to regenerate delegates.');
}

main();
