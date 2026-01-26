/**
 * Image Upload Routes for Homework Helper
 * Handles image uploads, OCR processing, and homework session creation
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';

import { ocrOrchestrator, type Subject as OCRSubject } from '../ocr/index.js';
import { prisma } from '../prisma.js';
import { storageService } from '../services/storage.service.js';
import { cacheService } from '../services/cache.service.js';
import { aiOrchestratorClient } from '../services/aiOrchestratorClient.js';
import { sessionServiceClient } from '../services/sessionServiceClient.js';
import { applyGuardrails } from '../guardrails/index.js';
import type {
  HomeworkGuardrails,
  HomeworkHelperRequest,
  GradeBand,
  Subject,
} from '../types/aiContract.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  learnerId?: string;
}

interface UploadRecord {
  id: string;
  tenantId: string;
  learnerId: string;
  status: 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  extractedText?: string;
  confidence?: number;
  detectedSubject?: string;
  detectedProblemType?: string;
  ocrProvider?: string;
  processingTimeMs?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const uploadImageSchema = z.object({
  subject: z.enum(['ELA', 'MATH', 'SCIENCE', 'HISTORY', 'SOCIAL_STUDIES', 'OTHER']).optional(),
  gradeLevel: z.number().int().min(1).max(12).optional(),
  isHandwritten: z.boolean().optional(),
});

const getHelpSchema = z.object({
  confirmedText: z.string().optional(),
  specificQuestion: z.string().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const OCR_TIMEOUT = 30000; // 30 seconds

function buildGuardrails(gradeBand: GradeBand): HomeworkGuardrails {
  return {
    noDirectAnswers: true,
    maxHintsPerStep: 2,
    requireWorkShown: true,
    vocabularyLevel: gradeBand,
  };
}

function gradeToGradeBand(grade?: number): GradeBand {
  if (!grade) return 'G6_8';
  if (grade <= 5) return 'K5';
  if (grade <= 8) return 'G6_8';
  return 'G9_12';
}

function detectSubject(text: string): Subject {
  const lowerText = text.toLowerCase();

  // Math indicators
  const mathPatterns = [
    /\d+\s*[+\-*/×÷=]\s*\d+/,
    /solve|equation|calculate|find x|graph/i,
    /fraction|decimal|percent|ratio/i,
    /algebra|geometry|calculus|trigonometry/i,
  ];
  if (mathPatterns.some((p) => p.test(text))) {
    return 'MATH';
  }

  // Science indicators
  const sciencePatterns = [
    /experiment|hypothesis|variable|control/i,
    /cell|organism|species|ecosystem/i,
    /atom|molecule|chemical|element/i,
    /force|energy|motion|gravity/i,
  ];
  if (sciencePatterns.some((p) => p.test(text))) {
    return 'SCIENCE';
  }

  // ELA indicators
  const elaPatterns = [
    /essay|paragraph|sentence|grammar/i,
    /author|character|plot|theme/i,
    /metaphor|simile|alliteration|personification/i,
    /write|describe|explain|analyze/i,
  ];
  if (elaPatterns.some((p) => p.test(text))) {
    return 'ELA';
  }

  return 'OTHER';
}

function detectProblemType(text: string, subject: Subject): string {
  const lowerText = text.toLowerCase();

  if (subject === 'MATH') {
    if (/solve|find x|equation/i.test(text)) return 'equation-solving';
    if (/graph|plot|coordinate/i.test(text)) return 'graphing';
    if (/word problem|story problem/i.test(text)) return 'word-problem';
    if (/fraction/i.test(text)) return 'fractions';
    if (/percent/i.test(text)) return 'percentages';
    if (/geometry|area|perimeter|volume/i.test(text)) return 'geometry';
    return 'arithmetic';
  }

  if (subject === 'SCIENCE') {
    if (/experiment|hypothesis/i.test(text)) return 'scientific-method';
    if (/cell|organ|body/i.test(text)) return 'biology';
    if (/atom|element|compound/i.test(text)) return 'chemistry';
    if (/force|motion|energy/i.test(text)) return 'physics';
    return 'general-science';
  }

  if (subject === 'ELA') {
    if (/essay|write about/i.test(text)) return 'essay-writing';
    if (/read|passage|text/i.test(text)) return 'reading-comprehension';
    if (/grammar|sentence|punctuation/i.test(text)) return 'grammar';
    if (/vocabulary|define|meaning/i.test(text)) return 'vocabulary';
    return 'general-ela';
  }

  return 'general';
}

