/**
 * Coverage Profile API Routes
 *
 * REST endpoints for retrieving learner coverage profiles
 * that combine district entitlements with parent subscriptions.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { coverageProfileService } from '../services/coverage-profile.service.js';
import { type CoverageProfile } from '../types/coverage-profile.types.js';
import { gradeToGradeBand } from '../types/licensing.types.js';

// ============================================================================
// Schema Validation
// ============================================================================

const GetCoverageParamsSchema = z.object({
  learnerId: z.string().uuid(),
});

const GetCoverageQuerySchema = z.object({
  tenantId: z.string().uuid(),
  schoolId: z.string().uuid().optional(),
  grade: z.coerce.number().int().min(0).max(12),
  includeDetails: z.coerce.boolean().default(true),
  forceRefresh: z.coerce.boolean().default(false),
});

const BatchGetCoverageBodySchema = z.object({
  learners: z
    .array(
      z.object({
        learnerId: z.string().uuid(),
        tenantId: z.string().uuid(),
        schoolId: z.string().uuid().optional(),
        grade: z.number().int().min(0).max(12),
      })
    )
    .min(1)
    .max(100),
  includeDetails: z.boolean().default(false),
});

const DistrictAggregateQuerySchema = z.object({
  tenantId: z.string().uuid(),
  schoolId: z.string().uuid().optional(),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /coverage/:learnerId
 *
 * Get coverage profile for a single learner.
 * Includes district and parent coverage, effective modules, and payer info.
 */
async function getCoverageProfile(
  request: FastifyRequest<{
    Params: { learnerId: string };
    Querystring: z.infer<typeof GetCoverageQuerySchema>;
  }>,
  _reply: FastifyReply
) {
  const params = GetCoverageParamsSchema.parse(request.params);
  const query = GetCoverageQuerySchema.parse(request.query);

  const learnerInfo = {
    learnerId: params.learnerId,
    tenantId: query.tenantId,
    schoolId: query.schoolId ?? null,
    grade: query.grade,
    gradeBand: gradeToGradeBand(query.grade),
  };

  const profile = await coverageProfileService.getCoverageProfile(
    params.learnerId,
    learnerInfo,
    query.forceRefresh
  );

  const summary = await coverageProfileService.getCoverageProfileSummary(
    params.learnerId,
    learnerInfo
  );

  // Convert Sets and Maps to arrays/objects for JSON serialization
  return {
    profile: serializeProfile(profile),
    summary,
  };
}

/**
 * POST /coverage/batch
 *
 * Get coverage profiles for multiple learners at once.
 * More efficient than multiple single requests.
 */
