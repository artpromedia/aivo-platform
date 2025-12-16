/**
 * Validation Service
 *
 * Validation rules for marketplace item submissions.
 * Includes safety checks and QA validation.
 */

import { prisma } from '../prisma.js';
import type {
  MarketplaceItem,
  MarketplaceItemVersion,
  ContentPackItem,
  EmbeddedToolConfig,
} from '../types/index.js';

// ============================================================================
// Allowed Scopes (Safety Whitelist)
// ============================================================================

/**
 * Whitelisted scopes that embedded tools can request.
 * These have been approved for COPPA/FERPA compliance.
 */
export const ALLOWED_TOOL_SCOPES = [
  // Basic learner info (COPPA-safe)
  'LEARNER_PROFILE_MIN',
  // Progress tracking
  'LEARNER_PROGRESS_READ',
  'LEARNER_PROGRESS_WRITE',
  // Session events
  'SESSION_EVENTS_READ',
  'SESSION_EVENTS_WRITE',
  // Assignment context
  'ASSIGNMENT_READ',
  // Classroom context (no PII)
  'CLASSROOM_READ',
  // Tenant config
  'TENANT_CONFIG_READ',
] as const;

/**
 * High-risk scopes that require additional approval
 */
export const ELEVATED_SCOPES = [
  'LEARNER_PROFILE_FULL',
  'ASSIGNMENT_WRITE',
] as const;

// ============================================================================
// Submission Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
}

type VersionWithRelations = MarketplaceItemVersion & {
  contentPackItems?: ContentPackItem[];
  embeddedToolConfig?: EmbeddedToolConfig | null;
};

/**
 * Validate a version before submission for review
 */
