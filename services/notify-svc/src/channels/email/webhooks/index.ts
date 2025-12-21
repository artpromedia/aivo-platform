/**
 * Email Webhooks Index
 *
 * Central registration point for all email provider webhooks
 */

import type { FastifyInstance } from 'fastify';

import { registerSendGridWebhook } from './sendgrid.webhook.js';
import { registerSESWebhook } from './ses.webhook.js';

export { sendGridWebhookHandler, transformToCanonicalEvent as transformSendGridEvent } from './sendgrid.webhook.js';
export { sesWebhookHandler, transformToCanonicalEvent as transformSESEvent } from './ses.webhook.js';

/**
 * Register all email webhook routes
 */
export function registerEmailWebhooks(fastify: FastifyInstance): void {
  console.log('[EmailWebhooks] Registering webhook handlers...');
  
  registerSendGridWebhook(fastify);
  registerSESWebhook(fastify);
  
  console.log('[EmailWebhooks] All webhook handlers registered');
}
