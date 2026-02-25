// ==============================================================================
// AIVO Status Page Service — Subscriber Routes
// ==============================================================================
// POST   /api/subscribers              — subscribe
// GET    /api/subscribers/verify       — verify email
// DELETE /api/subscribers/unsubscribe  — unsubscribe

import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDb } from '../db/database.js';
import { config } from '../config.js';

const SubscribeBody = z.object({
  email: z.string().email(),
  webhook_url: z.string().url().optional(),
  components: z.array(z.string()).optional(), // null = all
});

export const subscriberRoutes: FastifyPluginAsync = async (app) => {
  // ── POST /api/subscribers ───────────────────────────────────────────
  app.post('/api/subscribers', async (req, reply) => {
    const parsed = SubscribeBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
    }

    const db = getDb();
    const { email, webhook_url, components } = parsed.data;

    // Check existing
    const existing = db.prepare('SELECT id FROM subscribers WHERE email = ?').get(email);
    if (existing) {
      return reply.status(409).send({ error: 'Email already subscribed' });
    }

    const id = randomUUID();
    const verificationToken = randomUUID();
    const unsubscribeToken = randomUUID();

    db.prepare(
      `INSERT INTO subscribers (id, email, webhook_url, components, verified, verification_token, unsubscribe_token)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
    ).run(
      id,
      email,
      webhook_url ?? null,
      components ? JSON.stringify(components) : null,
      verificationToken,
      unsubscribeToken,
    );

    // In production: send verification email
    const verifyUrl = `${config.publicUrl}/api/subscribers/verify?token=${verificationToken}`;
    console.log(`[subscribe] verify URL for ${email}: ${verifyUrl}`);

    return reply.status(201).send({
      message: 'Subscription created. Please check your email to verify.',
      id,
    });
  });

  // ── GET /api/subscribers/verify ─────────────────────────────────────
  app.get<{ Querystring: { token: string } }>(
    '/api/subscribers/verify',
    async (req, reply) => {
      const db = getDb();
      const { token } = req.query;

      if (!token) {
        return reply.status(400).send({ error: 'Missing verification token' });
      }

      const sub = db
        .prepare('SELECT id FROM subscribers WHERE verification_token = ?')
        .get(token);

      if (!sub) {
        return reply.status(404).send({ error: 'Invalid verification token' });
      }

      db.prepare('UPDATE subscribers SET verified = 1 WHERE verification_token = ?').run(token);

      return reply.send({ message: 'Email verified successfully. You are now subscribed.' });
    },
  );

  // ── DELETE /api/subscribers/unsubscribe ─────────────────────────────
  app.delete<{ Querystring: { token: string } }>(
    '/api/subscribers/unsubscribe',
    async (req, reply) => {
      const db = getDb();
      const { token } = req.query;

      if (!token) {
        return reply.status(400).send({ error: 'Missing unsubscribe token' });
      }

      const result = db
        .prepare('DELETE FROM subscribers WHERE unsubscribe_token = ?')
        .run(token);

      if (result.changes === 0) {
        return reply.status(404).send({ error: 'Invalid unsubscribe token' });
      }

      return reply.send({ message: 'Successfully unsubscribed.' });
    },
  );

  // Also support GET for unsubscribe (one-click from email)
  app.get<{ Querystring: { token: string } }>(
    '/api/subscribers/unsubscribe',
    async (req, reply) => {
      const db = getDb();
      const { token } = req.query;

      if (!token) {
        return reply.status(400).send({ error: 'Missing unsubscribe token' });
      }

      const result = db
        .prepare('DELETE FROM subscribers WHERE unsubscribe_token = ?')
        .run(token);

      if (result.changes === 0) {
        return reply.status(404).send({ error: 'Invalid unsubscribe token' });
      }

      return reply
        .type('text/html')
        .send('<html><body><h1>Unsubscribed</h1><p>You have been successfully unsubscribed from AIVO status updates.</p></body></html>');
    },
  );
};
