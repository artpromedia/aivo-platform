#!/usr/bin/env node
/**
 * Add Coverage Thresholds to All vitest.config.ts Files
 *
 * Sprint 8: Enforces minimum coverage gates in all vitest configs.
 * Adds v8 coverage provider and threshold configuration.
 *
 * Usage: node scripts/add-coverage-thresholds.js [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ── Critical services get higher thresholds ──
const CRITICAL_SERVICES = new Set([
  'auth-svc',
  'billing-svc',
  'payments-svc',
  'ai-orchestrator',
  'assessment-svc',
  'tenant-svc',
  'notify-svc',
  'content-svc',
  'lti-svc',
  'analytics-svc',
]);

const CRITICAL_THRESHOLDS = {
  lines: 90,
  branches: 85,
  functions: 90,
  statements: 90,
};

const STANDARD_THRESHOLDS = {
  lines: 80,
  branches: 75,
  functions: 80,
  statements: 80,
};

const dryRun = process.argv.includes('--dry-run');

function findVitestConfigs() {
  const configs = [];

  // Services
  const servicesDir = join(ROOT, 'services');
  if (existsSync(servicesDir)) {
    for (const entry of readdirSync(servicesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const configPath = join(servicesDir, entry.name, 'vitest.config.ts');
      if (existsSync(configPath)) {
        configs.push({
          path: configPath,
          name: entry.name,
          type: 'service',
          isCritical: CRITICAL_SERVICES.has(entry.name),
        });
      }
    }
  }

  // Packages
  const packagesDir = join(ROOT, 'packages');
  if (existsSync(packagesDir)) {
    for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const configPath = join(packagesDir, entry.name, 'vitest.config.ts');
      if (existsSync(configPath)) {
        configs.push({ path: configPath, name: entry.name, type: 'package', isCritical: false });
      }
    }
  }

  // Libs
  const libsDir = join(ROOT, 'libs');
  if (existsSync(libsDir)) {
    for (const entry of readdirSync(libsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const configPath = join(libsDir, entry.name, 'vitest.config.ts');
      if (existsSync(configPath)) {
        configs.push({ path: configPath, name: entry.name, type: 'lib', isCritical: false });
      }
    }
  }

  // Apps
  const appsDir = join(ROOT, 'apps');
  if (existsSync(appsDir)) {
    for (const entry of readdirSync(appsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const configPath = join(appsDir, entry.name, 'vitest.config.ts');
      if (existsSync(configPath)) {
        configs.push({ path: configPath, name: entry.name, type: 'app', isCritical: false });
      }
    }
  }

  return configs;
}

function addThresholds(configPath, thresholds) {
  let content = readFileSync(configPath, 'utf-8');

  // Check if thresholds already exist
  if (content.includes('thresholds')) {
    return { skipped: true, reason: 'thresholds already present' };
  }

  const thresholdBlock = `
      thresholds: {
        lines: ${thresholds.lines},
        branches: ${thresholds.branches},
        functions: ${thresholds.functions},
        statements: ${thresholds.statements},
      },`;

  // Case 1: Has coverage section — insert thresholds + ensure provider: 'v8'
  if (content.includes('coverage:') || content.includes('coverage :{')) {
    // Find the coverage block and add thresholds after the last property
    // Look for the closing brace of coverage

    // Add provider if missing
    if (!content.includes("provider:") && content.includes("coverage:")) {
      content = content.replace(
        /coverage:\s*\{/,
        `coverage: {\n      provider: 'v8',`
      );
    }

    // Insert thresholds before the closing brace of coverage
    // Find coverage: { ... } and add thresholds before closing }
    const coverageMatch = content.match(/(coverage:\s*\{[^}]*)(})/);
    if (coverageMatch) {
      const insertPos = content.indexOf(coverageMatch[0]) + coverageMatch[1].length;
      content =
        content.substring(0, insertPos) +
        thresholdBlock + '\n    ' +
        content.substring(insertPos);
    }
  }
  // Case 2: Has test section but no coverage — add coverage with thresholds
  else if (content.includes('test:') || content.includes('test :{')) {
    // Find the closing of the test block and insert coverage before it
    // Insert before the last } of the test object
    const testMatch = content.match(/(test:\s*\{)/);
    if (testMatch) {
      const coverageBlock = `\n    coverage: {\n      provider: 'v8',\n      reporter: ['text', 'json', 'lcov'],${thresholdBlock}\n    },`;
      // Insert right after test: {
      content = content.replace(
        testMatch[1],
        testMatch[1] + coverageBlock
      );
    }
  }

  return { content, modified: true };
}

function main() {
  const configs = findVitestConfigs();
  console.log(`Found ${configs.length} vitest.config.ts files\n`);

  let modified = 0;
  let skipped = 0;
  let errors = 0;

  for (const config of configs) {
    const thresholds = config.isCritical ? CRITICAL_THRESHOLDS : STANDARD_THRESHOLDS;
    const relPath = relative(ROOT, config.path);
    const tag = config.isCritical ? ' [CRITICAL]' : '';

    try {
      const result = addThresholds(config.path, thresholds);

      if (result.skipped) {
        console.log(`  SKIP  ${relPath} — ${result.reason}`);
        skipped++;
      } else if (result.modified) {
        if (dryRun) {
          console.log(`  [DRY] ${relPath}${tag} — would add thresholds`);
        } else {
          writeFileSync(config.path, result.content, 'utf-8');
          console.log(`  ✓     ${relPath}${tag} — thresholds added`);
        }
        modified++;
      }
    } catch (err) {
      console.log(`  ✗     ${relPath} — ERROR: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Results: ${modified} modified, ${skipped} skipped, ${errors} errors`);
  if (dryRun) console.log('(Dry run — no files were actually written)');
}

main();
