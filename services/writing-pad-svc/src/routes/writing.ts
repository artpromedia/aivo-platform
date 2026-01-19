/**
 * Writing Pad Routes
 *
 * API endpoints for AI-assisted writing functionality.
 */

import { Role, requireRole, type AuthContext } from '@aivo/ts-rbac';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { config } from '../config.js';
import {
  getWritingAssistance,
  calculateMetrics,
  getWritingPrompts,
} from '../services/ai-writing.service.js';
import type { WritingDocument, WritingType, GradeBand, FeedbackType } from '../types/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const writingTypeSchema = z.enum([
  'NARRATIVE',
  'PERSUASIVE',
  'EXPOSITORY',
  'DESCRIPTIVE',
  'POETRY',
  'JOURNAL',
  'NOTE',
  'DRAFT',
]);

const gradeBandSchema = z.enum(['K5', 'G6_8', 'G9_12']);

const subjectSchema = z.enum(['ELA', 'SCIENCE', 'SOCIAL_STUDIES', 'OTHER']);

const statusSchema = z.enum(['DRAFT', 'IN_PROGRESS', 'REVIEWING', 'COMPLETED', 'ARCHIVED']);

const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(config.maxDocumentSize).optional(),
  writingType: writingTypeSchema,
  subject: subjectSchema.optional(),
  gradeBand: gradeBandSchema.optional(),
  assignmentId: z.string().uuid().optional(),
});

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(config.maxDocumentSize).optional(),
  status: statusSchema.optional(),
});

