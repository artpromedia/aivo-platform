/**
 * Experimentation Service - Types
 *
 * Core type definitions for experiments, variants, assignments, and exposures.
 */

import { z } from 'zod';

// ════════════════════════════════════════════════════════════════════════════════
// ENUMS & CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

export const EXPERIMENT_SCOPES = ['TENANT', 'LEARNER'] as const;
export type ExperimentScope = (typeof EXPERIMENT_SCOPES)[number];

export const EXPERIMENT_STATUSES = ['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED'] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const ASSIGNMENT_REASONS = [
  'HASH_ALLOCATION',
  'TENANT_OPT_OUT',
  'EXPERIMENT_NOT_RUNNING',
  'EXPERIMENT_NOT_FOUND',
  'FORCED_VARIANT',
] as const;
export type AssignmentReason = (typeof ASSIGNMENT_REASONS)[number];

// ════════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Variant configuration schema
 */
export const VariantConfigSchema = z.record(z.string(), z.unknown());
export type VariantConfig = z.infer<typeof VariantConfigSchema>;

/**
 * Experiment variant input schema
 */
export const CreateVariantInputSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/, 'Variant key must be lowercase alphanumeric with underscores'),
  allocation: z.number().min(0).max(1),
  config: VariantConfigSchema.optional().default({}),
});
export type CreateVariantInput = z.infer<typeof CreateVariantInputSchema>;

/**
 * Create experiment input schema
 */
export const CreateExperimentInputSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/, 'Experiment key must be lowercase alphanumeric with underscores'),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  scope: z.enum(EXPERIMENT_SCOPES),
  variants: z
    .array(CreateVariantInputSchema)
    .min(2)
    .refine(
      (variants) => {
        const totalAllocation = variants.reduce((sum, v) => sum + v.allocation, 0);
        return Math.abs(totalAllocation - 1.0) < 0.001;
      },
      { message: 'Variant allocations must sum to 1.0' }
    ),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  config: VariantConfigSchema.optional().default({}),
});
export type CreateExperimentInput = z.infer<typeof CreateExperimentInputSchema>;

/**
 * Log exposure input schema
 */
export const LogExposureInputSchema = z.object({
  experimentKey: z.string().min(1).max(64),
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid().optional(),
  variantKey: z.string().min(1).max(64),
  featureArea: z.string().min(1).max(64),
  sessionId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type LogExposureInput = z.infer<typeof LogExposureInputSchema>;

/**
 * Assignment query schema
 */
export const AssignmentQuerySchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid().optional(),
  force: z.string().optional(), // Force a specific variant (for testing)
});
export type AssignmentQuery = z.infer<typeof AssignmentQuerySchema>;

// ════════════════════════════════════════════════════════════════════════════════
// DATABASE TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Experiment record as stored in the database
 */
export interface Experiment {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scope: ExperimentScope;
  status: ExperimentStatus;
  config_json: VariantConfig;
  start_at: Date | null;
  end_at: Date | null;
  created_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Experiment variant record
 */
export interface ExperimentVariant {
  id: string;
  experiment_id: string;
  key: string;
  allocation: number;
  config_json: VariantConfig;
  created_at: Date;
}

/**
 * Experiment assignment record
 */
export interface ExperimentAssignment {
  id: string;
  experiment_id: string;
  tenant_id: string;
  learner_id: string | null;
  variant_key: string;
  reason: AssignmentReason;
  assigned_at: Date;
}

/**
 * Experiment exposure record
 */
export interface ExperimentExposure {
  id: string;
  experiment_id: string;
  tenant_id: string;
  learner_id: string | null;
  variant_key: string;
  feature_area: string;
  session_id: string | null;
  metadata: Record<string, unknown> | null;
  exposed_at: Date;
}

// ════════════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Experiment with variants for API response
 */
export interface ExperimentWithVariants extends Experiment {
  variants: ExperimentVariant[];
}

/**
 * Assignment result
 */
export interface AssignmentResult {
  experimentKey: string;
  variantKey: string;
  config: VariantConfig;
  reason: AssignmentReason;
  assigned: boolean;
}

/**
 * Multiple assignments result (batch)
 */
export interface BatchAssignmentResult {
  tenantId: string;
  learnerId?: string;
  assignments: AssignmentResult[];
}

/**
 * Exposure statistics for an experiment
 */
export interface ExposureStats {
  experimentKey: string;
  totalExposures: number;
  uniqueTenants: number;
  uniqueLearners: number;
  byVariant: {
    variantKey: string;
    exposures: number;
    uniqueSubjects: number;
  }[];
  byFeatureArea: {
    featureArea: string;
    exposures: number;
  }[];
}

// ════════════════════════════════════════════════════════════════════════════════
// AGENT CONTRACT TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Lightweight assignment for agent contracts
 * Used by Focus Agent, Virtual Brain, etc.
 */
export interface AgentExperimentContext {
  /** Active experiments for this subject */
  experiments: {
    key: string;
    variant: string;
    config: VariantConfig;
  }[];
}

/**
 * Input for getting agent experiment context
 */
export interface GetAgentContextInput {
  tenantId: string;
  learnerId?: string;
  featureAreas: string[];
}
