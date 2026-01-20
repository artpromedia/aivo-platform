/**
 * IEP Document Upload Routes
 *
 * Handles uploading, processing, and comparing existing IEP documents
 * with baseline assessment results.
 *
 * Flow:
 * 1. Parent/Teacher uploads IEP document (PDF/image)
 * 2. System extracts text and IEP goals using OCR/AI
 * 3. After baseline assessment completion, system compares results
 * 4. Parent reviews comparison and makes decision
 * 5. If approved, system generates new IEP based on assessment
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { extractIepContent, compareIepWithAssessment } from '../lib/iepProcessor.js';
import { publishIepComparisonReady, publishIepDecisionMade } from '../lib/eventPublisher.js';

// ── Type Definitions ────────────────────────────────────────────────────────

interface JwtUser {
  sub: string;
  tenantId?: string;
  tenant_id?: string;
  role: string;
}

// ── Zod Schemas ─────────────────────────────────────────────────────────────

const UploadIepSchema = z.object({
  fileId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().regex(/^(application\/pdf|image\/(jpeg|png|gif|webp|heic))$/),
  fileSizeBytes: z.number().int().positive().max(50 * 1024 * 1024), // Max 50MB
  s3Key: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

const ComparisonDecisionSchema = z.object({
  decision: z.enum(['AGREE_WITH_SYSTEM', 'PREFER_EXISTING', 'MERGE_BOTH', 'REQUEST_REVIEW']),
  notes: z.string().max(2000).optional(),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function getUserFromRequest(
  request: FastifyRequest
): { sub: string; tenantId: string; role: string } | null {
  const user = (request as unknown as { user?: JwtUser }).user;
  if (!user) return null;
  return {
    sub: user.sub,
    tenantId: user.tenantId ?? user.tenant_id ?? '',
    role: user.role,
  };
}

function canManageIep(
  user: { sub: string; tenantId: string; role: string },
  profile: { tenantId: string }
): boolean {
  // Admins, parents, and teachers can manage IEP documents
  if (user.tenantId !== profile.tenantId) return false;
  return ['admin', 'parent', 'teacher'].includes(user.role);
}

function canReadIep(
  user: { sub: string; tenantId: string; role: string },
  profile: { tenantId: string }
): boolean {
  return user.tenantId === profile.tenantId;
}

// ── Routes ──────────────────────────────────────────────────────────────────

export async function iepUploadRoutes(fastify: FastifyInstance) {
  /**
   * POST /baseline/profiles/:profileId/iep
   * Upload an existing IEP document for a baseline profile.
   * The document will be processed asynchronously.
   */
  fastify.post(
    '/baseline/profiles/:profileId/iep',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { profileId } = request.params as { profileId: string };

      const parseResult = UploadIepSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const { fileId, filename, mimeType, fileSizeBytes, s3Key, notes } = parseResult.data;

      // Fetch the baseline profile
      const profile = await prisma.baselineProfile.findUnique({
        where: { id: profileId },
        include: { iepDocuments: true },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Baseline profile not found' });
      }

      if (!canManageIep(user, profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      // Check if there's already an active IEP document
      const activeDoc = profile.iepDocuments.find(
        (doc) => !['REJECTED', 'ERROR'].includes(doc.status)
      );
      if (activeDoc) {
        return reply.status(409).send({
          error: 'An IEP document already exists for this profile',
          existingDocumentId: activeDoc.id,
          existingStatus: activeDoc.status,
        });
      }

      // Create the IEP document record
      const iepDocument = await prisma.baselineIepDocument.create({
        data: {
          baselineProfileId: profileId,
          fileId,
          filename,
          mimeType,
          fileSizeBytes,
          s3Key,
          status: 'PENDING',
          uploadedByUserId: user.sub,
          uploadedByRole: user.role,
          uploadNotes: notes,
        },
      });

      // Start async processing (OCR/AI extraction)
      // This happens in background - don't await
      processIepDocumentAsync(iepDocument.id, s3Key, mimeType).catch((error) => {
        fastify.log.error({ error, documentId: iepDocument.id }, 'Failed to process IEP document');
      });

      return reply.status(201).send({
        documentId: iepDocument.id,
        status: iepDocument.status,
        message: 'IEP document uploaded successfully. Processing will begin shortly.',
        processingEstimate: mimeType.startsWith('image/') ? '1-2 minutes' : '30 seconds',
      });
    }
  );

  /**
   * GET /baseline/profiles/:profileId/iep
   * Get the IEP document(s) for a baseline profile.
   */
  fastify.get(
    '/baseline/profiles/:profileId/iep',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { profileId } = request.params as { profileId: string };

      const profile = await prisma.baselineProfile.findUnique({
        where: { id: profileId },
        include: {
          iepDocuments: {
            orderBy: { createdAt: 'desc' },
            include: {
              comparisons: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Baseline profile not found' });
      }

      if (!canReadIep(user, profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const documents = profile.iepDocuments.map((doc) => ({
        id: doc.id,
        filename: doc.filename,
        mimeType: doc.mimeType,
        fileSizeBytes: doc.fileSizeBytes,
        status: doc.status,
        processingError: doc.processingError,
        uploadedByRole: doc.uploadedByRole,
        uploadNotes: doc.uploadNotes,
        createdAt: doc.createdAt,
        processedAt: doc.processedAt,
        hasComparison: doc.comparisons.length > 0,
        latestComparison: doc.comparisons[0]
          ? {
              id: doc.comparisons[0].id,
              decision: doc.comparisons[0].decision,
              overallMatchScore: Number(doc.comparisons[0].overallMatchScore),
              createdAt: doc.comparisons[0].createdAt,
            }
          : null,
      }));

      return reply.send({
        profileId,
        documents,
        hasActiveDocument: documents.some(
          (d) => !['REJECTED', 'ERROR'].includes(d.status)
        ),
      });
    }
  );

  /**
   * GET /baseline/iep-documents/:documentId
   * Get detailed information about an IEP document including extracted content.
   */
  fastify.get(
    '/baseline/iep-documents/:documentId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { documentId } = request.params as { documentId: string };

      const document = await prisma.baselineIepDocument.findUnique({
        where: { id: documentId },
        include: {
          profile: true,
          comparisons: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!document) {
        return reply.status(404).send({ error: 'IEP document not found' });
      }

      if (!canReadIep(user, document.profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      return reply.send({
        id: document.id,
        profileId: document.baselineProfileId,
        filename: document.filename,
        mimeType: document.mimeType,
        fileSizeBytes: document.fileSizeBytes,
        status: document.status,
        processingError: document.processingError,
        uploadedByRole: document.uploadedByRole,
        uploadNotes: document.uploadNotes,
        createdAt: document.createdAt,
        processedAt: document.processedAt,
        // Include extracted content if processed
        extractedContent:
          document.status === 'PROCESSED' || document.status === 'COMPARISON_READY'
            ? {
                goals: document.extractedGoalsJson,
                accommodations: document.extractedAccommodationsJson,
                services: document.extractedServicesJson,
                metadata: document.extractedMetadataJson,
              }
            : null,
        comparisons: document.comparisons.map((c) => ({
          id: c.id,
          attemptId: c.baselineAttemptId,
          decision: c.decision,
          overallMatchScore: Number(c.overallMatchScore),
          confidenceLevel: Number(c.confidenceLevel),
          summary: c.summaryJson,
          domainComparisons: c.domainComparisonsJson,
          goalAlignment: c.goalAlignmentJson,
          discrepancies: c.discrepanciesJson,
          recommendations: c.recommendationsJson,
          decisionNotes: c.decisionNotes,
          decisionAt: c.decisionAt,
          newIepGenerated: c.newIepGenerated,
          createdAt: c.createdAt,
        })),
      });
    }
  );

  /**
   * DELETE /baseline/iep-documents/:documentId
   * Remove an IEP document (soft delete by setting status to REJECTED).
   */
  fastify.delete(
    '/baseline/iep-documents/:documentId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { documentId } = request.params as { documentId: string };

      const document = await prisma.baselineIepDocument.findUnique({
        where: { id: documentId },
        include: { profile: true },
      });

      if (!document) {
        return reply.status(404).send({ error: 'IEP document not found' });
      }

      if (!canManageIep(user, document.profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      // Don't allow deletion if already approved
      if (document.status === 'APPROVED') {
        return reply.status(400).send({
          error: 'Cannot delete an approved IEP document',
        });
      }

      await prisma.baselineIepDocument.update({
        where: { id: documentId },
        data: {
          status: 'REJECTED',
          processingError: 'Deleted by user',
        },
      });

      return reply.status(204).send();
    }
  );

  /**
   * POST /baseline/profiles/:profileId/iep/compare
   * Trigger comparison between uploaded IEP and completed baseline assessment.
   * Requires: IEP document in PROCESSED status and completed baseline attempt.
   */
  fastify.post(
    '/baseline/profiles/:profileId/iep/compare',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { profileId } = request.params as { profileId: string };

      const profile = await prisma.baselineProfile.findUnique({
        where: { id: profileId },
        include: {
          iepDocuments: {
            where: { status: 'PROCESSED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          attempts: {
            where: { completedAt: { not: null } },
            orderBy: { attemptNumber: 'desc' },
            take: 1,
            include: { skillEstimates: true },
          },
        },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Baseline profile not found' });
      }

      if (!canManageIep(user, profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const iepDocument = profile.iepDocuments[0];
      if (!iepDocument) {
        return reply.status(400).send({
          error: 'No processed IEP document found',
          hint: 'Upload an IEP document and wait for processing to complete',
        });
      }

      const latestAttempt = profile.attempts[0];
      if (!latestAttempt) {
        return reply.status(400).send({
          error: 'No completed baseline assessment found',
          hint: 'Complete the baseline assessment before comparing with IEP',
        });
      }

      // Check if comparison already exists
      const existingComparison = await prisma.iepComparison.findUnique({
        where: {
          iepDocumentId_baselineAttemptId: {
            iepDocumentId: iepDocument.id,
            baselineAttemptId: latestAttempt.id,
          },
        },
      });

      if (existingComparison) {
        return reply.status(409).send({
          error: 'Comparison already exists',
          comparisonId: existingComparison.id,
          decision: existingComparison.decision,
        });
      }

      // Perform comparison using AI
      const comparisonResult = await compareIepWithAssessment({
        iepDocument,
        attempt: latestAttempt,
        gradeBand: profile.gradeBand,
      });

      // Create comparison record
      const comparison = await prisma.$transaction(async (tx) => {
        const newComparison = await tx.iepComparison.create({
          data: {
            iepDocumentId: iepDocument.id,
            baselineAttemptId: latestAttempt.id,
            summaryJson: comparisonResult.summary,
            domainComparisonsJson: comparisonResult.domainComparisons,
            goalAlignmentJson: comparisonResult.goalAlignment,
            discrepanciesJson: comparisonResult.discrepancies,
            recommendationsJson: comparisonResult.recommendations,
            overallMatchScore: comparisonResult.overallMatchScore,
            confidenceLevel: comparisonResult.confidenceLevel,
            decision: 'PENDING',
          },
        });

        // Update document status
        await tx.baselineIepDocument.update({
          where: { id: iepDocument.id },
          data: { status: 'COMPARISON_READY' },
        });

        return newComparison;
      });

      // Publish event for notifications
      await publishIepComparisonReady({
        tenantId: profile.tenantId,
        learnerId: profile.learnerId,
        profileId: profile.id,
        comparisonId: comparison.id,
        overallMatchScore: Number(comparison.overallMatchScore),
      });

      return reply.status(201).send({
        comparisonId: comparison.id,
        overallMatchScore: Number(comparison.overallMatchScore),
        confidenceLevel: Number(comparison.confidenceLevel),
        summary: comparisonResult.summary,
        domainComparisons: comparisonResult.domainComparisons,
        goalAlignment: comparisonResult.goalAlignment,
        discrepancies: comparisonResult.discrepancies,
        recommendations: comparisonResult.recommendations,
        message: 'Comparison completed. Please review and make a decision.',
      });
    }
  );

  /**
   * GET /baseline/comparisons/:comparisonId
   * Get detailed comparison results.
   */
  fastify.get(
    '/baseline/comparisons/:comparisonId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { comparisonId } = request.params as { comparisonId: string };

      const comparison = await prisma.iepComparison.findUnique({
        where: { id: comparisonId },
        include: {
          iepDocument: {
            include: { profile: true },
          },
          attempt: {
            include: { skillEstimates: true },
          },
        },
      });

      if (!comparison) {
        return reply.status(404).send({ error: 'Comparison not found' });
      }

      if (!canReadIep(user, comparison.iepDocument.profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      return reply.send({
        id: comparison.id,
        iepDocumentId: comparison.iepDocumentId,
        attemptId: comparison.baselineAttemptId,
        profileId: comparison.iepDocument.baselineProfileId,
        decision: comparison.decision,
        overallMatchScore: Number(comparison.overallMatchScore),
        confidenceLevel: Number(comparison.confidenceLevel),
        summary: comparison.summaryJson,
        domainComparisons: comparison.domainComparisonsJson,
        goalAlignment: comparison.goalAlignmentJson,
        discrepancies: comparison.discrepanciesJson,
        recommendations: comparison.recommendationsJson,
        decisionByRole: comparison.decisionByRole,
        decisionNotes: comparison.decisionNotes,
        decisionAt: comparison.decisionAt,
        newIepGenerated: comparison.newIepGenerated,
        generatedIepId: comparison.generatedIepId,
        createdAt: comparison.createdAt,
        // Include assessment results for context
        assessmentResults: {
          attemptNumber: comparison.attempt.attemptNumber,
          completedAt: comparison.attempt.completedAt,
          domainScores: comparison.attempt.domainScoresJson,
          overallEstimate: comparison.attempt.overallEstimateJson,
          skillEstimates: comparison.attempt.skillEstimates.map((e) => ({
            domain: e.domain,
            skillCode: e.skillCode,
            estimatedLevel: Number(e.estimatedLevel),
            confidence: Number(e.confidence),
          })),
        },
        // Include extracted IEP content
        extractedIepContent: {
          goals: comparison.iepDocument.extractedGoalsJson,
          accommodations: comparison.iepDocument.extractedAccommodationsJson,
          services: comparison.iepDocument.extractedServicesJson,
        },
      });
    }
  );

  /**
   * POST /baseline/comparisons/:comparisonId/decision
   * Submit parent/teacher decision on the IEP comparison.
   */
  fastify.post(
    '/baseline/comparisons/:comparisonId/decision',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { comparisonId } = request.params as { comparisonId: string };

      const parseResult = ComparisonDecisionSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const { decision, notes } = parseResult.data;

      const comparison = await prisma.iepComparison.findUnique({
        where: { id: comparisonId },
        include: {
          iepDocument: {
            include: { profile: true },
          },
        },
      });

      if (!comparison) {
        return reply.status(404).send({ error: 'Comparison not found' });
      }

      if (!canManageIep(user, comparison.iepDocument.profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      if (comparison.decision !== 'PENDING') {
        return reply.status(400).send({
          error: 'Decision has already been made',
          existingDecision: comparison.decision,
          decisionAt: comparison.decisionAt,
        });
      }

      // Update comparison with decision
      const updatedComparison = await prisma.$transaction(async (tx) => {
        const updated = await tx.iepComparison.update({
          where: { id: comparisonId },
          data: {
            decision,
            decisionByUserId: user.sub,
            decisionByRole: user.role,
            decisionNotes: notes,
            decisionAt: new Date(),
          },
        });

        // If approved, update document status
        if (decision === 'AGREE_WITH_SYSTEM') {
          await tx.baselineIepDocument.update({
            where: { id: comparison.iepDocumentId },
            data: { status: 'APPROVED' },
          });
        }

        return updated;
      });

      // Publish event for downstream processing
      await publishIepDecisionMade({
        tenantId: comparison.iepDocument.profile.tenantId,
        learnerId: comparison.iepDocument.profile.learnerId,
        profileId: comparison.iepDocument.profile.id,
        comparisonId,
        decision,
      });

      // Determine next steps based on decision
      let nextSteps: string;
      switch (decision) {
        case 'AGREE_WITH_SYSTEM':
          nextSteps =
            'The system will now generate a new IEP based on the assessment results. ' +
            'This IEP will be used to create your child\'s personalized learning brain.';
          break;
        case 'PREFER_EXISTING':
          nextSteps =
            'Your existing IEP goals will be used as the primary reference. ' +
            'The system will adapt the learning path to align with these goals.';
          break;
        case 'MERGE_BOTH':
          nextSteps =
            'The system will create a combined IEP that incorporates goals from both ' +
            'the existing IEP and the assessment results for comprehensive coverage.';
          break;
        case 'REQUEST_REVIEW':
          nextSteps =
            'A professional review has been requested. You will be notified when ' +
            'a specialist has reviewed the comparison and provided recommendations.';
          break;
        default:
          nextSteps = 'Your decision has been recorded.';
      }

      return reply.send({
        comparisonId: updatedComparison.id,
        decision: updatedComparison.decision,
        decisionAt: updatedComparison.decisionAt,
        nextSteps,
      });
    }
  );

  /**
   * GET /baseline/profiles/:profileId/iep/status
   * Get a summary of IEP upload and comparison status for a profile.
   */
  fastify.get(
    '/baseline/profiles/:profileId/iep/status',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { profileId } = request.params as { profileId: string };

      const profile = await prisma.baselineProfile.findUnique({
        where: { id: profileId },
        include: {
          iepDocuments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              comparisons: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
          attempts: {
            where: { completedAt: { not: null } },
            orderBy: { attemptNumber: 'desc' },
            take: 1,
          },
        },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Baseline profile not found' });
      }

      if (!canReadIep(user, profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const latestDocument = profile.iepDocuments[0];
      const latestComparison = latestDocument?.comparisons[0];
      const hasCompletedAssessment = profile.attempts.length > 0;

      // Determine overall status and next action
      let overallStatus: string;
      let nextAction: string | null = null;

      if (!latestDocument) {
        overallStatus = 'NO_IEP_UPLOADED';
        nextAction = 'Upload an existing IEP document (optional)';
      } else if (latestDocument.status === 'PENDING') {
        overallStatus = 'IEP_UPLOADING';
        nextAction = 'Waiting for document to be uploaded';
      } else if (latestDocument.status === 'PROCESSING') {
        overallStatus = 'IEP_PROCESSING';
        nextAction = 'Waiting for IEP content extraction';
      } else if (latestDocument.status === 'ERROR') {
        overallStatus = 'IEP_PROCESSING_ERROR';
        nextAction = 'Re-upload IEP document or continue without comparison';
      } else if (latestDocument.status === 'PROCESSED' && !hasCompletedAssessment) {
        overallStatus = 'AWAITING_ASSESSMENT';
        nextAction = 'Complete the baseline assessment';
      } else if (latestDocument.status === 'PROCESSED' && hasCompletedAssessment) {
        overallStatus = 'READY_FOR_COMPARISON';
        nextAction = 'Trigger comparison between IEP and assessment';
      } else if (latestDocument.status === 'COMPARISON_READY' && latestComparison?.decision === 'PENDING') {
        overallStatus = 'AWAITING_DECISION';
        nextAction = 'Review comparison and make a decision';
      } else if (latestComparison && latestComparison.decision !== 'PENDING') {
        overallStatus = 'DECISION_MADE';
        nextAction = latestComparison.newIepGenerated
          ? null
          : 'Waiting for new IEP generation';
      } else {
        overallStatus = 'UNKNOWN';
        nextAction = 'Contact support';
      }

      return reply.send({
        profileId,
        baselineStatus: profile.status,
        hasCompletedAssessment,
        iepUpload: latestDocument
          ? {
              documentId: latestDocument.id,
              filename: latestDocument.filename,
              status: latestDocument.status,
              processingError: latestDocument.processingError,
              uploadedAt: latestDocument.createdAt,
              processedAt: latestDocument.processedAt,
            }
          : null,
        comparison: latestComparison
          ? {
              comparisonId: latestComparison.id,
              decision: latestComparison.decision,
              overallMatchScore: Number(latestComparison.overallMatchScore),
              decisionAt: latestComparison.decisionAt,
              newIepGenerated: latestComparison.newIepGenerated,
            }
          : null,
        overallStatus,
        nextAction,
      });
    }
  );
}

// ── Async Processing ────────────────────────────────────────────────────────

/**
 * Process an IEP document asynchronously.
 * Extracts text and IEP content using OCR/AI.
 */
async function processIepDocumentAsync(
  documentId: string,
  s3Key: string,
  mimeType: string
): Promise<void> {
  try {
    // Update status to processing
    await prisma.baselineIepDocument.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    // Extract content from the document
    const extractedContent = await extractIepContent(s3Key, mimeType);

    // Update with extracted content
    await prisma.baselineIepDocument.update({
      where: { id: documentId },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        extractedTextJson: extractedContent.rawText,
        extractedGoalsJson: extractedContent.goals,
        extractedAccommodationsJson: extractedContent.accommodations,
        extractedServicesJson: extractedContent.services,
        extractedMetadataJson: extractedContent.metadata,
      },
    });
  } catch (error) {
    // Update with error status
    await prisma.baselineIepDocument.update({
      where: { id: documentId },
      data: {
        status: 'ERROR',
        processingError: error instanceof Error ? error.message : 'Unknown error during processing',
      },
    });
    throw error;
  }
}
