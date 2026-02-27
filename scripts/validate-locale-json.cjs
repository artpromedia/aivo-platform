#!/usr/bin/env node
/**
 * Validates all web-marketing locale JSON files:
 * 1. Valid JSON syntax
 * 2. Key parity with EN reference
 * 3. No empty string values
 * 4. Interpolation placeholder consistency ({{var}})
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'apps', 'web-marketing', 'src', 'locales');
const LOCALES = ['en', 'es', 'fr', 'de', 'pt', 'ar', 'zh', 'ja', 'ko', 'hi'];
let exitCode = 0;

function getKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...getKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function getVal(obj, keyPath) {
  let cur = obj;
  for (const p of keyPath.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function extractPlaceholders(val) {
  if (typeof val !== 'string') return [];
  return [...val.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).sort();
}

// ── Phase 1: Parse all files ──
console.log('=== Phase 1: JSON Syntax Validation ===\n');
const data = {};
for (const loc of LOCALES) {
  const file = path.join(DIR, loc, 'marketing.json');
  try {
    data[loc] = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`  ${loc}: VALID`);
  } catch (e) {
    console.error(`  ${loc}: PARSE ERROR - ${e.message}`);
    exitCode = 1;
  }
}

// ── Phase 2: Key parity ──
console.log('\n=== Phase 2: Key Parity (vs EN reference) ===\n');
if (data.en) {
  const refKeys = new Set(getKeys(data.en));
  console.log(`  EN reference: ${refKeys.size} keys\n`);

  for (const loc of LOCALES) {
    if (loc === 'en' || !data[loc]) continue;
    const locKeys = new Set(getKeys(data[loc]));
    const missing = [...refKeys].filter(k => !locKeys.has(k));
    const extra = [...locKeys].filter(k => !refKeys.has(k));
    if (missing.length === 0 && extra.length === 0) {
      console.log(`  ${loc}: OK (${locKeys.size} keys)`);
    } else {
      if (missing.length) {
        console.error(`  ${loc}: MISSING ${missing.length} keys:`);
        missing.forEach(k => console.error(`    - ${k}`));
        exitCode = 1;
      }
      if (extra.length) {
        console.warn(`  ${loc}: EXTRA ${extra.length} keys:`);
        extra.forEach(k => console.warn(`    + ${k}`));
      }
    }
  }
}

// ── Phase 3: Empty values ──
console.log('\n=== Phase 3: Empty String Values ===\n');
for (const loc of LOCALES) {
  if (!data[loc]) continue;
  const keys = getKeys(data[loc]);
  const empties = keys.filter(k => {
    const v = getVal(data[loc], k);
    return typeof v === 'string' && v.trim() === '';
  });
  if (empties.length === 0) {
    console.log(`  ${loc}: OK (no empty values)`);
  } else {
    console.error(`  ${loc}: ${empties.length} empty value(s):`);
    empties.forEach(k => console.error(`    - ${k}`));
    exitCode = 1;
  }
}

// ── Phase 4: Placeholder consistency ──
console.log('\n=== Phase 4: Interpolation Placeholder Consistency ===\n');
if (data.en) {
  const refKeys = getKeys(data.en);
  for (const loc of LOCALES) {
    if (loc === 'en' || !data[loc]) continue;
    const mismatches = [];
    for (const key of refKeys) {
      const enVal = getVal(data.en, key);
      const locVal = getVal(data[loc], key);
      if (typeof enVal === 'string' && typeof locVal === 'string') {
        const enPh = extractPlaceholders(enVal);
        const locPh = extractPlaceholders(locVal);
        if (enPh.join(',') !== locPh.join(',')) {
          mismatches.push({ key, en: enPh, loc: locPh });
        }
      }
    }
    if (mismatches.length === 0) {
      console.log(`  ${loc}: OK`);
    } else {
      console.error(`  ${loc}: ${mismatches.length} placeholder mismatch(es):`);
      mismatches.forEach(m =>
        console.error(`    ${m.key}: EN={${m.en.join(',')}} ${loc.toUpperCase()}={${m.loc.join(',')}}`)
      );
      exitCode = 1;
    }
  }
}

console.log('\n' + (exitCode === 0 ? '✓ All checks passed!' : '✗ Issues found - see above'));
process.exit(exitCode);
