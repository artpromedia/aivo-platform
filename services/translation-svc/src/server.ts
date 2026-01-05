/**
 * Translation Service Server
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { translationRoutes } from './routes/translations';

const app = new Hono();

// CORS configuration - requires explicit origins in production
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : process.env.NODE_ENV === 'production'
    ? [] // No origins allowed by default in production
    : ['http://localhost:3000', 'http://localhost:3001']; // Dev defaults

// Middleware
app.use('*', logger());
app.use('*', cors({ origin: corsOrigins, credentials: true }));

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
