/**
 * Speech Therapy Recordings Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

import { prisma } from '../db.js';
import { SpeechTherapyService } from '../services/speech.service.js';
import { logger } from '../logger.js';

const service = new SpeechTherapyService(prisma);

// Initialize S3 client for audio storage
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const RECORDINGS_BUCKET = process.env.RECORDINGS_S3_BUCKET || 'aivo-speech-recordings';
const CDN_BASE_URL = process.env.RECORDINGS_CDN_URL || `https://${RECORDINGS_BUCKET}.s3.amazonaws.com`;

const saveRecordingSchema = z.object({
  sessionId: z.string().uuid(),
  activityId: z.string().uuid().optional(),
  audioUrl: z.string().url(),
  durationSec: z.number().positive(),
  targetPhrase: z.string().optional(),
});

const analyzeRecordingSchema = z.object({
  targetPhrase: z.string().min(1),
});

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const recordingsRoutes: FastifyPluginAsync = async (app) => {
  // Save a recording (after upload to storage)
  app.post<{ Body: z.infer<typeof saveRecordingSchema> }>('/', async (request, reply) => {
    const user = getUser(request);
    const body = saveRecordingSchema.parse(request.body);

    const recording = await service.saveRecording(user.tenantId, body);
    return reply.code(201).send(recording);
  });

  // Upload and save a recording
  app.post('/upload', async (request, reply) => {
    const user = getUser(request);
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    // Get metadata from fields
    const fields = data.fields as Record<string, any>;
    const sessionId = fields.sessionId?.value;
    const activityId = fields.activityId?.value;
    const targetPhrase = fields.targetPhrase?.value;
    const durationSec = parseFloat(fields.durationSec?.value || '0');

    if (!sessionId) {
      return reply.code(400).send({ error: 'sessionId is required' });
    }

    // Upload to S3
    const recordingId = randomUUID();
    const fileExtension = data.filename?.split('.').pop() || 'wav';
    const s3Key = `recordings/${user.tenantId}/${sessionId}/${recordingId}.${fileExtension}`;

    try {
      // Read file buffer
      const fileBuffer = await data.toBuffer();

      // Determine content type
      const contentType = data.mimetype || 'audio/wav';

      // Upload to S3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: RECORDINGS_BUCKET,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: contentType,
          Metadata: {
            tenantId: user.tenantId,
            sessionId,
            ...(activityId && { activityId }),
            uploadedBy: user.sub,
          },
        })
      );

      const audioUrl = `${CDN_BASE_URL}/${s3Key}`;

      logger.info(
        { tenantId: user.tenantId, sessionId, recordingId, s3Key },
        'Recording uploaded to S3'
      );

      const recording = await service.saveRecording(user.tenantId, {
        sessionId,
        activityId,
        audioUrl,
        durationSec,
        targetPhrase,
      });

      return reply.code(201).send(recording);
    } catch (error) {
      logger.error({ error, tenantId: user.tenantId, sessionId }, 'Failed to upload recording');
      return reply.code(500).send({ error: 'Failed to upload recording' });
    }
  });

  // Analyze a recording
  app.post<{ Params: { recordingId: string }; Body: z.infer<typeof analyzeRecordingSchema> }>(
    '/:recordingId/analyze',
    async (request, reply) => {
      const { recordingId } = request.params;
      const body = analyzeRecordingSchema.parse(request.body);

      try {
        const analysis = await service.analyzeRecording(recordingId, body.targetPhrase);
        return reply.send(analysis);
      } catch (error) {
        return reply.code(404).send({ error: 'Recording not found' });
      }
    }
  );
};
