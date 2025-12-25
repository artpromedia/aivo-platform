/**
 * AIVO i18n CLI - Analyzer
 *
 * Analyzes translation usage and finds missing/unused keys.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import glob from 'fast-glob';

import type { ExtractedKey } from './extractor.js';

export interface AnalysisResult {
  totalKeys: number;
  translatedKeys: number;
  missingKeys: ExtractedKey[];
  unusedKeys: string[];
  coveragePercent: number;
  byLocale: Map<string, LocaleAnalysis>;
  byNamespace: Map<string, NamespaceAnalysis>;
}

export interface LocaleAnalysis {
  locale: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  coveragePercent: number;
}

export interface NamespaceAnalysis {
  namespace: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  unusedKeys: string[];
}

export interface AnalyzerOptions {
  localesDir: string;
  locales: string[];
  namespaces?: string[];
}

/**
 * Analyze translation coverage
 */
export async function analyzeTranslations(
  extractedKeys: ExtractedKey[],
  options: AnalyzerOptions
): Promise<AnalysisResult> {
  const { localesDir, locales, namespaces } = options;

  const byLocale = new Map<string, LocaleAnalysis>();
  const byNamespace = new Map<string, NamespaceAnalysis>();
  const allMissing: ExtractedKey[] = [];
  const allUnused = new Set<string>();

  // Get all keys from extracted
  const extractedKeySet = new Set(extractedKeys.map((k) => `${k.namespace}:${k.key}`));

  // Analyze each locale
  for (const locale of locales) {
    const localeDir = path.join(localesDir, locale);
    const localeMissing: string[] = [];
    let translatedCount = 0;

    try {
      const files = await glob('*.json', { cwd: localeDir });
      const translatedKeys = new Set<string>();

      for (const file of files) {
        const namespace = path.basename(file, '.json');
        const content = await fs.readFile(path.join(localeDir, file), 'utf-8');
        const translations = JSON.parse(content);

        // Flatten nested keys
        const flatKeys = flattenObject(translations);

        for (const key of Object.keys(flatKeys)) {
          translatedKeys.add(`${namespace}:${key}`);
        }
      }

      // Find missing and translated
      for (const extracted of extractedKeys) {
        const fullKey = `${extracted.namespace}:${extracted.key}`;
        if (translatedKeys.has(fullKey)) {
          translatedCount++;
        } else {
          localeMissing.push(extracted.key);
          allMissing.push(extracted);
        }
      }

      // Find unused (only for base locale)
      if (locale === locales[0]) {
        for (const translatedKey of translatedKeys) {
          if (!extractedKeySet.has(translatedKey)) {
            allUnused.add(translatedKey);
          }
        }
      }

      byLocale.set(locale, {
        locale,
        totalKeys: extractedKeys.length,
        translatedKeys: translatedCount,
        missingKeys: localeMissing,
        coveragePercent:
          extractedKeys.length > 0
            ? Math.round((translatedCount / extractedKeys.length) * 100)
            : 100,
      });
    } catch (error) {
      // Locale directory doesn't exist
      byLocale.set(locale, {
        locale,
        totalKeys: extractedKeys.length,
        translatedKeys: 0,
        missingKeys: extractedKeys.map((k) => k.key),
        coveragePercent: 0,
      });
    }
  }

  // Analyze by namespace
  const namespaceGroups = new Map<string, ExtractedKey[]>();
  for (const key of extractedKeys) {
    const ns = key.namespace ?? 'common';
    const existing = namespaceGroups.get(ns) ?? [];
    existing.push(key);
    namespaceGroups.set(ns, existing);
  }

  for (const [namespace, nsKeys] of namespaceGroups) {
    const missingInNs = allMissing.filter((k) => k.namespace === namespace);
    const unusedInNs = Array.from(allUnused).filter((k) => k.startsWith(`${namespace}:`));

    byNamespace.set(namespace, {
      namespace,
      totalKeys: nsKeys.length,
      translatedKeys: nsKeys.length - missingInNs.length,
      missingKeys: missingInNs.map((k) => k.key),
      unusedKeys: unusedInNs.map((k) => k.split(':')[1]),
    });
  }

  // Deduplicate missing keys
  const uniqueMissing = deduplicateByKey(allMissing);

  // Calculate overall coverage
  const baseLocale = byLocale.get(locales[0]);

  return {
    totalKeys: extractedKeys.length,
    translatedKeys: baseLocale?.translatedKeys ?? 0,
    missingKeys: uniqueMissing,
    unusedKeys: Array.from(allUnused),
    coveragePercent: baseLocale?.coveragePercent ?? 0,
    byLocale,
    byNamespace,
  };
}

/**
 * Flatten nested object to dot notation
 */
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }

  return result;
}

/**
 * Deduplicate keys
 */
function deduplicateByKey(keys: ExtractedKey[]): ExtractedKey[] {
  const seen = new Set<string>();
  const result: ExtractedKey[] = [];

  for (const key of keys) {
    const id = `${key.namespace}:${key.key}`;
    if (!seen.has(id)) {
      seen.add(id);
      result.push(key);
    }
  }

  return result;
}

/**
 * Compare translations between locales
 */
export async function compareLocales(
  sourceLocale: string,
  targetLocale: string,
  localesDir: string
): Promise<{
  sourceOnly: string[];
  targetOnly: string[];
  common: string[];
}> {
  const sourceDir = path.join(localesDir, sourceLocale);
  const targetDir = path.join(localesDir, targetLocale);

  const sourceKeys = await getAllKeysInLocale(sourceDir);
  const targetKeys = await getAllKeysInLocale(targetDir);

  const sourceSet = new Set(sourceKeys);
  const targetSet = new Set(targetKeys);

  return {
    sourceOnly: sourceKeys.filter((k) => !targetSet.has(k)),
    targetOnly: targetKeys.filter((k) => !sourceSet.has(k)),
    common: sourceKeys.filter((k) => targetSet.has(k)),
  };
}

/**
 * Get all keys in a locale directory
 */
async function getAllKeysInLocale(localeDir: string): Promise<string[]> {
  const keys: string[] = [];

  try {
    const files = await glob('*.json', { cwd: localeDir });

    for (const file of files) {
      const namespace = path.basename(file, '.json');
      const content = await fs.readFile(path.join(localeDir, file), 'utf-8');
      const translations = JSON.parse(content);
      const flatKeys = flattenObject(translations);

      for (const key of Object.keys(flatKeys)) {
        keys.push(`${namespace}:${key}`);
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return keys;
}
