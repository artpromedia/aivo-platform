/**
 * Webhook Testing Routes
 */

import type { FastifyPluginAsync } from 'fastify';
import type { ExtendedPrismaClient } from '../prisma-types.js';
import { createHmac, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: ExtendedPrismaClient;
  }
}

type WebhookEventType =
  | 'SESSION_COMPLETED'
  | 'BASELINE_COMPLETED'
  | 'SKILL_MASTERED'
  | 'RECOMMENDATION_CREATED'
  | 'GOAL_ACHIEVED'
  | 'ASSIGNMENT_COMPLETED';

interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Generate webhook signature
 */
function signPayload(payload: string, secret: string): string {
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Generate sample webhook payloads
 */
function generateSamplePayload(eventType: WebhookEventType, tenantCode: string): WebhookPayload {
  const basePayload = {
    id: uuidv4(),
    type: eventType,
    timestamp: new Date().toISOString(),
    tenantCode,
  };

  switch (eventType) {
    case 'SESSION_COMPLETED':
      return {
        ...basePayload,
        data: {
          sessionId: uuidv4(),
          learnerId: uuidv4(),
          learnerExternalId: `student-${Math.floor(Math.random() * 1000)}`,
          sessionType: 'practice',
          skillDomain: 'math.algebra',
          startedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
          completedAt: new Date().toISOString(),
          durationSeconds: 1200,
          questionsAttempted: 15,
          questionsCorrect: 12,
          accuracyPct: 80,
          xpEarned: 45,
        },
      };

    case 'BASELINE_COMPLETED':
      return {
        ...basePayload,
        data: {
          baselineId: uuidv4(),
          learnerId: uuidv4(),
          learnerExternalId: `student-${Math.floor(Math.random() * 1000)}`,
          subject: 'math',
          gradeLevel: 5,
          completedAt: new Date().toISOString(),
          results: {
            overallScore: 72,
            domainScores: [
              { domain: 'math.number_sense', score: 85 },
              { domain: 'math.algebra', score: 65 },
              { domain: 'math.geometry', score: 70 },
              { domain: 'math.measurement', score: 68 },
            ],
            recommendedStartingLevel: 'grade_4_q3',
          },
        },
      };

    case 'SKILL_MASTERED':
      return {
        ...basePayload,
        data: {
          learnerId: uuidv4(),
          learnerExternalId: `student-${Math.floor(Math.random() * 1000)}`,
          skillId: 'math.algebra.linear_equations',
          skillName: 'Solving Linear Equations',
          masteredAt: new Date().toISOString(),
          masteryLevel: 0.92,
          timeToMastery: {
            sessions: 8,
            totalMinutes: 145,
            questionsAnswered: 124,
          },
        },
      };

    case 'RECOMMENDATION_CREATED':
      return {
        ...basePayload,
        data: {
          recommendationId: uuidv4(),
          learnerId: uuidv4(),
          learnerExternalId: `student-${Math.floor(Math.random() * 1000)}`,
          recommendationType: 'skill_practice',
          createdAt: new Date().toISOString(),
          recommendation: {
            skillId: 'math.fractions.adding',
            skillName: 'Adding Fractions',
            reason: 'Struggling area identified',
            suggestedMinutes: 15,
            priority: 'high',
          },
        },
      };

    case 'GOAL_ACHIEVED':
      return {
        ...basePayload,
        data: {
          goalId: uuidv4(),
          learnerId: uuidv4(),
          learnerExternalId: `student-${Math.floor(Math.random() * 1000)}`,
          goalType: 'weekly_minutes',
          targetValue: 60,
          achievedValue: 65,
          achievedAt: new Date().toISOString(),
          streak: 4,
        },
      };

    case 'ASSIGNMENT_COMPLETED':
      return {
        ...basePayload,
        data: {
          assignmentId: uuidv4(),
          learnerId: uuidv4(),
          learnerExternalId: `student-${Math.floor(Math.random() * 1000)}`,
          classId: uuidv4(),
          assignmentName: 'Chapter 5 Practice',
          assignedBy: 'teacher@school.edu',
          completedAt: new Date().toISOString(),
          results: {
            questionsAttempted: 20,
            questionsCorrect: 17,
            scorePct: 85,
            timeSpentMinutes: 25,
          },
        },
      };

    default:
      return {
        ...basePayload,
        data: {},
      };
  }
}

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  const { prisma } = fastify;

  // Send test webhook
  fastify.post('/test', async (request, reply) => {
    const { tenantCode, eventType, endpointId } = request.body as {
      tenantCode: string;
      eventType: WebhookEventType;
      endpointId?: string;
    };

    const tenant = await prisma.sandboxTenant.findUnique({
      where: { tenantCode },
      include: {
        webhookEndpoints: endpointId
          ? { where: { id: endpointId, isEnabled: true } }
          : { where: { isEnabled: true } },
      },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'tenant_not_found' });
    }

    if (tenant.webhookEndpoints.length === 0) {
      return reply.status(400).send({
        error: 'no_endpoints',
        message: 'No enabled webhook endpoints found',
      });
    }

    const payload = generateSamplePayload(eventType, tenantCode);
    const payloadJson = JSON.stringify(payload);
    const results: Array<{
      endpointId: string;
      url: string;
      status: 'success' | 'failed';
      responseStatus?: number;
      error?: string;
    }> = [];

    // Send to all enabled endpoints
    for (const endpoint of tenant.webhookEndpoints) {
      if (!endpoint.eventTypes.includes(eventType)) {
        continue;
      }

      const signature = signPayload(payloadJson, tenant.webhookSecret);

      // Create delivery record
      const delivery = await prisma.sandboxWebhookDelivery.create({
        data: {
          endpointId: endpoint.id,
          eventType,
          payloadJson: payload,
          status: 'PENDING',
          attempts: 1,
        },
      });

      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Aivo-Signature': signature,
            'X-Aivo-Event': eventType,
            'X-Aivo-Delivery-Id': delivery.id,
          },
          body: payloadJson,
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        const responseBody = await response.text().catch(() => '');

        await prisma.sandboxWebhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: response.ok ? 'DELIVERED' : 'FAILED',
            responseStatus: response.status,
            responseBody: responseBody.substring(0, 5000),
            deliveredAt: response.ok ? new Date() : null,
          },
        });

        results.push({
          endpointId: endpoint.id,
          url: endpoint.url,
          status: response.ok ? 'success' : 'failed',
          responseStatus: response.status,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await prisma.sandboxWebhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'FAILED',
            responseBody: errorMessage,
          },
        });

        results.push({
          endpointId: endpoint.id,
          url: endpoint.url,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    return {
      eventType,
      payload,
      deliveries: results,
    };
  });

  // Get sample payloads
  fastify.get('/samples', async (request, reply) => {
    const eventTypes: WebhookEventType[] = [
      'SESSION_COMPLETED',
      'BASELINE_COMPLETED',
      'SKILL_MASTERED',
      'RECOMMENDATION_CREATED',
      'GOAL_ACHIEVED',
      'ASSIGNMENT_COMPLETED',
    ];

    const samples = eventTypes.map(type => ({
      eventType: type,
      payload: generateSamplePayload(type, 'SAMPLE_TENANT'),
    }));

    return { samples };
  });

  // Verify webhook signature (for testing)
  fastify.post('/verify', async (request, reply) => {
    const { payload, signature, secret } = request.body as {
      payload: string;
      signature: string;
      secret: string;
    };

    // Parse signature
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      return reply.status(400).send({
        valid: false,
        error: 'Invalid signature format',
      });
    }

    const timestamp = timestampPart.split('=')[1];
    const providedSignature = signaturePart.split('=')[1];

    // Compute expected signature
    const expectedSignature = createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    const isValid = providedSignature === expectedSignature;

    // Check timestamp freshness (5 minute window)
    const timestampValue = timestamp ?? '0';
    const timestampAge = Date.now() - parseInt(timestampValue, 10);
    const isFresh = timestampAge < 5 * 60 * 1000;

    return {
      valid: isValid && isFresh,
      signatureMatch: isValid,
      timestampFresh: isFresh,
      timestampAge: Math.round(timestampAge / 1000),
    };
  });
};
