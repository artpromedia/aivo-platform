/**
 * LTI API Routes
 *
 * Endpoints:
 * - POST /lti/login       - OIDC login initiation
 * - POST /lti/launch      - LTI launch callback
 * - GET  /lti/session/:id - Session page redirect
 * - GET  /lti/jwks        - Tool public keys
 * - POST /lti/grade       - Grade passback (internal)
 *
 * Admin endpoints:
 * - GET/POST /lti/tools        - Manage tool registrations
 * - GET/POST /lti/links        - Manage LTI links
 * - GET      /lti/launches     - View launch history
 */

import type { PrismaClient } from '../generated/prisma-client/index.js';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { GradeService } from './grade-service.js';
import { LaunchService } from './launch-service.js';
import { generateToolJwks, LtiError } from './lti-auth.js';
import {
  PlatformRegistrationService,
  PlatformRegistrationSchema,
} from './platform-registration-service.js';
import { LtiToolConfigSchema, LtiLinkConfigSchema, LtiPlatformType } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const OidcLoginSchema = z.object({
  iss: z.string().min(1),
  login_hint: z.string().min(1),
  target_link_uri: z.string().url(),
  lti_message_hint: z.string().optional(),
  client_id: z.string().optional(),
  lti_deployment_id: z.string().optional(),
});

const LaunchSchema = z.object({
  id_token: z.string().min(1),
  state: z.string().optional(),
});

const GradeSubmitSchema = z.object({
  launchId: z.string().uuid(),
  score: z.number().min(0).max(100),
  completed: z.boolean(),
  comment: z.string().optional(),
});

const ToolQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
});

const LinkQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  toolId: z.string().uuid().optional(),
});

const LaunchQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  toolId: z.string().uuid().optional(),
  linkId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export interface LtiRoutesConfig {
  baseUrl: string;
  getPrivateKey: (keyRef: string) => Promise<string>;
}

