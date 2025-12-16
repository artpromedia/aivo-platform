/**
 * Privacy Guard Module
 *
 * Implements de-identification, k-anonymity, and other privacy controls
 * for research data exports. FERPA/COPPA compliant.
 */

import crypto from 'node:crypto';

import { config } from '../config.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface PrivacyConstraints {
  minCellSize: number; // Minimum learners per cohort (k-anonymity)
  maxDimensions: number; // Max grouping dimensions to prevent narrow groups
  excludeColumns: string[]; // Columns to remove
  dateCoarsening: 'day' | 'week' | 'month'; // Date precision
  noiseInjection?: {
    enabled: boolean;
    magnitude: number; // Percentage of noise (e.g., 0.05 = 5%)
  };
}

export interface TransformResult {
  rows: Record<string, unknown>[];
  originalRowCount: number;
  suppressedRowCount: number;
  transformations: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// De-identification Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pseudonymize an identifier using HMAC-SHA256
 * Uses a per-export salt to ensure consistent but non-reversible IDs
 */
export function pseudonymize(identifier: string, exportId: string): string {
  const hmac = crypto.createHmac('sha256', config.deidentificationSalt);
  hmac.update(`${exportId}:${identifier}`);
  return `ANON_${hmac.digest('hex').substring(0, 16).toUpperCase()}`;
}

/**
 * Generalize age to age bands
 */
export function generalizeAge(birthDate: Date | null): string | null {
  if (!birthDate) return null;
  const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 5) return '0-4';
  if (age < 10) return '5-9';
  if (age < 15) return '10-14';
  if (age < 18) return '15-17';
  return '18+';
}

/**
 * Coarsen timestamp to reduce precision
 */
export function coarsenDate(date: Date, precision: 'day' | 'week' | 'month'): string {
  const d = new Date(date);

  const getDateOnly = (date: Date): string => {
    const isoStr = date.toISOString();
    return isoStr.split('T')[0] ?? isoStr.substring(0, 10);
  };

  switch (precision) {
    case 'day':
      return getDateOnly(d);
    case 'week': {
      // Round to start of week (Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      return getDateOnly(d);
    }
    case 'month':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    default:
      return getDateOnly(d);
  }
}

/**
 * Add noise to a numeric value
 */
export function addNoise(value: number, magnitude: number): number {
  const noise = (Math.random() - 0.5) * 2 * magnitude * value;
  return Math.round(value + noise);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Row Transformation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Transform a single row according to privacy constraints
 */
export function transformRow(
  row: Record<string, unknown>,
  exportId: string,
  constraints: PrivacyConstraints
): Record<string, unknown> {
  const transformed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    // Skip excluded columns
    if (constraints.excludeColumns.includes(key)) {
      continue;
    }

    // Pseudonymize ID columns
    if (key.endsWith('_id') || key === 'learnerId' || key === 'sessionId') {
      transformed[`anonymized_${key}`] = pseudonymize(String(value), exportId);
      continue;
    }

    // Coarsen date columns
    if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) {
      const date = value instanceof Date ? value : new Date(value);
      transformed[key] = coarsenDate(date, constraints.dateCoarsening);
      continue;
    }

    // Add noise to numeric columns if enabled
    if (constraints.noiseInjection?.enabled && typeof value === 'number') {
      transformed[key] = addNoise(value, constraints.noiseInjection.magnitude);
      continue;
    }

    // Pass through other columns
    transformed[key] = value;
  }

  return transformed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// K-Anonymity Enforcement
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check and enforce k-anonymity on aggregated data
 * Suppresses rows where the learner count is below threshold
 */
export function enforceKAnonymity(
  rows: Record<string, unknown>[],
  learnerCountColumn: string,
  minCellSize: number
): { rows: Record<string, unknown>[]; suppressedCount: number } {
  const validRows: Record<string, unknown>[] = [];
  let suppressedCount = 0;

  for (const row of rows) {
    const count = row[learnerCountColumn];
    if (typeof count === 'number' && count >= minCellSize) {
      validRows.push(row);
    } else {
      suppressedCount++;
    }
  }

  return { rows: validRows, suppressedCount };
}

/**
 * Check if dataset dimensions could lead to re-identification
 */
export function validateDimensions(
  dimensions: string[],
  maxDimensions: number
): { valid: boolean; error?: string } {
  if (dimensions.length > maxDimensions) {
    return {
      valid: false,
      error: `Too many dimensions (${dimensions.length}). Maximum allowed: ${maxDimensions}`,
    };
  }

  // Check for high-cardinality combinations that could be risky
  const riskyDimensions = new Set(['school_id', 'classroom_id', 'teacher_id']);
  const riskyCount = dimensions.filter((d) => riskyDimensions.has(d)).length;

  if (riskyCount > 1) {
    return {
      valid: false,
      error: 'Cannot combine multiple high-cardinality dimensions (school, classroom, teacher)',
    };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Transform Function
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply all privacy transformations to a dataset
 */
export function transformDataset(
  rows: Record<string, unknown>[],
  exportId: string,
  constraints: PrivacyConstraints,
  options: {
    learnerCountColumn?: string;
    isAggregated?: boolean;
  } = {}
): TransformResult {
  const transformations: string[] = [];
  let workingRows = rows;
  const originalRowCount = rows.length;
  let suppressedRowCount = 0;

  // 1. Remove excluded columns and apply transformations
  workingRows = workingRows.map((row) => transformRow(row, exportId, constraints));
  transformations.push(`Transformed ${originalRowCount} rows`);

  if (constraints.excludeColumns.length > 0) {
    transformations.push(`Excluded columns: ${constraints.excludeColumns.join(', ')}`);
  }

  transformations.push(`Date coarsening: ${constraints.dateCoarsening}`);

  // 2. Apply k-anonymity if this is aggregated data
  if (options.isAggregated && options.learnerCountColumn) {
    const result = enforceKAnonymity(
      workingRows,
      options.learnerCountColumn,
      constraints.minCellSize
    );
    workingRows = result.rows;
    suppressedRowCount = result.suppressedCount;
    transformations.push(
      `K-anonymity (k=${constraints.minCellSize}): ${suppressedRowCount} rows suppressed`
    );
  }

  // 3. Add noise if enabled
  if (constraints.noiseInjection?.enabled) {
    transformations.push(`Noise injection: ${constraints.noiseInjection.magnitude * 100}%`);
  }

  return {
    rows: workingRows,
    originalRowCount,
    suppressedRowCount,
    transformations,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Default Constraints by Granularity
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_CONSTRAINTS: Record<string, PrivacyConstraints> = {
  AGGREGATED: {
    minCellSize: 10,
    maxDimensions: 3,
    excludeColumns: ['learner_id', 'session_id', 'exact_timestamp', 'ip_address'],
    dateCoarsening: 'month',
    noiseInjection: { enabled: false, magnitude: 0 },
  },
  DEIDENTIFIED_LEARNER_LEVEL: {
    minCellSize: 10,
    maxDimensions: 4,
    excludeColumns: ['name', 'email', 'address', 'phone', 'ip_address'],
    dateCoarsening: 'week',
    noiseInjection: { enabled: false, magnitude: 0 },
  },
  INTERNAL_LEARNER_LEVEL: {
    minCellSize: 5,
    maxDimensions: 6,
    excludeColumns: ['email', 'address', 'phone'],
    dateCoarsening: 'day',
    noiseInjection: { enabled: false, magnitude: 0 },
  },
};
