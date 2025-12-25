/**
 * AIVO i18n CLI
 *
 * Programmatic API for translation management.
 */

export { extractKeys, extractKeysFromFile, groupByNamespace, sortKeys } from './extractor.js';
export type { ExtractedKey, ExtractorOptions } from './extractor.js';

export { generateOutput } from './generator.js';
export type { OutputOptions } from './generator.js';

export { analyzeTranslations, compareLocales } from './analyzer.js';
export type {
  AnalysisResult,
  LocaleAnalysis,
  NamespaceAnalysis,
  AnalyzerOptions,
} from './analyzer.js';
