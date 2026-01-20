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

/** Content service URL for cross-service validation */
const CONTENT_SVC_URL = process.env.CONTENT_SERVICE_URL || 'http://content-svc:4003';

/** LO metadata from content-svc */
interface LOMetadata {
  loVersionId: string;
  loId: string;
  title: string;
  subject: string;
  gradeBands: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED' | 'ARCHIVED';
  standardAlignments: string[];
}

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
export const ELEVATED_SCOPES = ['LEARNER_PROFILE_FULL', 'ASSIGNMENT_WRITE'] as const;

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

// ── Helper: Validate Required Fields ─────────────────────────────────────────
function validateRequiredFields(item: MarketplaceItem, errors: ValidationError[]): void {
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

  if (item.subjects.length === 0) {
    errors.push({
      field: 'subjects',
      code: 'REQUIRED_FIELD',
      message: 'At least one subject is required',
    });
  }

  if (item.gradeBands.length === 0) {
    errors.push({
      field: 'gradeBands',
      code: 'REQUIRED_FIELD',
      message: 'At least one grade band is required',
    });
  }
}

// ── Helper: Validate Content Pack ────────────────────────────────────────────
function validateContentPack(
  version: VersionWithRelations,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const contentItems = version.contentPackItems ?? [];

  if (contentItems.length === 0) {
    errors.push({
      field: 'contentPackItems',
      code: 'EMPTY_CONTENT_PACK',
      message: 'Content pack must contain at least one Learning Object',
    });
    return;
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

// ── Helper: Validate URL ─────────────────────────────────────────────────────
function validateUrl(
  urlString: string | null | undefined,
  field: string,
  requireHttps: boolean,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!urlString) {
    errors.push({
      field,
      code: 'REQUIRED_FIELD',
      message: `${field} is required`,
    });
    return;
  }

  try {
    const url = new URL(urlString);
    if (!['https:', 'http:'].includes(url.protocol)) {
      errors.push({
        field,
        code: 'INVALID_URL_PROTOCOL',
        message: `${field} must use http or https protocol`,
      });
      return;
    }
    if (requireHttps && url.protocol !== 'https:') {
      errors.push({
        field,
        code: 'INSECURE_URL',
        message: `${field} must use HTTPS`,
      });
    } else if (url.protocol === 'http:') {
      warnings.push({
        field,
        code: 'INSECURE_URL',
        message: `${field} should use HTTPS for security`,
      });
    }
  } catch {
    errors.push({
      field,
      code: 'INVALID_URL',
      message: `${field} is not a valid URL`,
    });
  }
}

// ── Helper: Validate Scopes ──────────────────────────────────────────────────
function validateScopes(
  scopes: string[] | null | undefined,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!scopes || scopes.length === 0) {
    errors.push({
      field: 'requiredScopes',
      code: 'REQUIRED_FIELD',
      message: 'At least one required scope must be specified',
    });
    return;
  }

  const invalidScopes = scopes.filter(
    (s) => !ALLOWED_TOOL_SCOPES.includes(s as (typeof ALLOWED_TOOL_SCOPES)[number])
  );
  if (invalidScopes.length > 0) {
    errors.push({
      field: 'requiredScopes',
      code: 'INVALID_SCOPE',
      message: `Invalid scopes: ${invalidScopes.join(', ')}`,
    });
  }

  const elevatedUsed = scopes.filter((s) =>
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

// ── Helper: Validate Embedded Tool Config ────────────────────────────────────
function validateEmbeddedToolConfig(
  config: EmbeddedToolConfig | null | undefined,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!config) {
    errors.push({
      field: 'embeddedToolConfig',
      code: 'MISSING_TOOL_CONFIG',
      message: 'Embedded tool must have a configuration',
    });
    return;
  }

  // Validate launch URL (required, prefer HTTPS but allow HTTP with warning)
  if (config.launchUrl) {
    validateUrl(config.launchUrl, 'launchUrl', false, errors, warnings);
  } else {
    errors.push({
      field: 'launchUrl',
      code: 'REQUIRED_FIELD',
      message: 'Launch URL is required',
    });
  }

  // Validate required scopes
  validateScopes(config.requiredScopes, errors, warnings);

  // Validate webhook URL if provided (requires HTTPS)
  if (config.webhookUrl) {
    validateUrl(config.webhookUrl, 'webhookUrl', true, errors, warnings);
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

// ── Helper: Validate Quality (Optional) ──────────────────────────────────────
function validateQuality(
  item: MarketplaceItem,
  version: VersionWithRelations,
  warnings: ValidationWarning[]
): void {
  if (!item.iconUrl) {
    warnings.push({
      field: 'iconUrl',
      code: 'MISSING_ICON',
      message: 'Adding an icon improves discoverability',
    });
  }

  const screenshots = item.screenshotsJson as { url: string }[] | null;
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
}

/**
 * Validate a version before submission for review
 */
export function validateSubmission(
  version: VersionWithRelations,
  item: MarketplaceItem
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate required fields
  validateRequiredFields(item, errors);

  // Type-specific validation
  if (item.itemType === 'CONTENT_PACK') {
    validateContentPack(version, errors, warnings);
  }

  if (item.itemType === 'EMBEDDED_TOOL') {
    validateEmbeddedToolConfig(version.embeddedToolConfig, errors, warnings);
  }

  // Optional quality checks
  validateQuality(item, version, warnings);

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

  // Fetch LO metadata from content-svc for validation
  const loVersionIds = items.map((item) => item.loVersionId);
  const loMetadataMap = await fetchLOMetadataFromContentService(loVersionIds);

  // Skip validation if we couldn't fetch metadata (service unavailable)
  if (loMetadataMap.size === 0 && loVersionIds.length > 0) {
    warnings.push({
      field: 'contentPackItems',
      code: 'METADATA_UNAVAILABLE',
      message: 'Could not validate LO metadata - content service unavailable',
    });
    return { valid: true, warnings };
  }

  // Track subjects and grade bands for consistency check
  const subjects = new Set<string>();
  const gradeBands = new Set<string>();
  const invalidLOs: string[] = [];
  const deprecatedLOs: string[] = [];
  const unpublishedLOs: string[] = [];
  const missingLOs: string[] = [];

  for (const item of items) {
    const metadata = loMetadataMap.get(item.loVersionId);

    if (!metadata) {
      missingLOs.push(item.loVersionId);
      continue;
    }

    // Track subjects and grade bands
    if (metadata.subject) {
      subjects.add(metadata.subject);
    }
    for (const band of metadata.gradeBands) {
      gradeBands.add(band);
    }

    // Check LO status
    if (metadata.status === 'DEPRECATED') {
      deprecatedLOs.push(metadata.title || item.loVersionId);
    } else if (metadata.status !== 'PUBLISHED') {
      unpublishedLOs.push(metadata.title || item.loVersionId);
    }
  }

  // Check 1: Warn if LOs are missing from content-svc
  if (missingLOs.length > 0) {
    warnings.push({
      field: 'contentPackItems',
      code: 'MISSING_LO',
      message: `${missingLOs.length} Learning Object(s) not found in content service`,
    });
  }

  // Check 2: Warn about deprecated LOs
  if (deprecatedLOs.length > 0) {
    warnings.push({
      field: 'contentPackItems',
      code: 'DEPRECATED_LO',
      message: `Content pack contains deprecated LOs: ${deprecatedLOs.slice(0, 3).join(', ')}${deprecatedLOs.length > 3 ? ` and ${deprecatedLOs.length - 3} more` : ''}`,
    });
  }

  // Check 3: Warn about unpublished LOs
  if (unpublishedLOs.length > 0) {
    warnings.push({
      field: 'contentPackItems',
      code: 'UNPUBLISHED_LO',
      message: `Content pack contains unpublished LOs: ${unpublishedLOs.slice(0, 3).join(', ')}${unpublishedLOs.length > 3 ? ` and ${unpublishedLOs.length - 3} more` : ''}`,
    });
  }

  // Check 4: Warn if subjects are inconsistent (more than 2 different subjects)
  if (subjects.size > 2) {
    warnings.push({
      field: 'contentPackItems',
      code: 'INCONSISTENT_SUBJECTS',
      message: `Content pack spans ${subjects.size} subjects (${Array.from(subjects).join(', ')}). Consider splitting into multiple packs.`,
    });
  }

  // Check 5: Warn if grade bands don't overlap reasonably
  const gradeBandArray = Array.from(gradeBands);
  if (gradeBandArray.length > 3) {
    warnings.push({
      field: 'contentPackItems',
      code: 'WIDE_GRADE_RANGE',
      message: `Content pack spans ${gradeBandArray.length} grade bands. Consider targeting a narrower range.`,
    });
  }

  // Content pack is valid even with warnings (they're advisory)
  return { valid: true, warnings };
}

/**
 * Fetch LO metadata from content-svc for validation
 */
async function fetchLOMetadataFromContentService(
  loVersionIds: string[]
): Promise<Map<string, LOMetadata>> {
  const metadataMap = new Map<string, LOMetadata>();

  if (loVersionIds.length === 0) {
    return metadataMap;
  }

  try {
    const response = await fetch(
      `${CONTENT_SVC_URL}/internal/lo-versions/batch-metadata`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'marketplace-svc',
        },
        body: JSON.stringify({ loVersionIds }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );

    if (!response.ok) {
      console.warn(
        `Content service returned ${response.status} for LO metadata batch request`
      );
      return metadataMap;
    }

    const data = (await response.json()) as {
      metadata: LOMetadata[];
    };

    for (const lo of data.metadata) {
      metadataMap.set(lo.loVersionId, lo);
    }
  } catch (error) {
    console.error('Error fetching LO metadata from content-svc:', error);
    // Return empty map on error - validation will add a warning
  }

  return metadataMap;
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