export function validateSubmission(
  version: VersionWithRelations,
  item: MarketplaceItem
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // ── Required Fields ────────────────────────────────────────────────────────
  if (!item.title || item.title.trim().length < 3) {
    errors.push({
      field: 'title',
      code: 'REQUIRED_FIELD',
      message: 'Title is required (minimum 3 characters)',
    });
  }

  if (!item.shortDescription || item.shortDescription.trim().length < 10) {
    errors.push({
      field: 'shortDescription',
      code: 'REQUIRED_FIELD',
      message: 'Short description is required (minimum 10 characters)',
    });
  }

  if (!item.longDescription || item.longDescription.trim().length < 50) {
    errors.push({
      field: 'longDescription',
      code: 'REQUIRED_FIELD',
      message: 'Long description is required (minimum 50 characters)',
    });
  }

  if (!item.subjects || item.subjects.length === 0) {
    errors.push({
      field: 'subjects',
      code: 'REQUIRED_FIELD',
      message: 'At least one subject is required',
    });
  }

  if (!item.gradeBands || item.gradeBands.length === 0) {
    errors.push({
      field: 'gradeBands',
      code: 'REQUIRED_FIELD',
      message: 'At least one grade band is required',
    });
  }

  // ── Content Pack Validation ────────────────────────────────────────────────
  if (item.itemType === 'CONTENT_PACK') {
    const contentItems = version.contentPackItems ?? [];

    if (contentItems.length === 0) {
      errors.push({
        field: 'contentPackItems',
        code: 'EMPTY_CONTENT_PACK',
        message: 'Content pack must contain at least one Learning Object',
      });
    }

    // Check for duplicate LOs
    const loIds = contentItems.map((cp) => cp.loVersionId);
    const duplicates = loIds.filter((id, idx) => loIds.indexOf(id) !== idx);
    if (duplicates.length > 0) {
      warnings.push({
        field: 'contentPackItems',
        code: 'DUPLICATE_LO',
        message: `Duplicate Learning Objects found: ${duplicates.length} duplicates`,
      });
    }

    // Check positions are sequential
    const positions = contentItems.map((cp) => cp.position).sort((a, b) => a - b);
    const hasGaps = positions.some((pos, idx) => {
      if (idx === 0) return false;
      const prevPos = positions[idx - 1];
      return prevPos !== undefined && pos - prevPos > 1;
    });
    if (hasGaps) {
      warnings.push({
        field: 'contentPackItems',
        code: 'POSITION_GAPS',
        message: 'Content pack items have gaps in position ordering',
      });
    }
  }

  // ── Embedded Tool Validation ───────────────────────────────────────────────
  if (item.itemType === 'EMBEDDED_TOOL') {
    const config = version.embeddedToolConfig;

    if (!config) {
      errors.push({
        field: 'embeddedToolConfig',
        code: 'MISSING_TOOL_CONFIG',
        message: 'Embedded tool must have a configuration',
      });
    } else {
      // Validate launch URL
      if (!config.launchUrl) {
        errors.push({
          field: 'launchUrl',
          code: 'REQUIRED_FIELD',
          message: 'Launch URL is required',
        });
      } else {
        try {
          const url = new URL(config.launchUrl);
          if (!['https:', 'http:'].includes(url.protocol)) {
            errors.push({
              field: 'launchUrl',
              code: 'INVALID_URL_PROTOCOL',
              message: 'Launch URL must use http or https protocol',
            });
          }
          // Warn if using http (not https)
          if (url.protocol === 'http:') {
            warnings.push({
              field: 'launchUrl',
              code: 'INSECURE_URL',
              message: 'Launch URL should use HTTPS for security',
            });
          }
        } catch {
          errors.push({
            field: 'launchUrl',
            code: 'INVALID_URL',
            message: 'Launch URL is not a valid URL',
          });
        }
      }

      // Validate required scopes
      if (!config.requiredScopes || config.requiredScopes.length === 0) {
        errors.push({
          field: 'requiredScopes',
          code: 'REQUIRED_FIELD',
          message: 'At least one required scope must be specified',
        });
      } else {
        // Check all scopes are allowed
        const invalidScopes = config.requiredScopes.filter(
          (s) => !ALLOWED_TOOL_SCOPES.includes(s as (typeof ALLOWED_TOOL_SCOPES)[number])
        );
        if (invalidScopes.length > 0) {
          errors.push({
            field: 'requiredScopes',
            code: 'INVALID_SCOPE',
            message: `Invalid scopes: ${invalidScopes.join(', ')}`,
          });
        }

        // Warn about elevated scopes
        const elevatedUsed = config.requiredScopes.filter((s) =>
          ELEVATED_SCOPES.includes(s as (typeof ELEVATED_SCOPES)[number])
        );
        if (elevatedUsed.length > 0) {
          warnings.push({
            field: 'requiredScopes',
            code: 'ELEVATED_SCOPE',
            message: `Elevated scopes require additional review: ${elevatedUsed.join(', ')}`,
          });
        }
      }

      // Validate webhook URL if provided
      if (config.webhookUrl) {
        try {
          const url = new URL(config.webhookUrl);
          if (url.protocol !== 'https:') {
            errors.push({
              field: 'webhookUrl',
              code: 'INSECURE_WEBHOOK',
              message: 'Webhook URL must use HTTPS',
            });
          }
        } catch {
          errors.push({
            field: 'webhookUrl',
            code: 'INVALID_URL',
            message: 'Webhook URL is not a valid URL',
          });
        }
      }

      // Validate config schema if provided
      if (config.configSchemaJson) {
        const schema = config.configSchemaJson as { type?: string };
        if (schema.type !== 'object') {
          errors.push({
            field: 'configSchemaJson',
            code: 'INVALID_SCHEMA',
            message: 'Config schema must have type "object"',
          });
        }
      }
    }
  }

  // ── Optional Quality Checks ────────────────────────────────────────────────
  if (!item.iconUrl) {
    warnings.push({
      field: 'iconUrl',
      code: 'MISSING_ICON',
      message: 'Adding an icon improves discoverability',
    });
  }

  const screenshots = item.screenshotsJson as Array<{ url: string }> | null;
  if (!screenshots || screenshots.length === 0) {
    warnings.push({
      field: 'screenshotsJson',
      code: 'MISSING_SCREENSHOTS',
      message: 'Adding screenshots improves conversion',
    });
  }

  if (!version.changelog) {
    warnings.push({
      field: 'changelog',
      code: 'MISSING_CHANGELOG',
      message: 'A changelog helps users understand what changed',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Content Pack Consistency Checks
// ============================================================================

export interface ConsistencyResult {
  valid: boolean;
  warnings: ValidationWarning[];
}

/**
 * For Aivo-authored content packs, check that all LOs are consistent
 * (same subject/grade band, etc.)
 */
export async function validateContentPackConsistency(
  versionId: string
): Promise<ConsistencyResult> {
  const warnings: ValidationWarning[] = [];

  // Get content pack items
  const items = await prisma.contentPackItem.findMany({
    where: { marketplaceItemVersionId: versionId },
  });

  if (items.length === 0) {
    return { valid: true, warnings };
  }

  // In a real implementation, we would call content-svc to get LO metadata
  // and validate consistency. For now, we'll just return valid.
  // TODO: Implement cross-service LO metadata validation

  // Example checks we would do:
  // 1. All LOs have the same subject (or consistent subjects)
  // 2. All LOs have the same or overlapping grade bands
  // 3. All LOs are in PUBLISHED status
  // 4. No LOs are deprecated

  return { valid: true, warnings };
}

// ============================================================================
// Status Transition Validation
// ============================================================================

/**
 * Valid status transitions for marketplace item versions
 */
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_REVIEW'],
  PENDING_REVIEW: ['IN_REVIEW', 'REJECTED', 'DRAFT'],
  IN_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['PUBLISHED'],
  REJECTED: ['DRAFT'],
  PUBLISHED: ['DEPRECATED'],
  DEPRECATED: [],
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(fromStatus: string, toStatus: string): boolean {
  const allowed = STATUS_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

/**
 * Get allowed next statuses for a given current status
 */
export function getAllowedTransitions(currentStatus: string): string[] {
  return STATUS_TRANSITIONS[currentStatus] ?? [];
}
