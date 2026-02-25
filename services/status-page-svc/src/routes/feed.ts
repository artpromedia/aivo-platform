// ==============================================================================
// AIVO Status Page Service — Atom/RSS Feed
// ==============================================================================
// GET /api/feed.atom — Atom 1.0 feed of incidents and maintenance
// GET /api/feed.rss  — RSS 2.0 redirect (points to Atom)

import type { FastifyPluginAsync } from 'fastify';
import { getDb } from '../db/database.js';
import { config } from '../config.js';

export const feedRoutes: FastifyPluginAsync = async (app) => {
  // ── GET /api/feed.atom ──────────────────────────────────────────────
  app.get('/api/feed.atom', async (_req, reply) => {
    const db = getDb();

    // Get last 50 incidents and maintenance events
    const incidents: any[] = db
      .prepare(
        `SELECT * FROM incidents ORDER BY created_at DESC LIMIT 50`,
      )
      .all();

    const maintenance: any[] = db
      .prepare(
        `SELECT * FROM maintenance_windows ORDER BY created_at DESC LIMIT 20`,
      )
      .all();

    // Merge and sort by date
    const entries: FeedEntry[] = [];

    for (const inc of incidents) {
      entries.push({
        id: `incident:${inc.id}`,
        title: `[${inc.severity.toUpperCase()}] ${inc.title}`,
        content: inc.message || 'No details available.',
        link: `${config.publicUrl}/incidents/${inc.id}`,
        updated: inc.updated_at,
        published: inc.created_at,
        category: 'incident',
      });
    }

    for (const mw of maintenance) {
      entries.push({
        id: `maintenance:${mw.id}`,
        title: `[MAINTENANCE] ${mw.title}`,
        content: mw.description || `Scheduled: ${mw.scheduled_start} – ${mw.scheduled_end}`,
        link: `${config.publicUrl}/maintenance/${mw.id}`,
        updated: mw.updated_at,
        published: mw.created_at,
        category: 'maintenance',
      });
    }

    entries.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());

    const lastUpdated = entries[0]?.updated ?? new Date().toISOString();

    const atom = buildAtomFeed(entries, lastUpdated);

    return reply
      .type('application/atom+xml; charset=utf-8')
      .header('Cache-Control', 'public, max-age=60')
      .send(atom);
  });

  // ── GET /api/feed.rss — redirect to Atom ────────────────────────────
  app.get('/api/feed.rss', async (_req, reply) => {
    return reply.redirect(301, '/api/feed.atom');
  });
};

interface FeedEntry {
  id: string;
  title: string;
  content: string;
  link: string;
  updated: string;
  published: string;
  category: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildAtomFeed(entries: FeedEntry[], lastUpdated: string): string {
  const entryXml = entries
    .map(
      (e) => `
    <entry>
      <id>urn:aivo:status:${escapeXml(e.id)}</id>
      <title>${escapeXml(e.title)}</title>
      <link href="${escapeXml(e.link)}" rel="alternate" type="text/html"/>
      <updated>${e.updated}</updated>
      <published>${e.published}</published>
      <category term="${e.category}"/>
      <content type="text">${escapeXml(e.content)}</content>
    </entry>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>urn:aivo:status:feed</id>
  <title>AIVO Learning Platform — Status</title>
  <subtitle>Incidents and maintenance updates for the AIVO Learning Platform</subtitle>
  <link href="${config.publicUrl}/api/feed.atom" rel="self" type="application/atom+xml"/>
  <link href="${config.publicUrl}" rel="alternate" type="text/html"/>
  <updated>${lastUpdated}</updated>
  <author>
    <name>AIVO Status</name>
    <uri>${config.publicUrl}</uri>
  </author>
  <generator>AIVO Status Page Service</generator>
${entryXml}
</feed>`;
}