// In-memory upload tracking (in production, use Redis or database)
const uploadRecords = new Map<string, UploadRecord>();

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const registerImageUploadRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/v1/homework/upload-image
   * Upload an image for OCR processing
   */
  app.post('/upload-image', async (request, reply) => {
    const user = getUser(request);
    const learnerId = user.learnerId ?? user.sub;
    const contentType = request.headers['content-type'] ?? '';

    // Validate content type
    if (!contentType.includes('multipart/form-data')) {
      return reply.code(400).send({
        error: 'Content-Type must be multipart/form-data',
      });
    }

    // Get file from request
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
      return reply.code(400).send({
        error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      });
    }

    // Read file buffer
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    // Validate file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return reply.code(400).send({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Parse metadata from form fields
    const fields = data.fields as Record<string, { value?: string }>;
    const metadata = uploadImageSchema.safeParse({
      subject: fields.subject?.value,
      gradeLevel: fields.gradeLevel?.value
        ? Number.parseInt(fields.gradeLevel.value, 10)
        : undefined,
      isHandwritten: fields.isHandwritten?.value === 'true',
    });

    if (!metadata.success) {
      return reply.code(400).send({
        error: 'Invalid metadata',
        details: metadata.error.issues,
      });
    }

    // Create upload record
    const uploadId = randomUUID();
    const uploadRecord: UploadRecord = {
      id: uploadId,
      tenantId: user.tenantId,
      learnerId,
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    uploadRecords.set(uploadId, uploadRecord);

    // Return immediately with upload ID
    reply.code(202).send({
      uploadId,
      status: 'processing',
      message: 'Image upload received. Processing OCR...',
    });

    // Process OCR asynchronously
    processUpload(uploadId, fileBuffer, metadata.data, user).catch((error) => {
      request.log.error({ error, uploadId }, 'OCR processing failed');
    });
  });

  /**
   * GET /api/v1/homework/uploads/:uploadId
   * Get upload status and extracted text
   */
  app.get('/uploads/:uploadId', async (request, reply) => {
    const user = getUser(request);
    const { uploadId } = request.params as { uploadId: string };

    // Check cache first
    const cached = await cacheService.get(`upload:${uploadId}`);
    if (cached) {
      const record = JSON.parse(cached) as UploadRecord;

      // Verify ownership
      if (record.tenantId !== user.tenantId) {
        return reply.code(404).send({ error: 'Upload not found' });
      }

      return reply.send(formatUploadResponse(record));
    }

    // Check in-memory store
    const record = uploadRecords.get(uploadId);
    if (!record) {
      return reply.code(404).send({ error: 'Upload not found' });
    }

    // Verify ownership
    if (record.tenantId !== user.tenantId) {
      return reply.code(404).send({ error: 'Upload not found' });
    }

    return reply.send(formatUploadResponse(record));
  });

  /**
   * POST /api/v1/homework/uploads/:uploadId/get-help
   * Submit extracted problem for scaffolded help
   */
  app.post('/uploads/:uploadId/get-help', async (request, reply) => {
    const user = getUser(request);
    const learnerId = user.learnerId ?? user.sub;
    const { uploadId } = request.params as { uploadId: string };

    // Parse request body
    const body = getHelpSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({
        error: 'Invalid request',
        details: body.error.issues,
      });
    }

    // Get upload record
    let record = uploadRecords.get(uploadId);

    // Check cache if not in memory
    if (!record) {
      const cached = await cacheService.get(`upload:${uploadId}`);
      if (cached) {
        record = JSON.parse(cached) as UploadRecord;
      }
    }

    if (!record) {
      return reply.code(404).send({ error: 'Upload not found' });
    }

    // Verify ownership
    if (record.tenantId !== user.tenantId) {
      return reply.code(404).send({ error: 'Upload not found' });
    }

    // Verify OCR is complete
    if (record.status !== 'completed') {
      return reply.code(400).send({
        error: 'OCR processing not complete',
        status: record.status,
      });
    }

    // Use confirmed text if provided, otherwise use extracted text
    const problemText = body.data.confirmedText ?? record.extractedText;
    if (!problemText) {
      return reply.code(400).send({
        error: 'No text available. Please provide confirmedText.',
      });
    }

    // Determine subject and grade band
    const subject = (record.detectedSubject ?? 'OTHER') as Subject;
    const gradeBand: GradeBand = 'G6_8'; // Default, could be extracted from user profile

    try {
      // Create session
      let sessionId: string | undefined;
      try {
        const session = await sessionServiceClient.createSession(
          user.tenantId,
          learnerId,
          'HOMEWORK_HELPER',
          {
            subject,
            gradeBand,
            sourceType: 'IMAGE',
            uploadId,
            ocrProvider: record.ocrProvider,
          }
        );
        sessionId = session.id;
      } catch (err) {
        request.log.warn({ err }, 'Failed to create session');
      }

      // Create submission record
      const submission = await prisma.homeworkSubmission.create({
        data: {
          tenantId: user.tenantId,
          learnerId,
          sessionId,
          subject,
          gradeBand,
          sourceType: 'IMAGE',
          rawText: problemText,
          ocrConfidence: record.confidence,
          ocrProvider: record.ocrProvider,
          status: 'RECEIVED',
        },
      });

      // Emit event
      if (sessionId) {
        try {
          await sessionServiceClient.emitEvent(sessionId, 'HOMEWORK_CAPTURED', {
            submissionId: submission.id,
            sourceType: 'IMAGE',
            textLength: problemText.length,
            ocrConfidence: record.confidence,
            specificQuestion: body.data.specificQuestion,
          });
        } catch (err) {
          request.log.warn({ err }, 'Failed to emit event');
        }
      }

      // Request AI scaffolding
      const guardrails = buildGuardrails(gradeBand);
      const aiRequest: HomeworkHelperRequest = {
        subject,
        gradeBand,
        rawText: body.data.specificQuestion
          ? `${problemText}\n\nStudent's question: ${body.data.specificQuestion}`
          : problemText,
        maxSteps: 5,
        guardrails,
      };

      const aiResponse = await aiOrchestratorClient.generateScaffolding(
        user.tenantId,
        aiRequest,
        {
          correlationId: submission.id,
          learnerId,
          sessionId,
        }
      );

      // Apply guardrails and store steps
      const sanitizedSteps = aiResponse.content.steps.map((step) => ({
        ...step,
        promptText: applyGuardrails(step.promptText),
        hintText: step.hintText ? applyGuardrails(step.hintText) : undefined,
      }));

      const stepRecords = await Promise.all(
        sanitizedSteps.map((step) =>
          prisma.homeworkStep.create({
            data: {
              submissionId: submission.id,
              stepOrder: step.stepOrder,
              promptText: step.promptText,
              hintText: step.hintText ?? null,
              expectedConcept: step.expectedConcept ?? null,
            },
          })
        )
      );

      // Update submission status
      await prisma.homeworkSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'SCAFFOLDED',
          stepCount: stepRecords.length,
          aiCorrelationId: submission.id,
        },
      });

      // Emit completion event
      if (sessionId) {
        try {
          await sessionServiceClient.emitEvent(sessionId, 'HOMEWORK_PARSED', {
            submissionId: submission.id,
            stepCount: stepRecords.length,
            problemType: aiResponse.content.problemType,
          });
        } catch (err) {
          request.log.warn({ err }, 'Failed to emit HOMEWORK_PARSED event');
        }
      }

      return reply.code(201).send({
        success: true,
        submission: {
          id: submission.id,
          sessionId,
          subject,
          gradeBand,
          problemText,
          status: 'SCAFFOLDED',
          stepCount: stepRecords.length,
          problemType: aiResponse.content.problemType,
        },
        steps: stepRecords.map((s) => ({
          id: s.id,
          stepOrder: s.stepOrder,
          promptText: s.promptText,
          isStarted: s.isStarted,
          isCompleted: s.isCompleted,
        })),
      });
    } catch (error) {
      request.log.error({ error, uploadId }, 'Failed to get help');
      return reply.code(500).send({
        error: 'Failed to process help request',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/homework/uploads/providers
   * Get available OCR providers and their status
   */
  app.get('/providers', async (request, reply) => {
    const statuses = await ocrOrchestrator.getProviderStatuses();

    return reply.send({
      providers: statuses.map((s) => ({
        name: s.provider,
        available: s.available,
        successRate: s.successRate,
        averageLatencyMs: s.averageLatencyMs,
      })),
      supportedFormats: ALLOWED_MIME_TYPES,
      maxFileSize: MAX_FILE_SIZE,
      ocrTimeout: OCR_TIMEOUT,
    });
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// ASYNC PROCESSING
// ══════════════════════════════════════════════════════════════════════════════

async function processUpload(
  uploadId: string,
  imageBuffer: Buffer,
  metadata: z.infer<typeof uploadImageSchema>,
  user: AuthenticatedUser
): Promise<void> {
  const record = uploadRecords.get(uploadId);
  if (!record) return;

  try {
    // Upload image to storage
    let imageUrl: string | undefined;
    try {
      imageUrl = await storageService.uploadImage(
        imageBuffer,
        `uploads/${user.tenantId}/${uploadId}`
      );
      record.imageUrl = imageUrl;
    } catch (err) {
      // Non-fatal: continue without storage
      console.warn('Failed to upload image to storage:', err);
    }

    // Map subject type
    const ocrSubject = metadata.subject as OCRSubject | undefined;

    // Process OCR
    const ocrResult = await ocrOrchestrator.processImage(imageBuffer, {
      subject: ocrSubject,
      isHandwritten: metadata.isHandwritten,
      requireHighAccuracy: true,
    });

    // Check for text
    if (!ocrResult.text || ocrResult.text.trim().length === 0) {
      record.status = 'failed';
      record.error = 'No text detected in image';
      record.updatedAt = new Date();
      uploadRecords.set(uploadId, record);
      await cacheOcrResult(uploadId, record);
      return;
    }

    // Check confidence
    if (ocrResult.confidence < 0.3) {
      record.status = 'failed';
      record.error = 'Text extraction confidence too low';
      record.updatedAt = new Date();
      uploadRecords.set(uploadId, record);
      await cacheOcrResult(uploadId, record);
      return;
    }

    // Detect subject if not provided
    const detectedSubject = metadata.subject ?? detectSubject(ocrResult.text);
    const problemType = detectProblemType(ocrResult.text, detectedSubject as Subject);

    // Update record
    record.status = 'completed';
    record.extractedText = ocrResult.text;
    record.confidence = ocrResult.confidence;
    record.detectedSubject = detectedSubject;
    record.detectedProblemType = problemType;
    record.ocrProvider = ocrResult.provider;
    record.processingTimeMs = ocrResult.processingTimeMs;
    record.updatedAt = new Date();

    uploadRecords.set(uploadId, record);
    await cacheOcrResult(uploadId, record);
  } catch (error) {
    record.status = 'failed';
    record.error = error instanceof Error ? error.message : 'OCR processing failed';
    record.updatedAt = new Date();
    uploadRecords.set(uploadId, record);
    await cacheOcrResult(uploadId, record);
  }
}

async function cacheOcrResult(uploadId: string, record: UploadRecord): Promise<void> {
  try {
    // Cache for 24 hours
    await cacheService.set(`upload:${uploadId}`, JSON.stringify(record), 24 * 60 * 60);
  } catch (err) {
    console.warn('Failed to cache OCR result:', err);
  }
}

function formatUploadResponse(record: UploadRecord): object {
  return {
    uploadId: record.id,
    status: record.status,
    extractedText: record.extractedText,
    confidence: record.confidence,
    detectedSubject: record.detectedSubject,
    detectedProblemType: record.detectedProblemType,
    ocrProvider: record.ocrProvider,
    processingTimeMs: record.processingTimeMs,
    error: record.error,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
