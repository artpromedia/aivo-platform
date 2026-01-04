/**
 * Speech Therapy Recordings Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { SpeechTherapyService } from '../services/speech.service.js';
import { prisma } from '../db.js';

const service = new SpeechTherapyService(prisma);

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

    // In production, upload to S3/GCS and get URL
    // For now, return placeholder
    const audioUrl = `https://storage.example.com/recordings/${Date.now()}-${data.filename}`;

    // Get metadata from fields
    const fields = data.fields as Record<string, any>;
    const sessionId = fields.sessionId?.value;
    const activityId = fields.activityId?.value;
    const targetPhrase = fields.targetPhrase?.value;
    const durationSec = parseFloat(fields.durationSec?.value || '0');

    if (!sessionId) {
      return reply.code(400).send({ error: 'sessionId is required' });
    }

    const recording = await service.saveRecording(user.tenantId, {
      sessionId,
      activityId,
      audioUrl,
      durationSec,
      targetPhrase,
    });

    return reply.code(201).send(recording);
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
