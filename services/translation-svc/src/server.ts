/**
 * Translation Service Server
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { translationRoutes } from './routes/translations';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'translation-svc' }));

// API routes
app.route('/api/v1', translationRoutes);

// Start server
const port = parseInt(process.env.PORT ?? '3050', 10);

console.log(`🌐 Translation service starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
