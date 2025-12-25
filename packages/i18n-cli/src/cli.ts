#!/usr/bin/env node
/**
 * AIVO i18n CLI
 *
 * Command-line tool for managing translations.
 *
 * Commands:
 *   extract  - Extract translation keys from source code
 *   analyze  - Analyze translation coverage
 *   sync     - Sync translation files
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import chalk from 'chalk';
import { Command } from 'commander';

import { analyzeTranslations, compareLocales } from './analyzer.js';
import { extractKeys, groupByNamespace, sortKeys } from './extractor.js';
import { generateOutput } from './generator.js';

const program = new Command();

program.name('aivo-i18n').description('AIVO internationalization CLI tools').version('1.0.0');

// Extract command
program
  .command('extract')
  .description('Extract translation keys from source code')
  .option('-p, --patterns <patterns...>', 'File patterns to search', ['**/*.{ts,tsx,js,jsx,dart}'])
  .option('-e, --exclude <patterns...>', 'Patterns to exclude', [
    '**/node_modules/**',
    '**/dist/**',
  ])
  .option('-o, --output <dir>', 'Output directory', './locales')
  .option('-f, --format <format>', 'Output format (json, pot, arb)', 'json')
  .option('-l, --locales <locales...>', 'Target locales', ['en'])
  .option('--flat', 'Use flat JSON structure instead of nested', false)
  .option('--default-namespace <ns>', 'Default namespace', 'common')
  .action(async (options) => {
    console.log(chalk.blue('🔍 Extracting translation keys...'));

    try {
      const keys = await extractKeys({
        patterns: options.patterns,
        exclude: options.exclude,
        defaultNamespace: options.defaultNamespace,
      });

      console.log(chalk.green(`✓ Found ${keys.length} translation keys`));

      // Group by namespace
      const grouped = groupByNamespace(keys);
      for (const [namespace, nsKeys] of grouped) {
        console.log(`  ${chalk.dim('•')} ${namespace}: ${nsKeys.length} keys`);
      }

      // Generate output
      await generateOutput(keys, {
        outputDir: options.output,
        format: options.format,
        locales: options.locales,
        flat: options.flat,
      });

      console.log(chalk.green(`✓ Generated translation files in ${options.output}`));
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Analyze command
program
  .command('analyze')
  .description('Analyze translation coverage')
  .option('-s, --source <patterns...>', 'Source file patterns', ['**/*.{ts,tsx,js,jsx,dart}'])
  .option('-l, --locales-dir <dir>', 'Locales directory', './locales')
  .option('-t, --target <locales...>', 'Target locales to analyze', ['en', 'es', 'ar'])
  .option('--json', 'Output as JSON', false)
  .action(async (options) => {
    console.log(chalk.blue('📊 Analyzing translations...'));

    try {
      const keys = await extractKeys({
        patterns: options.source,
      });

      const result = await analyzeTranslations(keys, {
        localesDir: options.localesDir,
        locales: options.target,
      });

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              totalKeys: result.totalKeys,
              translatedKeys: result.translatedKeys,
              coveragePercent: result.coveragePercent,
              missingKeys: result.missingKeys.map((k) => k.key),
              unusedKeys: result.unusedKeys,
              byLocale: Object.fromEntries(result.byLocale),
              byNamespace: Object.fromEntries(result.byNamespace),
            },
            null,
            2
          )
        );
      } else {
        // Print summary
        console.log('');
        console.log(chalk.bold('Summary'));
        console.log('─'.repeat(40));
        console.log(`Total keys:     ${result.totalKeys}`);
        console.log(`Translated:     ${result.translatedKeys}`);
        console.log(
          `Coverage:       ${getCoverageColor(result.coveragePercent)}${result.coveragePercent}%${chalk.reset}`
        );
        console.log(`Missing:        ${result.missingKeys.length}`);
        console.log(`Unused:         ${result.unusedKeys.length}`);
        console.log('');

        // Print by locale
        console.log(chalk.bold('By Locale'));
        console.log('─'.repeat(40));
        for (const [locale, analysis] of result.byLocale) {
          const coverage = getCoverageColor(analysis.coveragePercent);
          console.log(
            `${locale.padEnd(10)} ${coverage}${analysis.coveragePercent}%${chalk.reset} (${analysis.missingKeys.length} missing)`
          );
        }
        console.log('');

        // Print missing keys (limited)
        if (result.missingKeys.length > 0) {
          console.log(chalk.bold('Missing Keys (top 10)'));
          console.log('─'.repeat(40));
          for (const key of result.missingKeys.slice(0, 10)) {
            console.log(`  ${chalk.red('•')} ${key.namespace}:${key.key}`);
            console.log(`    ${chalk.dim(`${key.filePath}:${key.line}`)}`);
          }
          if (result.missingKeys.length > 10) {
            console.log(`  ${chalk.dim(`... and ${result.missingKeys.length - 10} more`)}`);
          }
          console.log('');
        }

        // Print unused keys (limited)
        if (result.unusedKeys.length > 0) {
          console.log(chalk.bold('Unused Keys (top 10)'));
          console.log('─'.repeat(40));
          for (const key of result.unusedKeys.slice(0, 10)) {
            console.log(`  ${chalk.yellow('•')} ${key}`);
          }
          if (result.unusedKeys.length > 10) {
            console.log(`  ${chalk.dim(`... and ${result.unusedKeys.length - 10} more`)}`);
          }
        }
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Compare command
program
  .command('compare')
  .description('Compare translations between locales')
  .argument('<source>', 'Source locale')
  .argument('<target>', 'Target locale')
  .option('-d, --dir <dir>', 'Locales directory', './locales')
  .action(async (source, target, options) => {
    console.log(chalk.blue(`📊 Comparing ${source} with ${target}...`));

    try {
      const result = await compareLocales(source, target, options.dir);

      console.log('');
      console.log(chalk.bold(`Keys in ${source} only: ${result.sourceOnly.length}`));
      for (const key of result.sourceOnly.slice(0, 10)) {
        console.log(`  ${chalk.red('•')} ${key}`);
      }
      if (result.sourceOnly.length > 10) {
        console.log(`  ${chalk.dim(`... and ${result.sourceOnly.length - 10} more`)}`);
      }

      console.log('');
      console.log(chalk.bold(`Keys in ${target} only: ${result.targetOnly.length}`));
      for (const key of result.targetOnly.slice(0, 10)) {
        console.log(`  ${chalk.yellow('•')} ${key}`);
      }
      if (result.targetOnly.length > 10) {
        console.log(`  ${chalk.dim(`... and ${result.targetOnly.length - 10} more`)}`);
      }

      console.log('');
      console.log(chalk.green(`Common keys: ${result.common.length}`));
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync')
  .description('Sync translation files across locales')
  .option('-s, --source <locale>', 'Source locale', 'en')
  .option('-t, --target <locales...>', 'Target locales')
  .option('-d, --dir <dir>', 'Locales directory', './locales')
  .option('--dry-run', 'Show what would be changed', false)
  .action(async (options) => {
    const { source, target, dir, dryRun } = options;

    if (!target || target.length === 0) {
      console.error(chalk.red('Error: No target locales specified'));
      process.exit(1);
    }

    console.log(chalk.blue(`🔄 Syncing translations from ${source}...`));

    try {
      const sourceDir = path.join(dir, source);
      const files = await fs.readdir(sourceDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const sourceContent = await fs.readFile(path.join(sourceDir, file), 'utf-8');
        const sourceData = JSON.parse(sourceContent);

        for (const locale of target) {
          const targetPath = path.join(dir, locale, file);
          let targetData: Record<string, unknown> = {};

          try {
            const targetContent = await fs.readFile(targetPath, 'utf-8');
            targetData = JSON.parse(targetContent);
          } catch {
            // Target file doesn't exist
          }

          // Merge missing keys
          const merged = deepMerge(sourceData, targetData);
          const added = countNewKeys(sourceData, targetData);

          if (added > 0) {
            if (dryRun) {
              console.log(`  ${chalk.dim('•')} Would add ${added} keys to ${locale}/${file}`);
            } else {
              await fs.mkdir(path.join(dir, locale), { recursive: true });
              await fs.writeFile(targetPath, JSON.stringify(merged, null, 2) + '\n');
              console.log(`  ${chalk.green('✓')} Added ${added} keys to ${locale}/${file}`);
            }
          }
        }
      }

      if (dryRun) {
        console.log(chalk.dim('\nRun without --dry-run to apply changes'));
      } else {
        console.log(chalk.green('\n✓ Sync complete'));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Helper functions
function getCoverageColor(percent: number): string {
  if (percent >= 90) return chalk.green.toString();
  if (percent >= 70) return chalk.yellow.toString();
  return chalk.red.toString();
}

function deepMerge(
  source: Record<string, unknown>,
  target: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (!(key in result)) {
      result[key] = value;
    } else if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        value as Record<string, unknown>,
        result[key] as Record<string, unknown>
      );
    }
  }

  return result;
}

function countNewKeys(source: Record<string, unknown>, target: Record<string, unknown>): number {
  let count = 0;

  for (const [key, value] of Object.entries(source)) {
    if (!(key in target)) {
      count++;
    } else if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      count += countNewKeys(
        value as Record<string, unknown>,
        target[key] as Record<string, unknown>
      );
    }
  }

  return count;
}

program.parse();
