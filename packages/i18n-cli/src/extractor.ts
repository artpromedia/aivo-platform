/**
 * AIVO i18n CLI - Translation Key Extractor
 *
 * Extracts translation keys from source code for various file types.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import glob from 'fast-glob';

export interface ExtractedKey {
  key: string;
  namespace?: string;
  defaultValue?: string;
  context?: string;
  count?: boolean;
  filePath: string;
  line: number;
  column: number;
}

export interface ExtractorOptions {
  patterns: string[];
  exclude?: string[];
  defaultNamespace?: string;
  functionNames?: string[];
  componentNames?: string[];
}

const DEFAULT_FUNCTION_NAMES = ['t', 'i18n.t', 'translate', 'useTranslation'];
const DEFAULT_COMPONENT_NAMES = ['Trans', 'Tr', 'FormattedMessage'];

/**
 * Extract translation keys from TypeScript/JavaScript files
 */
export async function extractKeys(options: ExtractorOptions): Promise<ExtractedKey[]> {
  const {
    patterns,
    exclude = ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
    defaultNamespace = 'common',
    functionNames = DEFAULT_FUNCTION_NAMES,
    componentNames = DEFAULT_COMPONENT_NAMES,
  } = options;

  const files = await glob(patterns, { ignore: exclude });
  const allKeys: ExtractedKey[] = [];

  for (const filePath of files) {
    const keys = await extractKeysFromFile(filePath, {
      defaultNamespace,
      functionNames,
      componentNames,
    });
    allKeys.push(...keys);
  }

  return deduplicateKeys(allKeys);
}

interface FileExtractorOptions {
  defaultNamespace: string;
  functionNames: string[];
  componentNames: string[];
}

/**
 * Extract keys from a single file
 */
export async function extractKeysFromFile(
  filePath: string,
  options: FileExtractorOptions
): Promise<ExtractedKey[]> {
  const ext = path.extname(filePath).toLowerCase();

  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    return extractFromJavaScript(filePath, options);
  } else if (['.dart'].includes(ext)) {
    return extractFromDart(filePath, options);
  }

  return [];
}

/**
 * Extract keys from JavaScript/TypeScript files
 */
async function extractFromJavaScript(
  filePath: string,
  options: FileExtractorOptions
): Promise<ExtractedKey[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const keys: ExtractedKey[] = [];

  try {
    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties'],
    });

    traverse(ast, {
      // Handle function calls: t('key'), i18n.t('key'), etc.
      CallExpression(nodePath) {
        const { node } = nodePath;
        let funcName = '';

        if (node.callee.type === 'Identifier') {
          funcName = node.callee.name;
        } else if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.property.type === 'Identifier'
        ) {
          funcName = `${node.callee.object.name}.${node.callee.property.name}`;
        }

        if (options.functionNames.includes(funcName)) {
          const firstArg = node.arguments[0];
          if (firstArg?.type === 'StringLiteral') {
            const key = firstArg.value;
            const extracted: ExtractedKey = {
              key,
              namespace: options.defaultNamespace,
              filePath,
              line: node.loc?.start.line ?? 0,
              column: node.loc?.start.column ?? 0,
            };

            // Check for options object
            const secondArg = node.arguments[1];
            if (secondArg?.type === 'ObjectExpression') {
              for (const prop of secondArg.properties) {
                if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
                  if (prop.key.name === 'namespace' && prop.value.type === 'StringLiteral') {
                    extracted.namespace = prop.value.value;
                  }
                  if (prop.key.name === 'defaultValue' && prop.value.type === 'StringLiteral') {
                    extracted.defaultValue = prop.value.value;
                  }
                  if (prop.key.name === 'count') {
                    extracted.count = true;
                  }
                }
              }
            }

            keys.push(extracted);
          }
        }
      },

      // Handle JSX components: <Trans i18nKey="key" />
      JSXOpeningElement(nodePath) {
        const { node } = nodePath;

        if (node.name.type === 'JSXIdentifier' && options.componentNames.includes(node.name.name)) {
          for (const attr of node.attributes) {
            if (
              attr.type === 'JSXAttribute' &&
              attr.name.type === 'JSXIdentifier' &&
              (attr.name.name === 'i18nKey' || attr.name.name === 'translationKey')
            ) {
              if (attr.value?.type === 'StringLiteral') {
                keys.push({
                  key: attr.value.value,
                  namespace: options.defaultNamespace,
                  filePath,
                  line: node.loc?.start.line ?? 0,
                  column: node.loc?.start.column ?? 0,
                });
              }
            }
          }
        }
      },
    });
  } catch (error) {
    console.warn(`Failed to parse ${filePath}:`, error);
  }

  return keys;
}

/**
 * Extract keys from Dart files
 */
async function extractFromDart(
  filePath: string,
  options: FileExtractorOptions
): Promise<ExtractedKey[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const keys: ExtractedKey[] = [];

  // Match patterns like:
  // t('key')
  // i18n.t('key')
  // context.t('key')
  // Tr('key')
  const patterns = [
    /\bt\(\s*['"]([^'"]+)['"]/g,
    /i18n\.t\(\s*['"]([^'"]+)['"]/g,
    /context\.t\(\s*['"]([^'"]+)['"]/g,
    /\bTr\(\s*['"]([^'"]+)['"]/g,
  ];

  const lines = content.split('\n');

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1];
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      const lastNewline = beforeMatch.lastIndexOf('\n');
      const column = match.index - lastNewline - 1;

      keys.push({
        key,
        namespace: options.defaultNamespace,
        filePath,
        line: lineNumber,
        column,
      });
    }
  }

  return keys;
}

/**
 * Remove duplicate keys
 */
function deduplicateKeys(keys: ExtractedKey[]): ExtractedKey[] {
  const seen = new Map<string, ExtractedKey>();

  for (const key of keys) {
    const id = `${key.namespace}:${key.key}`;
    if (!seen.has(id)) {
      seen.set(id, key);
    }
  }

  return Array.from(seen.values());
}

/**
 * Group keys by namespace
 */
export function groupByNamespace(keys: ExtractedKey[]): Map<string, ExtractedKey[]> {
  const grouped = new Map<string, ExtractedKey[]>();

  for (const key of keys) {
    const namespace = key.namespace ?? 'common';
    const existing = grouped.get(namespace) ?? [];
    existing.push(key);
    grouped.set(namespace, existing);
  }

  return grouped;
}

/**
 * Sort keys alphabetically
 */
export function sortKeys(keys: ExtractedKey[]): ExtractedKey[] {
  return [...keys].sort((a, b) => a.key.localeCompare(b.key));
}
