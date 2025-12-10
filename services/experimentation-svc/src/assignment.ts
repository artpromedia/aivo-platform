/**
 * Assignment Logic
 *
 * Deterministic hash-based assignment for experiments.
 * Uses SHA-256 hash to ensure consistent assignments across restarts.
 */

import { createHash } from 'crypto';

import { config } from './config.js';
import type {
  Experiment,
  ExperimentVariant,
  AssignmentResult,
  AssignmentReason,
  VariantConfig,
} from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// HASH-BASED ASSIGNMENT
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Maximum value for a 64-bit unsigned integer.
 * Used to normalize hash to [0, 1) range.
 */
const MAX_UINT64 = BigInt('18446744073709551615');

/**
 * Compute a deterministic bucket value from experiment key and subject ID.
 * Returns a value in [0, 1) range.
 */
export function computeBucket(experimentKey: string, subjectId: string): number {
  const input = `${experimentKey}:${subjectId}`;
  const hash = createHash('sha256').update(input).digest();

  // Use first 8 bytes as a 64-bit unsigned integer (big endian)
  const hashValue = hash.readBigUInt64BE(0);

  // Normalize to [0, 1) range
  return Number(hashValue) / Number(MAX_UINT64);
}

/**
 * Determine which variant a bucket value falls into.
 * Variants are ordered and their allocations are treated as cumulative ranges.
 */
export function selectVariant(
  bucket: number,
  variants: ExperimentVariant[]
): ExperimentVariant | null {
  // Sort variants by key for deterministic ordering
  const sortedVariants = [...variants].sort((a, b) => a.key.localeCompare(b.key));

  let cumulative = 0;
  for (const variant of sortedVariants) {
    cumulative += variant.allocation;
    if (bucket < cumulative) {
      return variant;
    }
  }

  // Edge case: bucket is exactly 1.0 or rounding issues
  // Return last variant
  return sortedVariants[sortedVariants.length - 1] ?? null;
}

/**
 * Get the subject ID for assignment based on experiment scope.
 */
export function getSubjectId(experiment: Experiment, tenantId: string, learnerId?: string): string {
  if (experiment.scope === 'TENANT') {
    return tenantId;
  }

  // LEARNER scope requires a learner ID
  if (!learnerId) {
    throw new Error(`Experiment '${experiment.key}' requires learnerId for LEARNER scope`);
  }

  return learnerId;
}

// ════════════════════════════════════════════════════════════════════════════════
// ASSIGNMENT LOGIC
// ════════════════════════════════════════════════════════════════════════════════

export interface AssignmentContext {
  experiment: Experiment;
  variants: ExperimentVariant[];
  tenantId: string;
  learnerId?: string;
  experimentationEnabled: boolean;
  forceVariant?: string;
}

/**
 * Compute assignment for a given context.
 * This is the core assignment logic used by the service.
 */
export function computeAssignment(ctx: AssignmentContext): AssignmentResult {
  const { experiment, variants, tenantId, learnerId, experimentationEnabled, forceVariant } = ctx;

  // Check if tenant has opted out of experimentation
  if (!experimentationEnabled) {
    return createControlResult(experiment.key, variants, 'TENANT_OPT_OUT');
  }

  // Check if experiment is running
  if (experiment.status !== 'RUNNING') {
    return createControlResult(experiment.key, variants, 'EXPERIMENT_NOT_RUNNING');
  }

  // Check time bounds
  const now = new Date();
  if (experiment.start_at && now < experiment.start_at) {
    return createControlResult(experiment.key, variants, 'EXPERIMENT_NOT_RUNNING');
  }
  if (experiment.end_at && now > experiment.end_at) {
    return createControlResult(experiment.key, variants, 'EXPERIMENT_NOT_RUNNING');
  }

  // Handle forced variant (for testing)
  if (forceVariant) {
    const forcedVariant = variants.find((v) => v.key === forceVariant);
    if (forcedVariant) {
      return {
        experimentKey: experiment.key,
        variantKey: forcedVariant.key,
        config: forcedVariant.config_json,
        reason: 'FORCED_VARIANT',
        assigned: true,
      };
    }
    // Forced variant not found, fall through to hash assignment
  }

  // Compute hash-based assignment
  const subjectId = getSubjectId(experiment, tenantId, learnerId);
  const bucket = computeBucket(experiment.key, subjectId);
  const selectedVariant = selectVariant(bucket, variants);

  if (!selectedVariant) {
    return createControlResult(experiment.key, variants, 'EXPERIMENT_NOT_RUNNING');
  }

  return {
    experimentKey: experiment.key,
    variantKey: selectedVariant.key,
    config: selectedVariant.config_json,
    reason: 'HASH_ALLOCATION',
    assigned: true,
  };
}

/**
 * Create a control/default result when assignment is not applicable.
 */
function createControlResult(
  experimentKey: string,
  variants: ExperimentVariant[],
  reason: AssignmentReason
): AssignmentResult {
  // Try to find a 'control' variant
  const controlVariant = variants.find((v) => v.key === config.assignment.defaultControlKey);

  if (controlVariant) {
    return {
      experimentKey,
      variantKey: controlVariant.key,
      config: controlVariant.config_json,
      reason,
      assigned: false,
    };
  }

  // No control variant, use first variant
  const firstVariant = [...variants].sort((a, b) => a.key.localeCompare(b.key))[0];

  return {
    experimentKey,
    variantKey: firstVariant?.key ?? config.assignment.defaultControlKey,
    config: firstVariant?.config_json ?? ({} as VariantConfig),
    reason,
    assigned: false,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// DISTRIBUTION VERIFICATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Verify that hash-based assignment produces expected distribution.
 * Used for testing and validation.
 */
export function verifyDistribution(
  experimentKey: string,
  variants: ExperimentVariant[],
  sampleSize = 10000
): Map<string, number> {
  const counts = new Map<string, number>();

  // Initialize counts
  for (const variant of variants) {
    counts.set(variant.key, 0);
  }

  // Generate sample assignments
  for (let i = 0; i < sampleSize; i++) {
    const subjectId = `test-subject-${i}`;
    const bucket = computeBucket(experimentKey, subjectId);
    const variant = selectVariant(bucket, variants);

    if (variant) {
      counts.set(variant.key, (counts.get(variant.key) ?? 0) + 1);
    }
  }

  // Convert to percentages
  const percentages = new Map<string, number>();
  for (const [key, count] of counts) {
    percentages.set(key, count / sampleSize);
  }

  return percentages;
}

/**
 * Check if distribution matches expected allocations within tolerance.
 */
export function isDistributionValid(
  actual: Map<string, number>,
  expected: ExperimentVariant[],
  tolerance = 0.02
): boolean {
  for (const variant of expected) {
    const actualPercent = actual.get(variant.key) ?? 0;
    const diff = Math.abs(actualPercent - variant.allocation);

    if (diff > tolerance) {
      return false;
    }
  }

  return true;
}