const assistanceRequestSchema = z.object({
  requestTypes: z.array(z.enum(['FEEDBACK', 'SUGGESTIONS', 'CONTINUATION'])),
  focusAreas: z
    .array(
      z.enum([
        'GRAMMAR',
        'SPELLING',
        'STRUCTURE',
        'CLARITY',
        'VOCABULARY',
        'STYLE',
        'CONTENT',
        'ENCOURAGEMENT',
      ])
    )
    .optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORAGE (MVP - replace with database in production)
// ══════════════════════════════════════════════════════════════════════════════

const documents = new Map<string, WritingDocument>();
let documentIdCounter = 1;

function generateDocumentId(): string {
  return `doc-${Date.now()}-${documentIdCounter++}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedRequest extends FastifyRequest {
  auth?: AuthContext;
}

function getAuthFromRequest(request: FastifyRequest): AuthContext {
  const auth = (request as AuthenticatedRequest).auth;
  if (!auth?.userId || !auth?.tenantId) {
    throw new Error('Missing auth context');
  }
  return auth;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const registerWritingRoutes: FastifyPluginAsync = async (fastify) => {
  // ──────────────────────────────────────────────────────────────────────────────
  // POST /documents - Create a new writing document
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/documents',
    { preHandler: requireRole([Role.LEARNER, Role.TEACHER]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const parsed = createDocumentSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
      }

      const content = parsed.data.content || '';
      const metrics = calculateMetrics(content);

      const document: WritingDocument = {
        id: generateDocumentId(),
        tenant_id: auth.tenantId,
        learner_id: auth.userId,
        title: parsed.data.title,
        content,
        writing_type: parsed.data.writingType,
        subject: parsed.data.subject || null,
        grade_band: parsed.data.gradeBand || null,
        status: 'DRAFT',
        word_count: metrics.wordCount,
        character_count: content.length,
        assignment_id: parsed.data.assignmentId || null,
        session_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      documents.set(document.id, document);

      return reply.code(201).send({
        document,
        metrics,
      });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // GET /documents - List user's documents
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/documents',
    { preHandler: requireRole([Role.LEARNER, Role.TEACHER, Role.PARENT]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const query = request.query as {
        status?: string;
        writingType?: string;
        page?: string;
        pageSize?: string;
      };

      let userDocs = Array.from(documents.values()).filter(
        (d) => d.tenant_id === auth.tenantId && d.learner_id === auth.userId
      );

      // Filter by status
      if (query.status) {
        userDocs = userDocs.filter((d) => d.status === query.status);
      }

      // Filter by writing type
      if (query.writingType) {
        userDocs = userDocs.filter((d) => d.writing_type === query.writingType);
      }

      // Sort by updated_at descending
      userDocs.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());

      // Pagination
      const page = Number.parseInt(query.page || '1', 10);
      const pageSize = Math.min(Number.parseInt(query.pageSize || '20', 10), 100);
      const start = (page - 1) * pageSize;
      const paginatedDocs = userDocs.slice(start, start + pageSize);

      return reply.code(200).send({
        documents: paginatedDocs,
        total: userDocs.length,
        page,
        pageSize,
      });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // GET /documents/:id - Get a specific document
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/documents/:id',
    { preHandler: requireRole([Role.LEARNER, Role.TEACHER, Role.PARENT]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const { id } = request.params as { id: string };

      const document = documents.get(id);

      if (!document || document.tenant_id !== auth.tenantId) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      // Check ownership (learners can only see their own)
      if (auth.role === 'LEARNER' && document.learner_id !== auth.userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const metrics = calculateMetrics(document.content);

      return reply.code(200).send({
        document,
        metrics,
      });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // PATCH /documents/:id - Update a document
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.patch(
    '/documents/:id',
    { preHandler: requireRole([Role.LEARNER, Role.TEACHER]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const { id } = request.params as { id: string };

      const parsed = updateDocumentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
      }

      const document = documents.get(id);

      if (!document || document.tenant_id !== auth.tenantId) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      if (document.learner_id !== auth.userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Update fields
      if (parsed.data.title !== undefined) {
        document.title = parsed.data.title;
      }
      if (parsed.data.content !== undefined) {
        document.content = parsed.data.content;
        const metrics = calculateMetrics(document.content);
        document.word_count = metrics.wordCount;
        document.character_count = document.content.length;
      }
      if (parsed.data.status !== undefined) {
        document.status = parsed.data.status;
      }
      document.updated_at = new Date();

      const metrics = calculateMetrics(document.content);

      return reply.code(200).send({
        document,
        metrics,
      });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // DELETE /documents/:id - Delete a document
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.delete(
    '/documents/:id',
    { preHandler: requireRole([Role.LEARNER, Role.TEACHER]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const { id } = request.params as { id: string };

      const document = documents.get(id);

      if (!document || document.tenant_id !== auth.tenantId) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      if (document.learner_id !== auth.userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      documents.delete(id);

      return reply.code(204).send();
    }
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // POST /documents/:id/assistance - Get AI writing assistance
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/documents/:id/assistance',
    { preHandler: requireRole([Role.LEARNER, Role.TEACHER]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const { id } = request.params as { id: string };

      const parsed = assistanceRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
      }

      const document = documents.get(id);

      if (!document || document.tenant_id !== auth.tenantId) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      if (document.learner_id !== auth.userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      if (!document.content || document.content.trim().length === 0) {
        return reply.code(400).send({
          error: 'Cannot get assistance for empty document',
        });
      }

      try {
        const assistance = await getWritingAssistance({
          documentId: document.id,
          content: document.content,
          writingType: document.writing_type,
          gradeBand: document.grade_band || 'G6_8',
          subject: document.subject || undefined,
          requestTypes: parsed.data.requestTypes,
          focusAreas: parsed.data.focusAreas as FeedbackType[] | undefined,
        });

        return reply.code(200).send(assistance);
      } catch (err) {
        console.error('[WritingRoutes] AI assistance error:', err);
        return reply.code(500).send({
          error: 'Failed to get AI assistance',
        });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // GET /documents/:id/metrics - Get document metrics
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/documents/:id/metrics',
    { preHandler: requireRole([Role.LEARNER, Role.TEACHER, Role.PARENT]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const { id } = request.params as { id: string };

      const document = documents.get(id);

      if (!document || document.tenant_id !== auth.tenantId) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      const metrics = calculateMetrics(document.content);

      return reply.code(200).send({ metrics });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // GET /prompts - Get writing prompts
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/prompts',
    { preHandler: requireRole([Role.LEARNER, Role.TEACHER]) },
    async (request, reply) => {
      const query = request.query as {
        gradeBand?: string;
        writingType?: string;
      };

      const gradeBand = (query.gradeBand as GradeBand) || 'G6_8';
      const writingType = query.writingType as WritingType | undefined;

      const prompts = getWritingPrompts(gradeBand, writingType);

      return reply.code(200).send({ prompts });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // POST /analyze - Analyze text without saving
  // ──────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/analyze',
    { preHandler: requireRole([Role.LEARNER, Role.TEACHER]) },
    async (request, reply) => {
      const body = request.body as {
        content?: string;
        gradeBand?: string;
        writingType?: string;
      };

      if (!body.content || body.content.trim().length === 0) {
        return reply.code(400).send({ error: 'Content is required' });
      }

      const metrics = calculateMetrics(body.content);

      // Get quick feedback without full AI call
      try {
        const assistance = await getWritingAssistance({
          documentId: 'temp',
          content: body.content,
          writingType: (body.writingType as WritingType) || 'DRAFT',
          gradeBand: (body.gradeBand as GradeBand) || 'G6_8',
          requestTypes: ['FEEDBACK'],
        });

        return reply.code(200).send({
          metrics,
          feedback: assistance.feedback,
          encouragement: assistance.encouragement,
        });
      } catch {
        // Return just metrics if AI fails
        return reply.code(200).send({ metrics });
      }
    }
  );
};
