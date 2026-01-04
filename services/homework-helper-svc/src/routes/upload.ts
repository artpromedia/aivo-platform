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
