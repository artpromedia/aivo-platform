/**
 * Branding Routes
 *
 * Admin endpoints for managing tenant white-label branding
 * and a public endpoint for retrieving branding by domain.
 *
 * Routes:
 *   GET    /admin/branding                  — Get current tenant branding
 *   PUT    /admin/branding                  — Update tenant branding
 *   POST   /admin/branding/logo             — Upload logo (multipart)
 *   POST   /admin/branding/logo-small       — Upload small logo (multipart)
 *   POST   /admin/branding/favicon          — Upload favicon (multipart)
 *   GET    /public/branding/:domain         — Get branding by domain (no auth, cached)
 *   GET    /public/branding                 — Get branding by query param ?domain=
 *
 * @module routes/branding.routes
 */

import { randomUUID } from 'node:crypto';

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import type { BrandingService } from '../services/branding.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schemas
// ══════════════════════════════════════════════════════════════════════════════

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const UpdateBrandingSchema = z.object({
  displayName: z.string().max(200).optional(),
  logoUrl: z.string().url().max(500).optional(),
  logoSmallUrl: z.string().url().max(500).optional(),
  faviconUrl: z.string().url().max(500).optional(),
  primaryColor: z.string().regex(hexColorRegex, 'Must be hex color (#RRGGBB)').optional(),
  primaryColorLight: z.string().regex(hexColorRegex).optional(),
  primaryColorDark: z.string().regex(hexColorRegex).optional(),
  secondaryColor: z.string().regex(hexColorRegex).optional(),
  accentColor: z.string().regex(hexColorRegex).optional(),
  backgroundColor: z.string().regex(hexColorRegex).optional(),
  surfaceColor: z.string().regex(hexColorRegex).optional(),
  textColor: z.string().regex(hexColorRegex).optional(),
  textMutedColor: z.string().regex(hexColorRegex).optional(),
  fontFamily: z.enum([
    'Inter', 'DM Sans', 'Plus Jakarta Sans', 'Roboto', 'Open Sans',
    'Lato', 'Poppins', 'Nunito', 'Montserrat', 'Source Sans 3',
  ]).optional(),
  borderRadius: z.enum(['0', '0.25rem', '0.375rem', '0.5rem', '0.75rem', '1rem']).optional(),
  loginBackground: z.string().url().max(500).nullable().optional(),
  loginMessage: z.string().max(500).nullable().optional(),
  supportEmail: z.string().email().max(200).nullable().optional(),
  supportUrl: z.string().url().max(500).nullable().optional(),
  privacyPolicyUrl: z.string().url().max(500).nullable().optional(),
  termsOfServiceUrl: z.string().url().max(500).nullable().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// Admin Routes
// ══════════════════════════════════════════════════════════════════════════════

export interface BrandingRoutesOpts {
  service: BrandingService;
  uploadAsset?: (
    tenantId: string,
    fileName: string,
    data: Buffer,
    contentType: string,
  ) => Promise<string>; // returns URL
}

export const brandingAdminRoutes: FastifyPluginAsync<BrandingRoutesOpts> = async (
  fastify,
  opts,
) => {
  const { service, uploadAsset } = opts;

  // ────────── GET /admin/branding ──────────
  fastify.get('/', async (request, reply) => {
    const tenantId = (request as any).tenantId as string | undefined;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing tenantId' });
    }

    const branding = await service.getBranding(tenantId);
    const raw = await service.getRawBranding(tenantId);

    return reply.send({
      ...branding,
      _raw: raw, // Include raw record for admin editing
    });
  });

  // ────────── PUT /admin/branding ──────────
  fastify.put<{ Body: z.infer<typeof UpdateBrandingSchema> }>('/', async (request, reply) => {
    const tenantId = (request as any).tenantId as string | undefined;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing tenantId' });
    }

    const input = UpdateBrandingSchema.parse(request.body);
    const branding = await service.updateBranding(tenantId, input);

    return reply.send(branding);
  });

  // ────────── POST /admin/branding/logo ──────────
  fastify.post('/logo', async (request, reply) => {
    const tenantId = (request as any).tenantId as string | undefined;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing tenantId' });
    }

    if (!uploadAsset) {
      return reply.status(501).send({ error: 'Asset upload not configured' });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file provided' });
    }

    const allowedTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Invalid file type. Allowed: SVG, PNG, JPG, WebP' });
    }

    const buf = await data.toBuffer();
    if (buf.length > 2 * 1024 * 1024) {
      return reply.status(400).send({ error: 'File too large (max 2 MB)' });
    }

    const ext = data.mimetype.split('/').pop()?.replace('svg+xml', 'svg') ?? 'png';
    const fileName = `logo-${randomUUID().slice(0, 8)}.${ext}`;
    const url = await uploadAsset(tenantId, fileName, buf, data.mimetype);

    const branding = await service.updateBranding(tenantId, { logoUrl: url });
    return reply.send(branding);
  });

  // ────────── POST /admin/branding/logo-small ──────────
  fastify.post('/logo-small', async (request, reply) => {
    const tenantId = (request as any).tenantId as string | undefined;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing tenantId' });
    }

    if (!uploadAsset) {
      return reply.status(501).send({ error: 'Asset upload not configured' });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file provided' });
    }

    const allowedTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Invalid file type' });
    }

    const buf = await data.toBuffer();
    if (buf.length > 1 * 1024 * 1024) {
      return reply.status(400).send({ error: 'File too large (max 1 MB)' });
    }

    const ext = data.mimetype.split('/').pop()?.replace('svg+xml', 'svg') ?? 'png';
    const fileName = `logo-sm-${randomUUID().slice(0, 8)}.${ext}`;
    const url = await uploadAsset(tenantId, fileName, buf, data.mimetype);

    const branding = await service.updateBranding(tenantId, { logoSmallUrl: url });
    return reply.send(branding);
  });

  // ────────── POST /admin/branding/favicon ──────────
  fastify.post('/favicon', async (request, reply) => {
    const tenantId = (request as any).tenantId as string | undefined;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing tenantId' });
    }

    if (!uploadAsset) {
      return reply.status(501).send({ error: 'Asset upload not configured' });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file provided' });
    }

    const allowedTypes = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Invalid file type. Allowed: ICO, PNG, SVG' });
    }

    const buf = await data.toBuffer();
    if (buf.length > 512 * 1024) {
      return reply.status(400).send({ error: 'File too large (max 512 KB)' });
    }

    const ext = data.mimetype.includes('icon') ? 'ico' : data.mimetype.split('/').pop()?.replace('svg+xml', 'svg') ?? 'ico';
    const fileName = `favicon-${randomUUID().slice(0, 8)}.${ext}`;
    const url = await uploadAsset(tenantId, fileName, buf, data.mimetype);

    const branding = await service.updateBranding(tenantId, { faviconUrl: url });
    return reply.send(branding);
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// Public Routes (no auth)
// ══════════════════════════════════════════════════════════════════════════════

export const brandingPublicRoutes: FastifyPluginAsync<{ service: BrandingService }> = async (
  fastify,
  opts,
) => {
  const { service } = opts;

  // ────────── GET /public/branding?domain= ──────────
  fastify.get('/', async (request, reply) => {
    const { domain } = request.query as { domain?: string };
    if (!domain) {
      return reply.status(400).send({ error: 'Missing domain query parameter' });
    }

    reply.header('Cache-Control', 'public, max-age=300, s-maxage=300');
    const branding = await service.getBrandingByDomain(domain);
    return reply.send(branding);
  });

  // ────────── GET /public/branding/:domain ──────────
  fastify.get<{ Params: { domain: string } }>('/:domain', async (request, reply) => {
    const { domain } = request.params;

    reply.header('Cache-Control', 'public, max-age=300, s-maxage=300');
    const branding = await service.getBrandingByDomain(domain);
    return reply.send(branding);
  });
};
