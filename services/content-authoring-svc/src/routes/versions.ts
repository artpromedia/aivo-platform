/**
 * Version Routes
 *
 * REST API for managing Learning Object versions and workflow transitions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */

// Local type definitions (Prisma client not generated)
type InputJsonValue = string | number | boolean | null | { [key: string]: InputJsonValue } | InputJsonValue[];
type LearningObjectVersionUpdateInput = { [key: string]: unknown };

// Prisma namespace stub
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Prisma {
  export type InputJsonValue = string | number | boolean | null | { [key: string]: unknown } | unknown[];
  export type LearningObjectVersionUpdateInput = { [key: string]: unknown };
}

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { getUserFromRequest, getUserTenantId, requireRoles } from '../auth.js';
import { prisma } from '../prisma.js';
import { runVersionQaChecks, getVersionQaChecks } from '../qa-engine.js';
import {
  AUTHOR_ROLES,
  REVIEWER_ROLES,
  PUBLISHER_ROLES,
  canAccessTenant,
  canEditVersion,
} from '../rbac.js';
import {
  addReviewNote,
  addApprovalNote,
  addRejectionNote,
  getReviewNotes,
  type NoteType,
} from '../review-notes.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

type VersionState = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'RETIRED';

type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const LoIdParamsSchema = z.object({
  loId: z.string().uuid(),
});

const VersionParamsSchema = z.object({
  loId: z.string().uuid(),
  versionNumber: z.coerce.number().int().min(1),
});

const UpdateVersionSchema = z.object({
  contentJson: z.record(z.unknown()).optional(),
  changeSummary: z.string().max(1000).optional(),
});

const SkillsBodySchema = z.object({
  skills: z.array(
    z.object({
      skillId: z.string().uuid(),
      isPrimary: z.boolean().default(false),
    })
  ),
});

const RejectBodySchema = z.object({
  reason: z.string().min(1).max(2000),
});

const ApproveBodySchema = z.object({
  note: z.string().max(2000).optional(),
});

