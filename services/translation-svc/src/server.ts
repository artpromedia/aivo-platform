/**
 * Translation Service Server
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';

import { logger } from './logger.js';
import { translationRoutes } from './routes/translations';

const app = new Hono();

// Middleware
app.use('*', honoLogger());
app.use('*', cors());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'translation-svc' }));

// API routes
app.route('/api/v1', translationRoutes);

// Start server
const port = parseInt(process.env.PORT ?? '3050', 10);

logger.info({ port }, 'Translation service starting');

serve({
  fetch: app.fetch,
  port,
});
