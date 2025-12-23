/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * LTI 1.1 Routes
 *
 * Endpoints:
 * - POST /lti/1.1/launch         - Basic LTI 1.1 launch
 * - POST /lti/1.1/content-item   - Content-Item selection launch
 * - POST /lti/1.1/content-item/return - Return selected content to LMS
 * - POST /lti/1.1/outcomes/:userId/:resourceLinkId - Grade passback
 * - GET  /lti/1.1/config/:consumerId - LTI 1.1 configuration XML
 *
 * Admin endpoints:
 * - GET/POST/DELETE /lti/1.1/consumers - Manage LTI 1.1 consumers
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { PrismaClient } from '../../generated/prisma-client/index.js';
import { LtiUserService } from '../lti-user-service.js';

import { Lti11ContentItemService, generateAutoSubmitHtml } from './content-item-service.js';
import { Lti11LaunchHandler, Lti11Error } from './launch-handler.js';
import { Lti11OutcomesService, Lti11OutcomeError } from './outcomes-service.js';
import {
  Lti11ConsumerCreateSchema,
  Lti11GradeSubmitSchema,
  Lti11ContentItemReturnSchema,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE CONFIG
// ══════════════════════════════════════════════════════════════════════════════

export interface Lti11RoutesConfig {
  baseUrl: string;
  appUrl: string; // Frontend app URL for redirects
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export function registerLti11Routes(
  app: FastifyInstance,
  prisma: PrismaClient,
  config: Lti11RoutesConfig
) {
  const ltiUserService = new LtiUserService(prisma);
  const launchHandler = new Lti11LaunchHandler(prisma, ltiUserService, config);
  const outcomesService = new Lti11OutcomesService(prisma);
  const contentItemService = new Lti11ContentItemService(prisma, config);

  // ══════════════════════════════════════════════════════════════════════════
  // LTI 1.1 LAUNCH FLOW
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * LTI 1.1 Basic Launch endpoint
   * Receives OAuth 1.0a signed POST from LMS
   */
  app.post('/lti/1.1/launch', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await launchHandler.handleLaunch(request);

      // Determine redirect target based on custom params or defaults
      const targetUrl = determineTargetUrl(result, config.appUrl);

      // Redirect with session token
      const redirectUrl = new URL(targetUrl);
      redirectUrl.searchParams.set('token', result.session.accessToken);
      redirectUrl.searchParams.set('lti', '1.1');

      return reply.redirect(redirectUrl.toString(), 302);
    } catch (error) {
      if (error instanceof Lti11Error) {
        return reply.status(error.httpStatus).send({
          error: error.message,
          code: error.code,
        });
      }
      throw error;
    }
  });

  /**
   * Content-Item Selection Launch (Deep Linking for LTI 1.1)
   * LMS sends this when teacher wants to add AIVO content
   */
  app.post('/lti/1.1/content-item', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await launchHandler.handleLaunch(request);
      const body = request.body as Record<string, string>;

      // Extract content-item specific params
      const contentItemReturnUrl = body.content_item_return_url;
      const data = body.data;

      if (!contentItemReturnUrl) {
        return reply.status(400).send({
          error: 'Missing content_item_return_url',
          code: 'INVALID_CONTENT_ITEM_REQUEST',
        });
      }

      // Redirect to content picker with context
      const pickerUrl = new URL('/lti/content-picker', config.appUrl);
      pickerUrl.searchParams.set('consumerId', result.consumer.id);
      pickerUrl.searchParams.set('returnUrl', contentItemReturnUrl);
      pickerUrl.searchParams.set('token', result.session.accessToken);
      pickerUrl.searchParams.set('version', '1.1');
      if (data) {
        pickerUrl.searchParams.set('data', data);
      }

      return reply.redirect(pickerUrl.toString(), 302);
    } catch (error) {
      if (error instanceof Lti11Error) {
        return reply.status(error.httpStatus).send({
          error: error.message,
          code: error.code,
        });
      }
      throw error;
    }
  });

  /**
   * Content-Item Selection Return
   * Called after user selects content to embed in LMS
   */
  app.post(
    '/lti/1.1/content-item/return',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof Lti11ContentItemReturnSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const body = Lti11ContentItemReturnSchema.parse(request.body);

        // Build content items from selection
        const contentItems = contentItemService.buildContentItemsFromSelection(body.items);

        // Build signed response
        const response = await contentItemService.buildContentItemResponse(
          body.consumerId,
          body.returnUrl,
          contentItems,
          body.data
        );

        // Return auto-submitting form HTML
        reply.type('text/html');
        return reply.send(generateAutoSubmitHtml(response));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Invalid content item return request',
            details: error.errors,
          });
        }
        throw error;
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // OUTCOMES SERVICE (GRADE PASSBACK)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Submit grade to LMS
   * Called by AIVO when learner completes an activity
   */
  app.post(
    '/lti/1.1/outcomes/:userId/:resourceLinkId',
    async (
      request: FastifyRequest<{
        Params: { userId: string; resourceLinkId: string };
        Body: { score: number; comment?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { userId, resourceLinkId } = request.params;
        const { score, comment } = request.body;

        const result = await outcomesService.submitScore({
          userId,
          resourceLinkId,
          score,
          comment,
        });

        return reply.send({
          success: result.success,
          message: result.description,
        });
      } catch (error) {
        if (error instanceof Lti11OutcomeError) {
          return reply.status(error.httpStatus).send({
            error: error.message,
            code: error.code,
          });
        }
        throw error;
      }
    }
  );

  /**
   * Read current grade from LMS
   */
  app.get(
    '/lti/1.1/outcomes/:userId/:resourceLinkId',
    async (
      request: FastifyRequest<{
        Params: { userId: string; resourceLinkId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { userId, resourceLinkId } = request.params;
        const score = await outcomesService.readScore(userId, resourceLinkId);

        return reply.send({ score });
      } catch (error) {
        if (error instanceof Lti11OutcomeError) {
          return reply.status(error.httpStatus).send({
            error: error.message,
            code: error.code,
          });
        }
        throw error;
      }
    }
  );

  /**
   * Delete grade from LMS
   */
  app.delete(
    '/lti/1.1/outcomes/:userId/:resourceLinkId',
    async (
      request: FastifyRequest<{
        Params: { userId: string; resourceLinkId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { userId, resourceLinkId } = request.params;
        const result = await outcomesService.deleteScore(userId, resourceLinkId);

        return reply.send({
          success: result.success,
          message: result.description,
        });
      } catch (error) {
        if (error instanceof Lti11OutcomeError) {
          return reply.status(error.httpStatus).send({
            error: error.message,
            code: error.code,
          });
        }
        throw error;
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * LTI 1.1 Configuration XML
   * Returns cartridge XML for LMS administrators
   */
  app.get(
    '/lti/1.1/config/:consumerId',
    async (request: FastifyRequest<{ Params: { consumerId: string } }>, reply: FastifyReply) => {
      const { consumerId } = request.params;

      // Get consumer to verify it exists
      const consumer = await prisma.lti11Consumer.findUnique({
        where: { id: consumerId },
      });

      if (!consumer) {
        return reply.status(404).send({ error: 'Consumer not found' });
      }

      const configXml = generateConfigXml(config.baseUrl, config.appUrl);
      reply.type('application/xml');
      return reply.send(configXml);
    }
  );

  /**
   * Generic LTI 1.1 Configuration XML (without consumer ID)
   */
  app.get('/lti/1.1/config.xml', async (_request: FastifyRequest, reply: FastifyReply) => {
    const configXml = generateConfigXml(config.baseUrl, config.appUrl);
    reply.type('application/xml');
    return reply.send(configXml);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CONSUMER MANAGEMENT (ADMIN)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * List all LTI 1.1 consumers
   */
  app.get('/lti/1.1/consumers', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { tenantId?: string };

    const findOptions: Parameters<typeof prisma.lti11Consumer.findMany>[0] = {
      orderBy: { createdAt: 'desc' as const },
      select: {
        id: true,
        tenantId: true,
        name: true,
        consumerKey: true,
        isActive: true,
        instanceGuid: true,
        createdAt: true,
        updatedAt: true,
        // Exclude sharedSecret from listing
      },
    };

    if (query.tenantId) {
      findOptions.where = { tenantId: query.tenantId };
    }

    const consumers = await prisma.lti11Consumer.findMany(findOptions);

    return reply.send({ consumers });
  });

  /**
   * Create new LTI 1.1 consumer
   */
  app.post(
    '/lti/1.1/consumers',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof Lti11ConsumerCreateSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const body = Lti11ConsumerCreateSchema.parse(request.body);

        const consumer = await prisma.lti11Consumer.create({
          data: {
            tenantId: body.tenantId,
            name: body.name,
            consumerKey: body.consumerKey,
            sharedSecret: body.sharedSecret,
            instanceGuid: body.instanceGuid ?? null,
            settings: body.settings as object,
          },
        });

        return reply.status(201).send({
          id: consumer.id,
          tenantId: consumer.tenantId,
          name: consumer.name,
          consumerKey: consumer.consumerKey,
          isActive: consumer.isActive,
          createdAt: consumer.createdAt,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Invalid consumer data',
            details: error.errors,
          });
        }
        throw error;
      }
    }
  );

  /**
   * Get LTI 1.1 consumer details
   */
  app.get(
    '/lti/1.1/consumers/:consumerId',
    async (request: FastifyRequest<{ Params: { consumerId: string } }>, reply: FastifyReply) => {
      const { consumerId } = request.params;

      const consumer = await prisma.lti11Consumer.findUnique({
        where: { id: consumerId },
        include: {
          _count: {
            select: {
              outcomeBindings: true,
              launchLogs: true,
            },
          },
        },
      });

      if (!consumer) {
        return reply.status(404).send({ error: 'Consumer not found' });
      }

      return reply.send({
        id: consumer.id,
        tenantId: consumer.tenantId,
        name: consumer.name,
        consumerKey: consumer.consumerKey,
        isActive: consumer.isActive,
        instanceGuid: consumer.instanceGuid,
        settings: consumer.settings,
        createdAt: consumer.createdAt,
        updatedAt: consumer.updatedAt,
        stats: {
          outcomeBindings: consumer._count.outcomeBindings,
          launches: consumer._count.launchLogs,
        },
      });
    }
  );

  /**
   * Update LTI 1.1 consumer
   */
  app.patch(
    '/lti/1.1/consumers/:consumerId',
    async (
      request: FastifyRequest<{
        Params: { consumerId: string };
        Body: { name?: string; isActive?: boolean; settings?: Record<string, unknown> };
      }>,
      reply: FastifyReply
    ) => {
      const { consumerId } = request.params;
      const { name, isActive, settings } = request.body;

      const consumer = await prisma.lti11Consumer.update({
        where: { id: consumerId },
        data: {
          ...(name !== undefined && { name }),
          ...(isActive !== undefined && { isActive }),
          ...(settings !== undefined && { settings: settings as object }),
        },
      });

      return reply.send({
        id: consumer.id,
        name: consumer.name,
        isActive: consumer.isActive,
        updatedAt: consumer.updatedAt,
      });
    }
  );

  /**
   * Delete LTI 1.1 consumer
   */
  app.delete(
    '/lti/1.1/consumers/:consumerId',
    async (request: FastifyRequest<{ Params: { consumerId: string } }>, reply: FastifyReply) => {
      const { consumerId } = request.params;

      await prisma.lti11Consumer.delete({
        where: { id: consumerId },
      });

      return reply.status(204).send();
    }
  );

  /**
   * Rotate shared secret for consumer
   */
  app.post(
    '/lti/1.1/consumers/:consumerId/rotate-secret',
    async (
      request: FastifyRequest<{
        Params: { consumerId: string };
        Body: { newSecret: string };
      }>,
      reply: FastifyReply
    ) => {
      const { consumerId } = request.params;
      const { newSecret } = request.body;

      if (!newSecret || newSecret.length < 16) {
        return reply.status(400).send({
          error: 'New secret must be at least 16 characters',
        });
      }

      const consumer = await prisma.lti11Consumer.update({
        where: { id: consumerId },
        data: { sharedSecret: newSecret },
      });

      return reply.send({
        id: consumer.id,
        message: 'Shared secret rotated successfully',
        updatedAt: consumer.updatedAt,
      });
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function determineTargetUrl(
  result: { customParams: Record<string, string> },
  appUrl: string
): string {
  const customParams = result.customParams;

  // Check for specific content request
  if (customParams.content_type && customParams.content_id) {
    return `${appUrl}/learn/${customParams.content_type}/${customParams.content_id}`;
  }

  // Default to dashboard
  return `${appUrl}/dashboard`;
}

function generateConfigXml(baseUrl: string, appUrl: string): string {
  const hostname = new URL(baseUrl).hostname;

  return `<?xml version="1.0" encoding="UTF-8"?>
<cartridge_basiclti_link xmlns="http://www.imsglobal.org/xsd/imslticc_v1p0"
    xmlns:blti="http://www.imsglobal.org/xsd/imsbasiclti_v1p0"
    xmlns:lticm="http://www.imsglobal.org/xsd/imslticm_v1p0"
    xmlns:lticp="http://www.imsglobal.org/xsd/imslticp_v1p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imslticc_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticc_v1p0.xsd">
  <blti:title>AIVO Learning</blti:title>
  <blti:description>AI-powered personalized learning for K-12 students with exceptional neurodiverse support</blti:description>
  <blti:launch_url>${baseUrl}/lti/1.1/launch</blti:launch_url>
  <blti:secure_launch_url>${baseUrl}/lti/1.1/launch</blti:secure_launch_url>
  <blti:icon>${appUrl}/images/lti-icon.png</blti:icon>
  <blti:vendor>
    <lticp:code>aivo</lticp:code>
    <lticp:name>AIVO Learning Inc.</lticp:name>
    <lticp:description>AI-powered adaptive learning platform</lticp:description>
    <lticp:url>https://aivolearning.com</lticp:url>
    <lticp:contact>
      <lticp:email>support@aivolearning.com</lticp:email>
    </lticp:contact>
  </blti:vendor>
  <blti:extensions platform="canvas.instructure.com">
    <lticm:property name="privacy_level">public</lticm:property>
    <lticm:property name="domain">${hostname}</lticm:property>
    <lticm:options name="course_navigation">
      <lticm:property name="enabled">true</lticm:property>
      <lticm:property name="text">AIVO Learning</lticm:property>
      <lticm:property name="visibility">members</lticm:property>
      <lticm:property name="default">enabled</lticm:property>
    </lticm:options>
    <lticm:options name="assignment_selection">
      <lticm:property name="enabled">true</lticm:property>
      <lticm:property name="message_type">ContentItemSelectionRequest</lticm:property>
      <lticm:property name="url">${baseUrl}/lti/1.1/content-item</lticm:property>
    </lticm:options>
    <lticm:options name="link_selection">
      <lticm:property name="enabled">true</lticm:property>
      <lticm:property name="message_type">ContentItemSelectionRequest</lticm:property>
      <lticm:property name="url">${baseUrl}/lti/1.1/content-item</lticm:property>
    </lticm:options>
  </blti:extensions>
  <blti:extensions platform="moodle">
    <lticm:property name="icon_url">${appUrl}/images/lti-icon.png</lticm:property>
    <lticm:property name="secure_icon_url">${appUrl}/images/lti-icon.png</lticm:property>
  </blti:extensions>
  <blti:extensions platform="blackboard.com">
    <lticm:property name="domain">${hostname}</lticm:property>
  </blti:extensions>
</cartridge_basiclti_link>`;
}