const ReviewNoteBodySchema = z.object({
  noteText: z.string().min(1).max(2000),
  noteType: z.enum(['GENERAL', 'FEEDBACK']).default('GENERAL'),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

async function getVersionWithLO(loId: string, versionNumber: number) {
  return prisma.learningObjectVersion.findFirst({
    where: { learningObjectId: loId, versionNumber },
    include: {
      learningObject: { select: { tenantId: true } },
      skills: true,
    },
  });
}

async function createTransition(
  tx: TransactionClient,
  versionId: string,
  fromState: VersionState,
  toState: VersionState,
  userId: string,
  reason?: string
) {
  return tx.learningObjectVersionTransition.create({
    data: {
      versionId,
      fromState,
      toState,
      transitionedByUserId: userId,
      reason,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function versionRoutes(fastify: FastifyInstance) {
  /**
   * GET /learning-objects/:loId/versions
   * List all versions of a Learning Object.
   */
  fastify.get(
    '/learning-objects/:loId/versions',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = LoIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const { loId } = paramsResult.data;

      const lo = await prisma.learningObject.findUnique({
        where: { id: loId },
        select: { id: true, tenantId: true, title: true },
      });

      if (!lo) {
        return reply.status(404).send({ error: 'Not found', message: 'Learning object not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, lo.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      const versions = await prisma.learningObjectVersion.findMany({
        where: { learningObjectId: loId },
        orderBy: { versionNumber: 'desc' },
        select: {
          id: true,
          versionNumber: true,
          state: true,
          changeSummary: true,
          createdByUserId: true,
          createdAt: true,
          publishedAt: true,
          retiredAt: true,
        },
      });

      return reply.send({
        learningObjectId: lo.id,
        title: lo.title,
        versions,
      });
    }
  );

  /**
   * GET /learning-objects/:loId/versions/:versionNumber
   * Get a specific version with full content.
   */
  fastify.get(
    '/learning-objects/:loId/versions/:versionNumber',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = VersionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const { loId, versionNumber } = paramsResult.data;
      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      return reply.send({
        id: version.id,
        learningObjectId: version.learningObjectId,
        versionNumber: version.versionNumber,
        state: version.state,
        contentJson: version.contentJson,
        changeSummary: version.changeSummary,
        createdByUserId: version.createdByUserId,
        createdAt: version.createdAt,
        publishedAt: version.publishedAt,
        retiredAt: version.retiredAt,
        skills: version.skills.map((s) => ({
          skillId: s.skillId,
          isPrimary: s.isPrimary,
        })),
      });
    }
  );

  /**
   * PATCH /learning-objects/:loId/versions/:versionNumber
   * Update version content (DRAFT only).
   */
  fastify.patch(
    '/learning-objects/:loId/versions/:versionNumber',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = VersionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const bodyResult = UpdateVersionSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }

      const { loId, versionNumber } = paramsResult.data;
      const { contentJson, changeSummary } = bodyResult.data;

      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      if (!canEditVersion(user.sub, version.createdByUserId, version.state, user.roles)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message:
            version.state !== 'DRAFT'
              ? 'Only DRAFT versions can be edited'
              : 'You can only edit your own versions',
        });
      }

      const updateData: Prisma.LearningObjectVersionUpdateInput = {};
      if (contentJson) updateData.contentJson = contentJson as Prisma.InputJsonValue;
      if (changeSummary) updateData.changeSummary = changeSummary;

      const updated = await prisma.learningObjectVersion.update({
        where: { id: version.id },
        data: updateData,
        include: { skills: true },
      });

      return reply.send({
        id: updated.id,
        learningObjectId: updated.learningObjectId,
        versionNumber: updated.versionNumber,
        state: updated.state,
        contentJson: updated.contentJson,
        changeSummary: updated.changeSummary,
        updatedAt: updated.updatedAt,
        skills: updated.skills.map((s) => ({
          skillId: s.skillId,
          isPrimary: s.isPrimary,
        })),
      });
    }
  );

  /**
   * POST /learning-objects/:loId/versions/:versionNumber/skills
   * Replace skill alignments for a version.
   */
  fastify.post(
    '/learning-objects/:loId/versions/:versionNumber/skills',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = VersionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const bodyResult = SkillsBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }

      const { loId, versionNumber } = paramsResult.data;
      const { skills } = bodyResult.data;

      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      if (version.state !== 'DRAFT') {
        return reply
          .status(400)
          .send({ error: 'Bad request', message: 'Can only modify skills on DRAFT versions' });
      }

      await Promise.all([
        prisma.learningObjectSkill.deleteMany({
          where: { learningObjectVersionId: version.id },
        }),
        prisma.learningObjectSkill.createMany({
          data: skills.map((s) => ({
            learningObjectVersionId: version.id,
            skillId: s.skillId,
            isPrimary: s.isPrimary,
          })),
        }),
      ]);

      const updatedSkills = await prisma.learningObjectSkill.findMany({
        where: { learningObjectVersionId: version.id },
      });

      return reply.send({
        skills: updatedSkills.map((s) => ({
          skillId: s.skillId,
          isPrimary: s.isPrimary,
        })),
      });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // WORKFLOW TRANSITIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /learning-objects/:loId/versions/:versionNumber/submit-review
   * Submit a DRAFT version for review.
   */
  fastify.post(
    '/learning-objects/:loId/versions/:versionNumber/submit-review',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = VersionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const { loId, versionNumber } = paramsResult.data;
      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      if (version.state !== 'DRAFT') {
        return reply.status(400).send({
          error: 'Bad request',
          message: `Cannot submit for review: current state is ${version.state}, expected DRAFT`,
        });
      }

      // Run QA checks before submission
      const qaResults = await runVersionQaChecks(version.id);

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.learningObjectVersion.update({
          where: { id: version.id },
          data: { state: 'IN_REVIEW' },
        });

        await createTransition(tx, version.id, 'DRAFT', 'IN_REVIEW', user.sub);

        return updated;
      });

      return reply.send({
        id: result.id,
        versionNumber: result.versionNumber,
        state: result.state,
        message: 'Version submitted for review',
        qaChecks: {
          overallStatus: qaResults.overallStatus,
          passed: qaResults.passed,
          warnings: qaResults.warnings,
          failed: qaResults.failed,
          checks: qaResults.checks,
        },
      });
    }
  );

  /**
   * POST /learning-objects/:loId/versions/:versionNumber/approve
   * Approve an IN_REVIEW version.
   */
  fastify.post(
    '/learning-objects/:loId/versions/:versionNumber/approve',
    { preHandler: [requireRoles(REVIEWER_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = VersionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      // Optional approval note
      const bodyResult = ApproveBodySchema.safeParse(request.body ?? {});
      const approvalNote = bodyResult.success ? bodyResult.data.note : undefined;

      const { loId, versionNumber } = paramsResult.data;
      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      if (version.state !== 'IN_REVIEW') {
        return reply.status(400).send({
          error: 'Bad request',
          message: `Cannot approve: current state is ${version.state}, expected IN_REVIEW`,
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.learningObjectVersion.update({
          where: { id: version.id },
          data: {
            state: 'APPROVED',
            reviewedByUserId: user.sub,
            approvedByUserId: user.sub,
          },
        });

        await createTransition(tx, version.id, 'IN_REVIEW', 'APPROVED', user.sub);

        return updated;
      });

      // Add approval note after transaction
      if (approvalNote) {
        await addApprovalNote(version.id, user.sub, approvalNote);
      } else {
        await addApprovalNote(version.id, user.sub);
      }

      return reply.send({
        id: result.id,
        versionNumber: result.versionNumber,
        state: result.state,
        message: 'Version approved',
        approvalNote: approvalNote ?? null,
      });
    }
  );

  /**
   * POST /learning-objects/:loId/versions/:versionNumber/reject
   * Reject an IN_REVIEW version back to DRAFT.
   */
  fastify.post(
    '/learning-objects/:loId/versions/:versionNumber/reject',
    { preHandler: [requireRoles(REVIEWER_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = VersionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const bodyResult = RejectBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }

      const { loId, versionNumber } = paramsResult.data;
      const { reason } = bodyResult.data;

      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      if (version.state !== 'IN_REVIEW') {
        return reply.status(400).send({
          error: 'Bad request',
          message: `Cannot reject: current state is ${version.state}, expected IN_REVIEW`,
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.learningObjectVersion.update({
          where: { id: version.id },
          data: {
            state: 'DRAFT',
            reviewedByUserId: user.sub,
          },
        });

        await createTransition(tx, version.id, 'IN_REVIEW', 'DRAFT', user.sub, reason);

        return updated;
      });

      // Add rejection note
      await addRejectionNote(version.id, user.sub, reason);

      return reply.send({
        id: result.id,
        versionNumber: result.versionNumber,
        state: result.state,
        message: 'Version rejected and returned to draft',
        reason,
      });
    }
  );

  /**
   * POST /learning-objects/:loId/versions/:versionNumber/publish
   * Publish an APPROVED version.
   */
  fastify.post(
    '/learning-objects/:loId/versions/:versionNumber/publish',
    { preHandler: [requireRoles(PUBLISHER_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = VersionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const { loId, versionNumber } = paramsResult.data;
      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      if (version.state !== 'APPROVED') {
        return reply.status(400).send({
          error: 'Bad request',
          message: `Cannot publish: current state is ${version.state}, expected APPROVED`,
        });
      }

      const now = new Date();

      const result = await prisma.$transaction(async (tx) => {
        // Retire any currently published versions
        await tx.learningObjectVersion.updateMany({
          where: {
            learningObjectId: loId,
            state: 'PUBLISHED',
          },
          data: {
            state: 'RETIRED',
            retiredAt: now,
          },
        });

        // Publish this version
        const updated = await tx.learningObjectVersion.update({
          where: { id: version.id },
          data: {
            state: 'PUBLISHED',
            publishedAt: now,
          },
        });

        await createTransition(tx, version.id, 'APPROVED', 'PUBLISHED', user.sub);

        return updated;
      });

      return reply.send({
        id: result.id,
        versionNumber: result.versionNumber,
        state: result.state,
        publishedAt: result.publishedAt,
        message: 'Version published',
      });
    }
  );

  /**
   * POST /learning-objects/:loId/versions
   * Create a new version based on the latest.
   */
  fastify.post(
    '/learning-objects/:loId/versions',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = LoIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const { loId } = paramsResult.data;

      const lo = await prisma.learningObject.findUnique({
        where: { id: loId },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
            include: { skills: true },
          },
        },
      });

      if (!lo) {
        return reply.status(404).send({ error: 'Not found', message: 'Learning object not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, lo.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      const latestVersion = lo.versions[0];
      const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

      const result = await prisma.$transaction(async (tx) => {
        const newVersion = await tx.learningObjectVersion.create({
          data: {
            learningObjectId: loId,
            versionNumber: nextVersionNumber,
            state: 'DRAFT',
            contentJson: latestVersion?.contentJson ?? {},
            createdByUserId: user.sub,
          },
        });

        // Copy skills from latest version if it exists
        if (latestVersion?.skills.length) {
          await tx.learningObjectSkill.createMany({
            data: latestVersion.skills.map((s) => ({
              learningObjectVersionId: newVersion.id,
              skillId: s.skillId,
              isPrimary: s.isPrimary,
            })),
          });
        }

        return newVersion;
      });

      return reply.status(201).send({
        id: result.id,
        learningObjectId: result.learningObjectId,
        versionNumber: result.versionNumber,
        state: result.state,
        createdAt: result.createdAt,
        message: `Version ${result.versionNumber} created`,
      });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // QA CHECKS & REVIEW NOTES ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /learning-objects/:loId/versions/:versionNumber/qa-checks
   * Get QA check results for a version.
   */
  fastify.get(
    '/learning-objects/:loId/versions/:versionNumber/qa-checks',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = VersionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const { loId, versionNumber } = paramsResult.data;
      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      const checks = await getVersionQaChecks(version.id);

      const passed = checks.filter((c) => c.status === 'PASSED').length;
      const warnings = checks.filter((c) => c.status === 'WARNING').length;
      const failed = checks.filter((c) => c.status === 'FAILED').length;

      return reply.send({
        versionId: version.id,
        versionNumber: version.versionNumber,
        checks,
        summary: {
          passed,
          warnings,
          failed,
          overallStatus: failed > 0 ? 'FAILED' : warnings > 0 ? 'WARNING' : 'PASSED',
        },
      });
    }
  );

  /**
   * POST /learning-objects/:loId/versions/:versionNumber/qa-checks/run
   * Run QA checks on-demand.
   */
  fastify.post(
    '/learning-objects/:loId/versions/:versionNumber/qa-checks/run',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = VersionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const { loId, versionNumber } = paramsResult.data;
      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      const qaResults = await runVersionQaChecks(version.id);

      return reply.send({
        versionId: version.id,
        versionNumber: version.versionNumber,
        checks: qaResults.checks,
        summary: {
          passed: qaResults.passed,
          warnings: qaResults.warnings,
          failed: qaResults.failed,
          overallStatus: qaResults.overallStatus,
        },
      });
    }
  );

  /**
   * GET /learning-objects/:loId/versions/:versionNumber/review-notes
   * Get review notes for a version.
   */
  fastify.get(
    '/learning-objects/:loId/versions/:versionNumber/review-notes',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = VersionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const { loId, versionNumber } = paramsResult.data;
      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      const notes = await getReviewNotes(version.id);

      return reply.send({
        versionId: version.id,
        versionNumber: version.versionNumber,
        notes,
      });
    }
  );

  /**
   * POST /learning-objects/:loId/versions/:versionNumber/review-notes
   * Add a review note to a version.
   */
  fastify.post(
    '/learning-objects/:loId/versions/:versionNumber/review-notes',
    { preHandler: [requireRoles(REVIEWER_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = VersionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const bodyResult = ReviewNoteBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }

      const { loId, versionNumber } = paramsResult.data;
      const { noteText, noteType } = bodyResult.data;

      const version = await getVersionWithLO(loId, versionNumber);

      if (!version) {
        return reply.status(404).send({ error: 'Not found', message: 'Version not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, version.learningObject.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      const note = await addReviewNote({
        learningObjectVersionId: version.id,
        authorUserId: user.sub,
        noteText,
        noteType: noteType as NoteType,
      });

      return reply.status(201).send({
        note,
        message: 'Review note added',
      });
    }
  );
}
