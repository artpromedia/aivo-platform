/**
 * AIVO IEP Service - Document Pipeline Routes
 *
 * PRD: IEP document upload, OCR extraction, human review, and AI suggestions.
 *
 * POST /documents/upload         — Upload IEP PDF (25MB, 50 pages max)
 * GET  /documents/:id            — Get document status and extracted data
 * GET  /documents/review-queue   — Human-in-the-loop review queue (<80% confidence)
 * POST /documents/:id/review     — Submit human review of extracted data
 * POST /documents/:id/suggestions — Get AI suggestions for non-measurable goals
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';

// PRD: 25MB max file size, 50 pages max
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const MAX_PAGES = 50;
const CONFIDENCE_THRESHOLD = 0.8; // 80% — below this triggers human review

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL ?? 'http://localhost:4090';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:4091';

export default async function documentPipelineRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /documents/upload
   * Upload IEP PDF with size/page validation.
   */
  fastify.post('/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const body = request.body as {
      studentId: string;
      fileName: string;
      fileSize: number;
      pageCount?: number;
      fileUrl: string; // Pre-signed S3 URL where the file was uploaded
      mimeType?: string;
    };

    // Validate file size
    if (body.fileSize > MAX_FILE_SIZE_BYTES) {
      return reply.status(400).send({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
        maxSizeBytes: MAX_FILE_SIZE_BYTES,
      });
    }

    // Validate page count if provided
    if (body.pageCount && body.pageCount > MAX_PAGES) {
      return reply.status(400).send({
        error: `Too many pages. Maximum is ${MAX_PAGES} pages.`,
        maxPages: MAX_PAGES,
      });
    }

    // Validate mime type
    const allowedTypes = ['application/pdf'];
    if (body.mimeType && !allowedTypes.includes(body.mimeType)) {
      return reply.status(400).send({
        error: 'Only PDF files are accepted.',
        allowedTypes,
      });
    }

    // Create document record
    const document = await prisma.iEPDocument.create({
      data: {
        tenantId,
        studentId: body.studentId,
        fileName: body.fileName,
        fileUrl: body.fileUrl,
        fileSize: body.fileSize,
        pageCount: body.pageCount ?? null,
        mimeType: body.mimeType ?? 'application/pdf',
        status: 'UPLOADED',
        uploadedBy: userId,
      },
    });

    // Trigger OCR pipeline asynchronously
    void triggerOcrPipeline(document.id, body.fileUrl, tenantId).catch((err) => {
      fastify.log.error({ err, documentId: document.id }, 'OCR pipeline trigger failed');
    });

    return reply.status(201).send({
      id: document.id,
      status: 'UPLOADED',
      message: 'Document uploaded. OCR processing will begin shortly.',
    });
  });

  /**
   * GET /documents/:id
   * Get document status and any extracted data.
   */
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { id } = request.params as { id: string };

    const document = await prisma.iEPDocument.findFirst({
      where: { id, tenantId },
    });

    if (!document) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    return reply.send(document);
  });

  /**
   * GET /documents/review-queue
   * PRD: Human-in-the-loop review queue for low confidence extractions (<80%).
   */
  fastify.get('/review-queue', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { page = '1', pageSize = '20' } = request.query as { page?: string; pageSize?: string };

    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const [items, totalItems] = await Promise.all([
      prisma.iEPDocument.findMany({
        where: {
          tenantId,
          status: 'NEEDS_REVIEW',
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(pageSize),
      }),
      prisma.iEPDocument.count({
        where: { tenantId, status: 'NEEDS_REVIEW' },
      }),
    ]);

    return reply.send({
      data: items,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalItems,
        totalPages: Math.ceil(totalItems / parseInt(pageSize)),
      },
    });
  });

  /**
   * POST /documents/:id/review
   * Submit human review corrections for extracted data.
   */
  fastify.post('/:id/review', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };
    const body = request.body as {
      approved: boolean;
      corrections?: Record<string, unknown>;
      notes?: string;
    };

    const document = await prisma.iEPDocument.findFirst({
      where: { id, tenantId, status: 'NEEDS_REVIEW' },
    });

    if (!document) {
      return reply.status(404).send({ error: 'Document not found or not in review state' });
    }

    const updated = await prisma.iEPDocument.update({
      where: { id },
      data: {
        status: body.approved ? 'REVIEWED' : 'REJECTED',
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: body.notes,
        extractedData: body.corrections
          ? { ...(document.extractedData as object ?? {}), ...body.corrections }
          : document.extractedData,
      },
    });

    return reply.send(updated);
  });

  /**
   * POST /documents/:id/suggestions
   * PRD: AI suggestions for non-measurable goals.
   * Calls the AI service to analyze goal descriptions and suggest improvements.
   */
  fastify.post('/:id/suggestions', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { id } = request.params as { id: string };

    const document = await prisma.iEPDocument.findFirst({
      where: { id, tenantId },
    });

    if (!document) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    try {
      const suggestions = await getAiGoalSuggestions(
        document.extractedData as { goals?: any[] } | null,
      );
      return reply.send({ documentId: id, suggestions });
    } catch (err) {
      fastify.log.error({ err }, 'AI suggestion service unavailable');
      return reply.status(503).send({
        error: 'AI suggestion service is currently unavailable. Please try again later.',
      });
    }
  });
}

/**
 * Trigger OCR pipeline for document extraction.
 * Calls the external OCR service and updates document status.
 */
async function triggerOcrPipeline(documentId: string, fileUrl: string, tenantId: string): Promise<void> {
  await prisma.iEPDocument.update({
    where: { id: documentId },
    data: { status: 'PROCESSING' },
  });

  try {
    const response = await fetch(`${OCR_SERVICE_URL}/api/v1/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-name': 'iep-svc',
      },
      body: JSON.stringify({
        documentId,
        fileUrl,
        tenantId,
        extractionTargets: ['student_name', 'dates', 'goals', 'services', 'accommodations'],
      }),
    });

    if (!response.ok) {
      throw new Error(`OCR service returned ${response.status}`);
    }

    const result = (await response.json()) as {
      confidence: number;
      extractedData: Record<string, unknown>;
    };

    // PRD: If confidence < 80%, route to human review queue
    const needsReview = result.confidence < CONFIDENCE_THRESHOLD;

    await prisma.iEPDocument.update({
      where: { id: documentId },
      data: {
        status: needsReview ? 'NEEDS_REVIEW' : 'EXTRACTED',
        extractedData: result.extractedData,
        ocrConfidence: result.confidence,
      },
    });
  } catch {
    await prisma.iEPDocument.update({
      where: { id: documentId },
      data: { status: 'OCR_FAILED' },
    });
  }
}

/**
 * Get AI suggestions for improving non-measurable IEP goals.
 */
async function getAiGoalSuggestions(
  extractedData: { goals?: any[] } | null,
): Promise<{ goalIndex: number; original: string; suggestion: string; reason: string }[]> {
  const goals = extractedData?.goals ?? [];
  if (goals.length === 0) {
    return [];
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/v1/iep/goal-suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-name': 'iep-svc',
    },
    body: JSON.stringify({ goals }),
  });

  if (!response.ok) {
    throw new Error(`AI service returned ${response.status}`);
  }

  return (await response.json()) as {
    goalIndex: number;
    original: string;
    suggestion: string;
    reason: string;
  }[];
}
