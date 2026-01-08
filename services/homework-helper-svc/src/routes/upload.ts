/**
 * Upload Routes for Homework Helper
 * Handles image/PDF uploads with OCR processing
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { ocrService, type OCRResult } from '../services/ocr.service.js';
import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const uploadSchema = z.object({
  subject: z.enum(['ELA', 'MATH', 'SCIENCE', 'OTHER']),
  gradeBand: z.enum(['K5', 'G6_8', 'G9_12']),
  detectMath: z.boolean().default(true),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  learnerId?: string;
}

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

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// Import homework route helpers for integrated flow
import { applyGuardrails } from '../guardrails/index.js';
import { aiOrchestratorClient } from '../services/aiOrchestratorClient.js';
import { sessionServiceClient } from '../services/sessionServiceClient.js';
import type {
  HomeworkGuardrails,
  HomeworkHelperRequest,
  GradeBand,
  Subject,
} from '../types/aiContract.js';

function buildGuardrails(gradeBand: GradeBand): HomeworkGuardrails {
  return {
    noDirectAnswers: true,
    maxHintsPerStep: 2,
    requireWorkShown: true,
    vocabularyLevel: gradeBand,
  };
}

export const registerUploadRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /upload/image
   * Upload an image and extract text using OCR
   */
  app.post('/image', async (request, reply) => {
    const user = getUser(request);
    const contentType = request.headers['content-type'] || '';

    // Handle multipart form data
    if (!contentType.includes('multipart/form-data')) {
      return reply.code(400).send({
        error: 'Content-Type must be multipart/form-data',
      });
    }

    // Get file data from request
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

    // Parse metadata from fields
    const fields = data.fields as Record<string, any>;
    const metadata = uploadSchema.safeParse({
      subject: fields.subject?.value,
      gradeBand: fields.gradeBand?.value,
      detectMath: fields.detectMath?.value === 'true',
    });

    if (!metadata.success) {
      return reply.code(400).send({
        error: 'Invalid metadata',
        details: metadata.error.issues,
      });
    }

    // Perform OCR
    let ocrResult: OCRResult;
    try {
      const isPdf = data.mimetype === 'application/pdf';

      if (isPdf) {
        ocrResult = await ocrService.extractTextFromPDF(fileBuffer, {
          detectMath: metadata.data.detectMath && metadata.data.subject === 'MATH',
          detectHandwriting: true,
        });
      } else {
        ocrResult = await ocrService.extractText(fileBuffer, {
          detectMath: metadata.data.detectMath && metadata.data.subject === 'MATH',
          detectHandwriting: true,
        });
      }
    } catch (error) {
      request.log.error({ error }, 'OCR processing failed');
      return reply.code(500).send({
        error: 'Failed to process image',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Check if OCR extracted any text
    if (!ocrResult.text || ocrResult.text.trim().length === 0) {
      return reply.code(422).send({
        error: 'No text detected in image',
        suggestion: 'Please ensure the image is clear and contains visible text',
      });
    }

    // Check confidence threshold
    if (ocrResult.confidence < 0.3) {
      return reply.code(422).send({
        error: 'Text extraction confidence too low',
        confidence: ocrResult.confidence,
        suggestion: 'Please upload a clearer image',
      });
    }

    return reply.send({
      success: true,
      extraction: {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        provider: ocrResult.provider,
        detectedLanguage: ocrResult.detectedLanguage,
        containsMath: ocrResult.containsMath,
        mathExpressions: ocrResult.mathExpressions,
        processingTimeMs: ocrResult.processingTimeMs,
      },
      metadata: {
        subject: metadata.data.subject,
        gradeBand: metadata.data.gradeBand,
        originalFilename: data.filename,
        mimeType: data.mimetype,
        fileSize: fileBuffer.length,
      },
    });
  });

  /**
   * POST /upload/url
   * Extract text from an image URL using OCR
   */
  app.post('/url', async (request, reply) => {
    const user = getUser(request);

    const bodySchema = z.object({
      imageUrl: z.string().url(),
      subject: z.enum(['ELA', 'MATH', 'SCIENCE', 'OTHER']),
      gradeBand: z.enum(['K5', 'G6_8', 'G9_12']),
      detectMath: z.boolean().default(true),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid request',
        details: parsed.error.issues,
      });
    }

    const { imageUrl, subject, gradeBand, detectMath } = parsed.data;

    // Perform OCR on URL
    let ocrResult: OCRResult;
    try {
      ocrResult = await ocrService.extractText(imageUrl, {
        detectMath: detectMath && subject === 'MATH',
        detectHandwriting: true,
      });
    } catch (error) {
      request.log.error({ error, imageUrl }, 'OCR processing failed for URL');
      return reply.code(500).send({
        error: 'Failed to process image',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    if (!ocrResult.text || ocrResult.text.trim().length === 0) {
      return reply.code(422).send({
        error: 'No text detected in image',
      });
    }

    return reply.send({
      success: true,
      extraction: {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        provider: ocrResult.provider,
        containsMath: ocrResult.containsMath,
        mathExpressions: ocrResult.mathExpressions,
        processingTimeMs: ocrResult.processingTimeMs,
      },
      metadata: {
        subject,
        gradeBand,
        sourceUrl: imageUrl,
      },
    });
  });

  /**
   * POST /upload/base64
   * Extract text from a base64-encoded image
   */
  app.post('/base64', async (request, reply) => {
    const user = getUser(request);

    const bodySchema = z.object({
      imageData: z.string().min(100), // Base64 encoded image
      mimeType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']).optional(),
      subject: z.enum(['ELA', 'MATH', 'SCIENCE', 'OTHER']),
      gradeBand: z.enum(['K5', 'G6_8', 'G9_12']),
      detectMath: z.boolean().default(true),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid request',
        details: parsed.error.issues,
      });
    }

    const { imageData, subject, gradeBand, detectMath } = parsed.data;

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    // Validate base64
    let imageBuffer: Buffer;
    try {
      imageBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      return reply.code(400).send({
        error: 'Invalid base64 image data',
      });
    }

    // Check file size
    if (imageBuffer.length > MAX_FILE_SIZE) {
      return reply.code(400).send({
        error: `Image too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Perform OCR
    let ocrResult: OCRResult;
    try {
      ocrResult = await ocrService.extractText(imageBuffer, {
        detectMath: detectMath && subject === 'MATH',
        detectHandwriting: true,
      });
    } catch (error) {
      request.log.error({ error }, 'OCR processing failed for base64 image');
      return reply.code(500).send({
        error: 'Failed to process image',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    if (!ocrResult.text || ocrResult.text.trim().length === 0) {
      return reply.code(422).send({
        error: 'No text detected in image',
      });
    }

    return reply.send({
      success: true,
      extraction: {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        provider: ocrResult.provider,
        containsMath: ocrResult.containsMath,
        mathExpressions: ocrResult.mathExpressions,
        processingTimeMs: ocrResult.processingTimeMs,
      },
      metadata: {
        subject,
        gradeBand,
        imageSize: imageBuffer.length,
      },
    });
  });

  /**
   * POST /upload/scan-and-start
   * Integrated endpoint: Upload image, perform OCR, and start homework session
   * This is the primary endpoint for mobile apps - handles the full OCR pipeline
   */
  app.post('/scan-and-start', async (request, reply) => {
    const user = getUser(request);
    const contentType = request.headers['content-type'] || '';

    // Handle multipart form data
    if (!contentType.includes('multipart/form-data')) {
      return reply.code(400).send({
        error: 'Content-Type must be multipart/form-data',
      });
    }

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

    if (fileBuffer.length > MAX_FILE_SIZE) {
      return reply.code(400).send({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Parse metadata
    const fields = data.fields as Record<string, any>;
    const scanAndStartSchema = z.object({
      subject: z.enum(['ELA', 'MATH', 'SCIENCE', 'OTHER']),
      gradeBand: z.enum(['K5', 'G6_8', 'G9_12']),
      detectMath: z.boolean().default(true),
      maxSteps: z.number().int().min(1).max(10).default(5),
      autoStart: z.boolean().default(true),
    });

    const metadata = scanAndStartSchema.safeParse({
      subject: fields.subject?.value,
      gradeBand: fields.gradeBand?.value,
      detectMath: fields.detectMath?.value === 'true' || fields.detectMath?.value === true,
      maxSteps: fields.maxSteps?.value ? parseInt(fields.maxSteps.value, 10) : 5,
      autoStart: fields.autoStart?.value !== 'false',
    });

    if (!metadata.success) {
      return reply.code(400).send({
        error: 'Invalid metadata',
        details: metadata.error.issues,
      });
    }

    const { subject, gradeBand, detectMath, maxSteps, autoStart } = metadata.data;

    // Step 1: Perform OCR
    let ocrResult: OCRResult;
    try {
      const isPdf = data.mimetype === 'application/pdf';

      if (isPdf) {
        ocrResult = await ocrService.extractTextFromPDF(fileBuffer, {
          detectMath: detectMath && subject === 'MATH',
          detectHandwriting: true,
        });
      } else {
        ocrResult = await ocrService.extractText(fileBuffer, {
          detectMath: detectMath && subject === 'MATH',
          detectHandwriting: true,
        });
      }
    } catch (error) {
      request.log.error({ error }, 'OCR processing failed');
      return reply.code(500).send({
        error: 'Failed to process image',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Check OCR results
    if (!ocrResult.text || ocrResult.text.trim().length === 0) {
      return reply.code(422).send({
        error: 'No text detected in image',
        suggestion: 'Please ensure the image is clear and contains visible text',
        ocrResult: {
          confidence: ocrResult.confidence,
          provider: ocrResult.provider,
          processingTimeMs: ocrResult.processingTimeMs,
        },
      });
    }

    if (ocrResult.confidence < 0.3) {
      return reply.code(422).send({
        error: 'Text extraction confidence too low',
        confidence: ocrResult.confidence,
        extractedText: ocrResult.text,
        suggestion: 'Please upload a clearer image or manually enter the problem text',
      });
    }

    const extractedText = ocrResult.text;

    // If autoStart is false, just return the OCR result
    if (!autoStart) {
      return reply.send({
        success: true,
        ocrComplete: true,
        homeworkStarted: false,
        extraction: {
          text: extractedText,
          confidence: ocrResult.confidence,
          provider: ocrResult.provider,
          containsMath: ocrResult.containsMath,
          mathExpressions: ocrResult.mathExpressions,
          processingTimeMs: ocrResult.processingTimeMs,
        },
        metadata: {
          subject,
          gradeBand,
          originalFilename: data.filename,
          mimeType: data.mimetype,
        },
      });
    }

    // Step 2: Create homework session (integrated flow)
    const learnerId = user.learnerId ?? user.sub;

    // Create session via session-svc
    let sessionId: string | undefined;
    try {
      const session = await sessionServiceClient.createSession(
        user.tenantId,
        learnerId,
        'HOMEWORK_HELPER',
        { subject, gradeBand, sourceType: 'IMAGE', ocrProvider: ocrResult.provider }
      );
      sessionId = session.id;
    } catch (err) {
      request.log.warn({ err }, 'Failed to create session, proceeding without session tracking');
    }

    // Create submission record
    const submission = await prisma.homeworkSubmission.create({
      data: {
        tenantId: user.tenantId,
        learnerId,
        sessionId,
        subject: subject as Subject,
        gradeBand: gradeBand as GradeBand,
        sourceType: 'IMAGE',
        rawText: extractedText,
        ocrConfidence: ocrResult.confidence,
        ocrProvider: ocrResult.provider,
        status: 'RECEIVED',
      },
    });

    // Emit events
    if (sessionId) {
      try {
        await sessionServiceClient.emitEvent(sessionId, 'HOMEWORK_CAPTURED', {
          submissionId: submission.id,
          sourceType: 'IMAGE',
          textLength: extractedText.length,
          ocrConfidence: ocrResult.confidence,
        });
      } catch (err) {
        request.log.warn({ err }, 'Failed to emit HOMEWORK_CAPTURED event');
      }
    }

    // Step 3: Call AI for scaffolding
    const guardrails = buildGuardrails(gradeBand as GradeBand);
    const aiRequest: HomeworkHelperRequest = {
      subject: subject as Subject,
      gradeBand: gradeBand as GradeBand,
      rawText: extractedText,
      maxSteps,
      guardrails,
    };

    let aiResponse;
    try {
      aiResponse = await aiOrchestratorClient.generateScaffolding(user.tenantId, aiRequest, {
        correlationId: submission.id,
        learnerId,
        sessionId,
      });
    } catch (err) {
      await prisma.homeworkSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'AI scaffolding failed',
        },
      });

      // Return partial success - OCR worked but AI failed
      return reply.code(207).send({
        success: true,
        ocrComplete: true,
        homeworkStarted: false,
        error: 'AI scaffolding failed, but text was extracted',
        extraction: {
          text: extractedText,
          confidence: ocrResult.confidence,
          provider: ocrResult.provider,
          containsMath: ocrResult.containsMath,
        },
        submission: {
          id: submission.id,
          status: 'FAILED',
        },
      });
    }

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
      ocrComplete: true,
      homeworkStarted: true,
      extraction: {
        text: extractedText,
        confidence: ocrResult.confidence,
        provider: ocrResult.provider,
        containsMath: ocrResult.containsMath,
        mathExpressions: ocrResult.mathExpressions,
        processingTimeMs: ocrResult.processingTimeMs,
      },
      submission: {
        id: submission.id,
        sessionId,
        subject,
        gradeBand,
        status: 'SCAFFOLDED',
        stepCount: stepRecords.length,
      },
      steps: stepRecords.map((s) => ({
        id: s.id,
        stepOrder: s.stepOrder,
        promptText: s.promptText,
        isStarted: s.isStarted,
        isCompleted: s.isCompleted,
      })),
    });
  });

  /**
   * GET /upload/providers
   * Get available OCR providers and their status
   */
  app.get('/providers', async (request, reply) => {
    const providers = {
      google_vision: {
        available: !!process.env.GOOGLE_VISION_API_KEY,
        features: ['text', 'handwriting', 'document'],
      },
      aws_textract: {
        available: !!process.env.AWS_TEXTRACT_ACCESS_KEY_ID,
        features: ['text', 'handwriting', 'forms', 'tables', 'pdf'],
      },
      mathpix: {
        available: !!process.env.MATHPIX_APP_ID,
        features: ['text', 'math', 'latex'],
      },
      tesseract: {
        available: true, // Always available as fallback
        features: ['text'],
      },
    };

    const defaultProvider = process.env.GOOGLE_VISION_API_KEY
      ? 'google_vision'
      : process.env.AWS_TEXTRACT_ACCESS_KEY_ID
        ? 'aws_textract'
        : 'tesseract';

    return reply.send({
      providers,
      defaultProvider,
      supportedFormats: ALLOWED_MIME_TYPES,
      maxFileSize: MAX_FILE_SIZE,
    });
  });
};