async function batchGetCoverageProfiles(
  request: FastifyRequest<{
    Body: z.infer<typeof BatchGetCoverageBodySchema>;
  }>,
  _reply: FastifyReply
) {
  const body = BatchGetCoverageBodySchema.parse(request.body);

  const learnerInfos = body.learners.map((l) => ({
    learnerId: l.learnerId,
    tenantId: l.tenantId,
    schoolId: l.schoolId ?? null,
    grade: l.grade,
    gradeBand: gradeToGradeBand(l.grade),
  }));

  const profilesMap = await coverageProfileService.getBatchCoverageProfiles(learnerInfos);

  const profiles: Record<string, unknown> = {};
  const summaries: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const [learnerId, profile] of profilesMap) {
    try {
      profiles[learnerId] = serializeProfile(profile);
      summaries[learnerId] = {
        learnerId: profile.learnerId,
        hasDistrictBase: profile.hasDistrictCoverage,
        hasParentSubscription: profile.hasParentCoverage,
        districtFeatureCount: profile.districtModules.size,
        parentFeatureCount: profile.parentModules.size,
        totalEffectiveFeatures: profile.effectiveModules.size,
        refundableOverlapCount: profile.parentCoverage?.overlappingFeatures.size ?? 0,
      };
    } catch (error) {
      errors[learnerId] = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  return {
    profiles,
    summaries,
    errors,
  };
}

/**
 * GET /coverage/:learnerId/feature/:featureKey
 *
 * Check if a learner has access to a specific feature and who provides it.
 */
async function checkFeatureAccess(
  request: FastifyRequest<{
    Params: { learnerId: string; featureKey: string };
    Querystring: z.infer<typeof GetCoverageQuerySchema>;
  }>,
  _reply: FastifyReply
): Promise<{ hasAccess: boolean; providedBy: string; displayLabel: string }> {
  const { learnerId, featureKey } = request.params;
  const query = GetCoverageQuerySchema.parse(request.query);

  const learnerInfo = {
    learnerId,
    tenantId: query.tenantId,
    schoolId: query.schoolId ?? null,
    grade: query.grade,
    gradeBand: gradeToGradeBand(query.grade),
  };

  const profile = await coverageProfileService.getCoverageProfile(learnerId, learnerInfo);
  const hasAccess = profile.effectiveModules.has(featureKey);
  const payer = profile.payerForFeature.get(featureKey) ?? 'NONE';

  // Find display label
  const detail = profile.coverageDetails.find((d) => d.featureKey === featureKey);

  return {
    hasAccess,
    providedBy: payer,
    displayLabel: detail?.displayLabel ?? (hasAccess ? 'Covered' : 'Not covered'),
  };
}

/**
 * GET /coverage/district-aggregate
 *
 * Get aggregate view of parent add-ons for district admin dashboard.
 */
async function getDistrictAggregate(
  request: FastifyRequest<{
    Querystring: z.infer<typeof DistrictAggregateQuerySchema>;
  }>,
  _reply: FastifyReply
) {
  const query = DistrictAggregateQuerySchema.parse(request.query);

  const aggregate = await coverageProfileService.getParentAddonAggregateView(
    query.tenantId,
    query.schoolId
  );

  return aggregate;
}

/**
 * POST /coverage/:learnerId/invalidate
 *
 * Invalidate cached coverage profile for a learner.
 * Call this when coverage changes (subscription update, contract change).
 */
async function invalidateCoverageProfile(
  request: FastifyRequest<{
    Params: { learnerId: string };
  }>,
  _reply: FastifyReply
): Promise<{ success: boolean; message: string }> {
  const { learnerId } = request.params;

  coverageProfileService.invalidateProfile(learnerId);

  return {
    success: true,
    message: `Coverage profile cache invalidated for learner ${learnerId}`,
  };
}

/**
 * POST /coverage/tenant/:tenantId/invalidate
 *
 * Invalidate all cached coverage profiles for a tenant.
 * Call this when district contract changes.
 */
async function invalidateTenantProfiles(
  request: FastifyRequest<{
    Params: { tenantId: string };
  }>,
  _reply: FastifyReply
): Promise<{ success: boolean; message: string }> {
  const { tenantId } = request.params;

  coverageProfileService.invalidateTenantProfiles(tenantId);

  return {
    success: true,
    message: `Coverage profile cache invalidated for tenant ${tenantId}`,
  };
}

// ============================================================================
// Serialization Helpers
// ============================================================================

/**
 * Serialize a coverage profile for JSON response.
 * Converts Sets and Maps to arrays and objects.
 */
function serializeProfile(profile: CoverageProfile): Record<string, unknown> {
  return {
    ...profile,
    districtModules: Array.from(profile.districtModules),
    parentModules: Array.from(profile.parentModules),
    effectiveModules: Array.from(profile.effectiveModules),
    payerForFeature: Object.fromEntries(profile.payerForFeature),
    districtCoverage: profile.districtCoverage
      ? {
          ...profile.districtCoverage,
          coveredFeatures: Array.from(profile.districtCoverage.coveredFeatures),
        }
      : null,
    parentCoverage: profile.parentCoverage
      ? {
          ...profile.parentCoverage,
          coveredFeatures: Array.from(profile.parentCoverage.coveredFeatures),
          overlappingFeatures: Array.from(profile.parentCoverage.overlappingFeatures),
        }
      : null,
  };
}

// ============================================================================
// Route Registration
// ============================================================================

export async function coverageRoutes(fastify: FastifyInstance): Promise<void> {
  // Single learner coverage profile
  fastify.get<{
    Params: { learnerId: string };
    Querystring: z.infer<typeof GetCoverageQuerySchema>;
  }>('/coverage/:learnerId', {}, getCoverageProfile);

  // Batch coverage profiles
  fastify.post<{
    Body: z.infer<typeof BatchGetCoverageBodySchema>;
  }>('/coverage/batch', {}, batchGetCoverageProfiles);

  // Feature access check
  fastify.get<{
    Params: { learnerId: string; featureKey: string };
    Querystring: z.infer<typeof GetCoverageQuerySchema>;
  }>('/coverage/:learnerId/feature/:featureKey', {}, checkFeatureAccess);

  // District aggregate view
  fastify.get<{
    Querystring: z.infer<typeof DistrictAggregateQuerySchema>;
  }>('/coverage/district-aggregate', {}, getDistrictAggregate);

  // Cache invalidation
  fastify.post<{
    Params: { learnerId: string };
  }>('/coverage/:learnerId/invalidate', {}, invalidateCoverageProfile);

  fastify.post<{
    Params: { tenantId: string };
  }>('/coverage/tenant/:tenantId/invalidate', {}, invalidateTenantProfiles);
}
