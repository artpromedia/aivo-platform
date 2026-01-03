/**
 * Email Routes
 *
 * REST endpoints for sending transactional emails.
 * Used by other services (auth-svc, billing-svc, etc.) for system emails.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { sendTemplatedEmail } from '../channels/email/email.service.js';
import type { SupportedLocale } from '../channels/email/types.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const SendEmailSchema = z.object({
  templateName: z.string().min(1),
  to: z.string().email(),
  context: z.record(z.unknown()),
  locale: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerEmailRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/email/send
   * Send a templated transactional email
   *
   * This endpoint is intended for internal service-to-service communication.
   * It should be protected by network policies in production.
   */
  fastify.post(
    '/api/v1/email/send',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const serviceName = request.headers['x-service-name'] as string;

      // Log the service making the request
      fastify.log.info({ serviceName }, 'Email send request received');

      try {
        const body = SendEmailSchema.parse(request.body);

        const result = await sendTemplatedEmail({
          templateName: body.templateName,
          to: body.to,
          context: body.context,
          locale: (body.locale || 'en') as SupportedLocale,
          category: body.category,
          tags: body.tags,
        });

        if (result.success) {
          fastify.log.info(
            {
              to: body.to,
              template: body.templateName,
              messageId: result.messageId,
            },
            'Email sent successfully'
          );

          return reply.status(200).send({
            data: {
              success: true,
              messageId: result.messageId,
            },
          });
        } else {
          fastify.log.warn(
            {
              to: body.to,
              template: body.templateName,
              error: result.errorMessage,
            },
            'Email send failed'
          );

          return reply.status(500).send({
            error: 'Failed to send email',
            message: result.errorMessage,
          });
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation error',
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Email route error');
        return reply.status(500).send({
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * GET /api/v1/email/health
   * Check email service health
   */
  fastify.get('/api/v1/email/health', async (_request, reply) => {
    // Import dynamically to avoid circular dependency
    const { emailService } = await import('../channels/email/email.service.js');

    const health = emailService.getHealthStatus();

    return reply.send({
      status: health.initialized ? 'healthy' : 'degraded',
      details: health,
    });
  });
}
