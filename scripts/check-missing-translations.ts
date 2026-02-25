#!/usr/bin/env node
/**
 * check-missing-translations.ts
 *
 * CI script that validates translation completeness across all locale files.
 * Exits with code 1 if any translations are missing.
 *
 * Usage:
 *   npx tsx scripts/check-missing-translations.ts
 *   npx tsx scripts/check-missing-translations.ts --warn-only   # exit 0 even on missing
 *   npx tsx scripts/check-missing-translations.ts --threshold 90 # allow up to 10% missing
 *
 * Checks performed:
 *   1. All locale files have the same set of top-level and nested keys
 *   2. No values are empty strings
 *   3. ICU placeholders ({name}) are consistent across locales
 *   4. Coverage percentage is above threshold
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ── CLI args ─────────────────────────────────────────────────
const args = process.argv.slice(2);
const warnOnly = args.includes('--warn-only');
const thresholdIndex = args.indexOf('--threshold');
const threshold = thresholdIndex !== -1 ? Number(args[thresholdIndex + 1]) : 100;

const ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'packages', 'i18n', 'src', 'locales');
const REFERENCE_LOCALE = 'en';

// ── Types ────────────────────────────────────────────────────
interface Issue {
  locale: string;
  key: string;
  type: 'missing' | 'empty' | 'placeholder-mismatch';
  detail?: string;
}

// ── Key extraction ───────────────────────────────────────────
function getAllKeys(
  obj: Record<string, unknown>,
  prefix = '',
): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getNestedValue(obj: Record<string, unknown>, keyPath: string): unknown {
  const parts = keyPath.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function extractPlaceholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

// ── Main ─────────────────────────────────────────────────────
function main() {
  const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.error('No locale files found');
    process.exit(1);
  }

  // Load all locales
  const locales = new Map<string, Record<string, unknown>>();
  for (const file of files) {
    const locale = file.replace('.json', '');
    const content = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf-8'));
    locales.set(locale, content);
  }

  // Reference locale
  const refContent = locales.get(REFERENCE_LOCALE);
  if (!refContent) {
    console.error(`Reference locale '${REFERENCE_LOCALE}' not found`);
    process.exit(1);
  }

  const refKeys = getAllKeys(refContent);
  console.log(`Reference locale: ${REFERENCE_LOCALE} (${refKeys.length} keys)`);
  console.log(`Checking ${locales.size} locale(s): ${[...locales.keys()].join(', ')}\n`);

  const issues: Issue[] = [];
  const coverage = new Map<string, { total: number; present: number }>();

  for (const [locale, content] of locales) {
    if (locale === REFERENCE_LOCALE) {
      coverage.set(locale, { total: refKeys.length, present: refKeys.length });
      continue;
    }

    let present = 0;

    for (const key of refKeys) {
      const value = getNestedValue(content, key);

      if (value === undefined) {
        issues.push({ locale, key, type: 'missing' });
        continue;
      }

      if (typeof value === 'string' && value.trim() === '') {
        issues.push({ locale, key, type: 'empty' });
        continue;
      }

      // Check placeholder consistency
      if (typeof value === 'string') {
        const refValue = getNestedValue(refContent, key);
        if (typeof refValue === 'string') {
          const refPlaceholders = extractPlaceholders(refValue);
          const localePlaceholders = extractPlaceholders(value);
          if (JSON.stringify(refPlaceholders) !== JSON.stringify(localePlaceholders)) {
            issues.push({
              locale,
              key,
              type: 'placeholder-mismatch',
              detail: `expected {${refPlaceholders.join(', ')}}, got {${localePlaceholders.join(', ')}}`,
            });
          }
        }
      }

      present++;
    }

    // Check for extra keys not in reference
    const localeKeys = getAllKeys(content);
    const extraKeys = localeKeys.filter((k) => !refKeys.includes(k));
    if (extraKeys.length > 0) {
      console.log(`  ⚠ ${locale}: ${extraKeys.length} extra key(s) not in ${REFERENCE_LOCALE}`);
    }

    coverage.set(locale, { total: refKeys.length, present });
  }

  // ── Report ───────────────────────────────────────────────
  console.log('Coverage Report:');
  console.log('─'.repeat(55));
  for (const [locale, cov] of coverage) {
    const pct = ((cov.present / cov.total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(cov.present / cov.total * 30));
    const empty = '░'.repeat(30 - bar.length);
    const status = Number(pct) >= threshold ? '✓' : '✗';
    console.log(`  ${status} ${locale.padEnd(6)} ${bar}${empty} ${pct}% (${cov.present}/${cov.total})`);
  }
  console.log('');

  if (issues.length > 0) {
    // Group by type
    const missing = issues.filter((i) => i.type === 'missing');
    const empty = issues.filter((i) => i.type === 'empty');
    const placeholders = issues.filter((i) => i.type === 'placeholder-mismatch');

    if (missing.length > 0) {
      console.log(`Missing translations (${missing.length}):`);
      const byLocale = new Map<string, string[]>();
      for (const issue of missing) {
        const arr = byLocale.get(issue.locale) ?? [];
        arr.push(issue.key);
        byLocale.set(issue.locale, arr);
      }
      for (const [locale, keys] of byLocale) {
        console.log(`  ${locale}: ${keys.length} missing`);
        for (const key of keys.slice(0, 5)) {
          console.log(`    - ${key}`);
        }
        if (keys.length > 5) {
          console.log(`    ... and ${keys.length - 5} more`);
        }
      }
      console.log('');
    }

    if (empty.length > 0) {
      console.log(`Empty translations (${empty.length}):`);
      for (const issue of empty) {
        console.log(`  ${issue.locale}: ${issue.key}`);
      }
      console.log('');
    }

    if (placeholders.length > 0) {
      console.log(`Placeholder mismatches (${placeholders.length}):`);
      for (const issue of placeholders) {
        console.log(`  ${issue.locale}: ${issue.key} — ${issue.detail}`);
      }
      console.log('');
    }

    // Check if below threshold
    let belowThreshold = false;
    for (const [locale, cov] of coverage) {
      const pct = (cov.present / cov.total) * 100;
      if (pct < threshold) {
        belowThreshold = true;
      }
    }

    if (belowThreshold && !warnOnly) {
      console.error(`\n✗ Translation coverage below ${threshold}% threshold. Failing CI.`);
      process.exit(1);
    }

    if (warnOnly) {
      console.log('⚠ Issues found but --warn-only is set. Exiting with code 0.');
    }
  } else {
    console.log('✓ All translations complete and consistent!');
  }
}

main();