export function registerLtiRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  config: LtiRoutesConfig
) {
  const launchService = new LaunchService(prisma, { baseUrl: config.baseUrl });
  const gradeService = new GradeService(prisma, config.getPrivateKey);
  const platformService = new PlatformRegistrationService(prisma, config.baseUrl, async () => ({
    privateKeyRef: `kms://lti-keys/${crypto.randomUUID()}`,
    publicKeyId: `kid-${Date.now()}`,
  }));

  // ══════════════════════════════════════════════════════════════════════════
  // LTI LAUNCH FLOW
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * OIDC Login Initiation
   * LMS calls this to start the launch flow
   */
  app.post('/lti/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Handle both form data and query params (platforms vary)
      const body = (request.body as Record<string, string>) || {};
      const query = (request.query as Record<string, string>) || {};
      const params = { ...query, ...body };

      const parsed = OidcLoginSchema.parse(params);
      const result = await launchService.handleOidcLogin(parsed);

      // Redirect to platform's auth endpoint
      return reply.redirect(result.redirectUrl, 302);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid login parameters', details: error.errors });
      }
      if (error instanceof LtiError) {
        return reply.status(error.httpStatus).send({ error: error.message, code: error.code });
      }
      throw error;
    }
  });

  /**
   * Also support GET for login (some platforms use GET)
   */
  app.get('/lti/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.query as Record<string, string>;
      const parsed = OidcLoginSchema.parse(params);
      const result = await launchService.handleOidcLogin(parsed);
      return reply.redirect(result.redirectUrl, 302);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid login parameters', details: error.errors });
      }
      if (error instanceof LtiError) {
        return reply.status(error.httpStatus).send({ error: error.message, code: error.code });
      }
      throw error;
    }
  });

  /**
   * LTI Launch Callback
   * Platform calls this with id_token after auth
   */
  app.post('/lti/launch', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as Record<string, string>;
      const parsed = LaunchSchema.parse(body);
      const result = await launchService.handleLaunch(parsed);

      // Redirect to Aivo session page
      return reply.redirect(result.redirectUrl, 302);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply
          .status(400)
          .send({ error: 'Invalid launch parameters', details: error.errors });
      }
      if (error instanceof LtiError) {
        return reply.status(error.httpStatus).send({ error: error.message, code: error.code });
      }
      throw error;
    }
  });

  /**
   * Session Page
   * Displays the activity for the launched user
   */
  app.get('/lti/session/:launchId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { launchId } = request.params as { launchId: string };
      const launch = await launchService.getLaunch(launchId);

      // Return launch info (frontend will render appropriate view)
      return reply.send({
        launchId: launch.id,
        status: launch.status,
        userRole: launch.userRole,
        lmsContextTitle: launch.lmsContextTitle,
        link: launch.link
          ? {
              id: launch.link.id,
              title: launch.link.title,
              loVersionId: launch.link.loVersionId,
              activityTemplateId: launch.link.activityTemplateId,
            }
          : null,
        expiresAt: launch.expiresAt,
      });
    } catch (error) {
      if (error instanceof LtiError) {
        return reply.status(error.httpStatus).send({ error: error.message, code: error.code });
      }
      throw error;
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TOOL JWKS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Tool's Public Keys (JWKS)
   * Platforms fetch this to verify tool-signed messages
   */
  app.get('/lti/jwks', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as { toolId?: string };

      if (!query.toolId) {
        return reply.status(400).send({ error: 'toolId required' });
      }

      const tool = await prisma.ltiTool.findUnique({
        where: { id: query.toolId },
      });

      if (!tool) {
        return reply.status(404).send({ error: 'Tool not found' });
      }

      const privateKey = await config.getPrivateKey(tool.toolPrivateKeyRef);
      const jwks = await generateToolJwks(privateKey, tool.toolPublicKeyId || 'key-1');

      return reply.send(jwks);
    } catch {
      return reply.status(500).send({ error: 'Failed to generate JWKS' });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GRADE PASSBACK
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Submit Grade (internal API)
   * Called by Aivo services when learner completes activity
   */
  app.post('/lti/grade', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const parsed = GradeSubmitSchema.parse(body);

      const result = await gradeService.sendLmsResult(
        parsed.launchId,
        parsed.score,
        parsed.completed,
        parsed.comment
      );

      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid parameters', details: error.errors });
      }
      throw error;
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN: TOOL MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * List tool registrations
   */
  app.get('/lti/tools', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = ToolQuerySchema.parse(request.query);

    const tools = await prisma.ltiTool.findMany({
      ...(query.tenantId ? { where: { tenantId: query.tenantId } } : {}),
      orderBy: { createdAt: 'desc' },
    });

    // Remove sensitive fields
    const sanitized = tools.map((tool) => ({
      ...tool,
      toolPrivateKeyRef: '[REDACTED]',
    }));

    return reply.send(sanitized);
  });

  /**
   * Get single tool
   */
  app.get('/lti/tools/:toolId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { toolId } = request.params as { toolId: string };

    const tool = await prisma.ltiTool.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      return reply.status(404).send({ error: 'Tool not found' });
    }

    return reply.send({
      ...tool,
      toolPrivateKeyRef: '[REDACTED]',
    });
  });

  /**
   * Create tool registration
   */
  app.post('/lti/tools', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const parsed = LtiToolConfigSchema.parse(body);

      const tool = await prisma.ltiTool.create({
        data: {
          ...parsed,
          toolPublicKeyId: parsed.toolPublicKeyId ?? null,
          lineItemsUrl: parsed.lineItemsUrl ?? null,
          membershipsUrl: parsed.membershipsUrl ?? null,
          deepLinkingUrl: parsed.deepLinkingUrl ?? null,
          configJson: parsed.configJson as object,
        },
      });

      return reply.status(201).send({
        ...tool,
        toolPrivateKeyRef: '[REDACTED]',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid tool config', details: error.errors });
      }
      throw error;
    }
  });

  /**
   * Update tool registration
   */
  app.patch('/lti/tools/:toolId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { toolId } = request.params as { toolId: string };
    const body = request.body as Record<string, unknown>;

    const tool = await prisma.ltiTool.update({
      where: { id: toolId },
      data: body,
    });

    return reply.send({
      ...tool,
      toolPrivateKeyRef: '[REDACTED]',
    });
  });

  /**
   * Delete tool registration
   */
  app.delete('/lti/tools/:toolId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { toolId } = request.params as { toolId: string };

    await prisma.ltiTool.delete({
      where: { id: toolId },
    });

    return reply.status(204).send();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN: LINK MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * List LTI links
   */
  app.get('/lti/links', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = LinkQuerySchema.parse(request.query);

    const where: Record<string, unknown> = {};
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.toolId) where.ltiToolId = query.toolId;

    const links = await prisma.ltiLink.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        tool: {
          select: { platformName: true, platformType: true },
        },
      },
    });

    return reply.send(links);
  });

  /**
   * Get single link
   */
  app.get('/lti/links/:linkId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { linkId } = request.params as { linkId: string };

    const link = await prisma.ltiLink.findUnique({
      where: { id: linkId },
      include: {
        tool: {
          select: { platformName: true, platformType: true },
        },
      },
    });

    if (!link) {
      return reply.status(404).send({ error: 'Link not found' });
    }

    return reply.send(link);
  });

  /**
   * Create LTI link
   */
  app.post('/lti/links', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const parsed = LtiLinkConfigSchema.parse(body);

      const link = await prisma.ltiLink.create({
        data: {
          ...parsed,
          lmsContextId: parsed.lmsContextId ?? null,
          lmsResourceLinkId: parsed.lmsResourceLinkId ?? null,
          classroomId: parsed.classroomId ?? null,
          loVersionId: parsed.loVersionId ?? null,
          activityTemplateId: parsed.activityTemplateId ?? null,
          subject: parsed.subject ?? null,
          gradeBand: parsed.gradeBand ?? null,
          description: parsed.description ?? null,
          maxPoints: parsed.maxPoints ?? null,
          lineItemId: parsed.lineItemId ?? null,
          configJson: parsed.configJson as object,
        },
      });

      return reply.status(201).send(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid link config', details: error.errors });
      }
      throw error;
    }
  });

  /**
   * Update LTI link
   */
  app.patch('/lti/links/:linkId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { linkId } = request.params as { linkId: string };
    const body = request.body as Record<string, unknown>;

    const link = await prisma.ltiLink.update({
      where: { id: linkId },
      data: body,
    });

    return reply.send(link);
  });

  /**
   * Delete LTI link
   */
  app.delete('/lti/links/:linkId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { linkId } = request.params as { linkId: string };

    await prisma.ltiLink.delete({
      where: { id: linkId },
    });

    return reply.status(204).send();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN: LAUNCH HISTORY
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * List launches
   */
  app.get('/lti/launches', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = LaunchQuerySchema.parse(request.query);

    const where: Record<string, unknown> = {};
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.toolId) where.ltiToolId = query.toolId;
    if (query.linkId) where.ltiLinkId = query.linkId;

    const [launches, total] = await Promise.all([
      prisma.ltiLaunch.findMany({
        where,
        orderBy: { launchedAt: 'desc' },
        skip: query.offset,
        take: query.limit,
        select: {
          id: true,
          tenantId: true,
          lmsUserId: true,
          lmsUserEmail: true,
          lmsUserName: true,
          userRole: true,
          lmsContextTitle: true,
          status: true,
          gradeStatus: true,
          scoreGiven: true,
          scoreMaximum: true,
          launchedAt: true,
          completedAt: true,
          tool: {
            select: { platformName: true },
          },
          link: {
            select: { title: true },
          },
        },
      }),
      prisma.ltiLaunch.count({ where }),
    ]);

    return reply.send({
      launches,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    });
  });

  /**
   * Get single launch details
   */
  app.get('/lti/launches/:launchId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { launchId } = request.params as { launchId: string };

    const launch = await prisma.ltiLaunch.findUnique({
      where: { id: launchId },
      include: {
        tool: {
          select: { platformName: true, platformType: true },
        },
        link: true,
      },
    });

    if (!launch) {
      return reply.status(404).send({ error: 'Launch not found' });
    }

    return reply.send(launch);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PLATFORM REGISTRATION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get platform presets (configuration templates)
   */
  app.get('/lti/platforms/presets', async (_request: FastifyRequest, reply: FastifyReply) => {
    const presets = Object.values(LtiPlatformType).map((type) => ({
      platformType: type,
      preset: platformService.getPlatformPreset(type),
    }));
    return reply.send(presets);
  });

  /**
   * Get tool configuration JSON for LMS setup
   */
  app.get('/lti/platforms/config', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { tenantId?: string; format?: string };

    if (query.format === 'canvas') {
      return reply.send(platformService.getCanvasDevKeyJson());
    }

    return reply.send(platformService.getToolConfiguration(query.tenantId || 'default'));
  });

  /**
   * Register a new platform
   */
  app.post('/lti/platforms', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const parsed = PlatformRegistrationSchema.parse(body);
      const result = await platformService.registerPlatform(parsed);

      return reply.status(201).send({
        tool: {
          ...result.tool,
          toolPrivateKeyRef: '[REDACTED]',
        },
        configuration: {
          jwksUrl: result.jwksUrl,
          loginUrl: result.loginUrl,
          launchUrl: result.launchUrl,
          deepLinkingUrl: result.deepLinkingUrl,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid registration', details: error.errors });
      }
      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message });
      }
      throw error;
    }
  });

  /**
   * Build platform URLs from preset
   */
  app.post('/lti/platforms/build-urls', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      platformType: LtiPlatformType;
      domain: string;
      clientId?: string;
    };

    if (!body.platformType || !body.domain) {
      return reply.status(400).send({ error: 'platformType and domain required' });
    }

    const urls = platformService.buildPlatformUrls(body.platformType, body.domain, body.clientId);
    return reply.send(urls);
  });

  /**
   * Get platforms for a tenant
   */
  app.get('/lti/platforms', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { tenantId?: string };

    if (!query.tenantId) {
      return reply.status(400).send({ error: 'tenantId required' });
    }

    const platforms = await platformService.getPlatforms(query.tenantId);
    const sanitized = platforms.map((p) => ({
      ...p,
      toolPrivateKeyRef: '[REDACTED]',
    }));

    return reply.send(sanitized);
  });

  /**
   * Update platform registration
   */
  app.patch('/lti/platforms/:platformId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { platformId } = request.params as { platformId: string };
    const body = request.body as Record<string, unknown>;

    try {
      const platform = await platformService.updatePlatform(
        platformId,
        body as Partial<typeof PlatformRegistrationSchema._type>
      );
      return reply.send({
        ...platform,
        toolPrivateKeyRef: '[REDACTED]',
      });
    } catch {
      return reply.status(404).send({ error: 'Platform not found' });
    }
  });

  /**
   * Enable/disable platform
   */
  app.post(
    '/lti/platforms/:platformId/toggle',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { platformId } = request.params as { platformId: string };
      const body = request.body as { enabled: boolean };

      try {
        const platform = await platformService.setPlatformEnabled(platformId, body.enabled);
        return reply.send({
          ...platform,
          toolPrivateKeyRef: '[REDACTED]',
        });
      } catch {
        return reply.status(404).send({ error: 'Platform not found' });
      }
    }
  );

  /**
   * Delete platform registration
   */
  app.delete('/lti/platforms/:platformId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { platformId } = request.params as { platformId: string };

    try {
      await platformService.deletePlatform(platformId);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Platform not found' });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ══════════════════════════════════════════════════════════════════════════

  app.get('/lti/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ status: 'ok', service: 'lti-svc' });
  });
}
