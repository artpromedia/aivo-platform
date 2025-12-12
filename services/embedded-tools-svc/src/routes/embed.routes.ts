/**
 * Embed Routes - Tool Launch and Embedding
 *
 * Endpoints for generating embed URLs and serving the embedding page.
 * Handles the handoff from Aivo to the embedded tool.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import {
  generateLaunchToken,
  generatePseudonymousLearnerId,
} from '../services/token.service.js';
import {
  ToolSessionStatus,
  ToolScope,
  type LaunchContext,
  type ToolLaunchConfig,
} from '../types/index.js';
import { config } from '../config.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schema Validation
// ══════════════════════════════════════════════════════════════════════════════

const LaunchToolSchema = z.object({
  toolId: z.string().max(100),
  installationId: z.string().uuid(),
  learnerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  activityId: z.string().max(255).optional(),
  assignmentId: z.string().uuid().optional(),
  customLaunchUrl: z.string().url().optional(),
  returnUrl: z.string().url().optional(),
  themeMode: z.enum(['light', 'dark']).default('light'),
  locale: z.string().max(10).default('en-US'),
});

const LaunchUrlQuerySchema = z.object({
  sessionId: z.string().uuid(),
});

const EmbedConfigSchema = z.object({
  toolId: z.string(),
  installationId: z.string().uuid(),
});

// ══════════════════════════════════════════════════════════════════════════════
// Route Handlers
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /embed/launch
 * Create a new tool session and generate a launch URL
 */
async function launchTool(
  request: FastifyRequest<{ Body: z.infer<typeof LaunchToolSchema> }>,
  reply: FastifyReply
) {
  const data = LaunchToolSchema.parse(request.body);

  // 1. Fetch tool installation and tenant policy
  const [installation, tenantPolicy] = await Promise.all([
    prisma.toolInstallation.findUnique({
      where: { id: data.installationId },
      include: { tool: true },
    }),
    prisma.tenantToolPolicy.findUnique({
      where: {
        tenantId_toolId: {
          tenantId: data.tenantId,
          toolId: data.toolId,
        },
      },
      include: {
        scopeGrants: true,
      },
    }),
  ]);

  if (!installation || installation.tenantId !== data.tenantId) {
    return reply.status(404).send({ error: 'Tool installation not found' });
  }

  if (!installation.isEnabled) {
    return reply.status(400).send({ error: 'Tool installation is disabled' });
  }

  if (!tenantPolicy || !tenantPolicy.isEnabled) {
    return reply.status(403).send({ error: 'Tenant has not enabled this tool' });
  }

  // 2. Compute granted scopes (intersection of tool required + tenant allowed)
  const toolRequiredScopes = (installation.tool.requiredScopes as ToolScope[]) || [];
  const tenantAllowedScopes = tenantPolicy.scopeGrants
    .filter((g) => g.isGranted)
    .map((g) => g.scope as ToolScope);

  const grantedScopes = toolRequiredScopes.filter((scope) =>
    tenantAllowedScopes.includes(scope)
  );

  // Check that all required scopes are granted
  const missingScopes = toolRequiredScopes.filter(
    (scope) => !tenantAllowedScopes.includes(scope)
  );
  if (missingScopes.length > 0) {
    return reply.status(403).send({
      error: 'Required scopes not granted by tenant',
      missingScopes,
    });
  }

  // 3. Generate pseudonymous learner ID
  const tenantSecret = await getTenantSecret(data.tenantId);
  const pseudonymousLearnerId = generatePseudonymousLearnerId(
    data.learnerId,
    tenantSecret
  );

  // 4. Determine launch URL
  const launchUrl =
    data.customLaunchUrl ||
    installation.launchUrl ||
    installation.tool.defaultLaunchUrl;

  if (!launchUrl) {
    return reply.status(400).send({ error: 'No launch URL configured' });
  }

  // 5. Create the tool session
  const session = await prisma.toolSession.create({
    data: {
      tenantId: data.tenantId,
      learnerId: data.learnerId,
      pseudonymousLearnerId,
      toolId: data.toolId,
      installationId: data.installationId,
      status: ToolSessionStatus.ACTIVE,
      grantedScopes,
      launchUrlSnapshot: launchUrl,
      activityId: data.activityId ?? null,
      assignmentId: data.assignmentId ?? null,
      metadata: {
        returnUrl: data.returnUrl,
        themeMode: data.themeMode,
        locale: data.locale,
        launchedAt: new Date().toISOString(),
      },
    },
  });

  // 6. Generate launch token
  const { token, expiresAt } = await generateLaunchToken({
    toolSessionId: session.id,
    tenantId: data.tenantId,
    toolId: data.toolId,
    pseudonymousLearnerId,
    scopes: grantedScopes,
  });

  // 7. Construct the embed URL
  const embedUrl = new URL(`${config.serviceUrl}/embed/frame`);
  embedUrl.searchParams.set('sessionId', session.id);
  embedUrl.searchParams.set('token', token);

  request.log.info(
    {
      sessionId: session.id,
      toolId: data.toolId,
      scopes: grantedScopes,
    },
    'Tool session launched'
  );

  return {
    sessionId: session.id,
    embedUrl: embedUrl.toString(),
    directLaunchUrl: launchUrl,
    token,
    expiresAt: expiresAt.toISOString(),
    grantedScopes,
  };
}

/**
 * GET /embed/frame
 * Serve the embedding frame that loads the tool
 */
async function embedFrame(
  request: FastifyRequest<{ Querystring: z.infer<typeof LaunchUrlQuerySchema> & { token: string } }>,
  reply: FastifyReply
) {
  const { sessionId, token } = request.query;

  // Fetch session
  const session = await prisma.toolSession.findUnique({
    where: { id: sessionId },
    include: {
      toolInstallation: {
        include: { tool: true },
      },
    },
  });

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  if (session.status === ToolSessionStatus.EXPIRED) {
    return reply.status(410).send({ error: 'Session has expired' });
  }

  if (session.status === ToolSessionStatus.TERMINATED) {
    return reply.status(410).send({ error: 'Session has been terminated' });
  }

  // Build the tool URL with token
  const toolUrl = new URL(session.launchUrlSnapshot);
  toolUrl.searchParams.set('aivo_token', token);
  toolUrl.searchParams.set('aivo_session', sessionId);

  // Return HTML page that embeds the tool
  const metadata = session.metadata as Record<string, unknown>;
  const themeMode = (metadata?.themeMode as string) || 'light';
  const locale = (metadata?.locale as string) || 'en-US';

  const html = generateEmbedHtml({
    toolUrl: toolUrl.toString(),
    sessionId,
    token,
    toolName: session.toolInstallation?.tool?.name || 'Tool',
    themeMode,
    locale,
    scopes: session.grantedScopes as ToolScope[],
    pseudonymousLearnerId: session.pseudonymousLearnerId,
  });

  return reply.type('text/html').send(html);
}

/**
 * GET /embed/config/:installationId
 * Get embedding configuration for a tool installation
 */
async function getEmbedConfig(
  request: FastifyRequest<{ Params: { installationId: string } }>,
  reply: FastifyReply
): Promise<ToolLaunchConfig> {
  const { installationId } = request.params;

  const installation = await prisma.toolInstallation.findUnique({
    where: { id: installationId },
    include: { tool: true },
  });

  if (!installation) {
    return reply.status(404).send({ error: 'Installation not found' });
  }

  return {
    toolId: installation.toolId,
    toolName: installation.tool.name,
    launchUrl: installation.launchUrl || installation.tool.defaultLaunchUrl,
    sandboxPermissions: installation.tool.sandboxPermissions as string[],
    requiredScopes: installation.tool.requiredScopes as ToolScope[],
    communicationMode: installation.tool.communicationMode || 'postMessage',
    features: {
      offlineSupport: installation.tool.supportsOffline || false,
      mobileOptimized: installation.tool.mobileOptimized || false,
      accessibilityCompliant: installation.tool.accessibilityCompliant || false,
    },
  };
}

/**
 * POST /embed/validate-origin
 * Validate if an origin is allowed to communicate with a tool session
 */
async function validateOrigin(
  request: FastifyRequest<{
    Body: { sessionId: string; origin: string };
  }>,
  reply: FastifyReply
) {
  const { sessionId, origin } = request.body;

  const session = await prisma.toolSession.findUnique({
    where: { id: sessionId },
    include: {
      toolInstallation: {
        include: { tool: true },
      },
    },
  });

  if (!session) {
    return { valid: false, error: 'Session not found' };
  }

  // Parse the launch URL to get expected origin
  const launchUrl = new URL(session.launchUrlSnapshot);
  const expectedOrigin = launchUrl.origin;

  // Check if origin matches
  if (origin !== expectedOrigin) {
    // Also check allowed origins from tool config
    const allowedOrigins = (session.toolInstallation?.tool?.allowedOrigins as string[]) || [];
    if (!allowedOrigins.includes(origin)) {
      return {
        valid: false,
        error: 'Origin not allowed',
        expectedOrigin,
      };
    }
  }

  return { valid: true };
}

// ══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get tenant secret for pseudonymous ID generation
 */
async function getTenantSecret(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { toolIntegrationSecret: true },
  });

  if (!tenant?.toolIntegrationSecret) {
    throw new Error('Tenant tool integration secret not configured');
  }

  return tenant.toolIntegrationSecret;
}

/**
 * Generate the embedding HTML page
 */
function generateEmbedHtml(params: {
  toolUrl: string;
  sessionId: string;
  token: string;
  toolName: string;
  themeMode: string;
  locale: string;
  scopes: ToolScope[];
  pseudonymousLearnerId: string;
}): string {
  const { toolUrl, sessionId, token, toolName, themeMode, locale, scopes, pseudonymousLearnerId } = params;

  // Build learner context for INIT message
  const learnerContext = {
    pseudonymousId: pseudonymousLearnerId,
    themeMode,
    locale,
  };

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${toolName} - Aivo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; width: 100%; overflow: hidden; }
    .embed-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .tool-frame {
      flex: 1;
      width: 100%;
      border: none;
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-family: system-ui, sans-serif;
      color: ${themeMode === 'dark' ? '#fff' : '#333'};
      background: ${themeMode === 'dark' ? '#1a1a1a' : '#f5f5f5'};
    }
    .error {
      color: #dc2626;
      padding: 20px;
      text-align: center;
    }
  </style>
</head>
<body data-theme="${themeMode}">
  <div class="embed-container">
    <div id="loading" class="loading">Loading ${toolName}...</div>
    <iframe
      id="tool-frame"
      class="tool-frame"
      src="${toolUrl}"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      allow="autoplay; microphone; camera"
      title="${toolName}"
      style="display: none;"
    ></iframe>
  </div>

  <script>
    (function() {
      const SESSION_ID = '${sessionId}';
      const TOKEN = '${token}';
      const TOOL_ORIGIN = new URL('${toolUrl}').origin;
      const SCOPES = ${JSON.stringify(scopes)};
      const LEARNER_CONTEXT = ${JSON.stringify(learnerContext)};

      const iframe = document.getElementById('tool-frame');
      const loading = document.getElementById('loading');
      let isInitialized = false;

      // Send INIT message when iframe loads
      iframe.addEventListener('load', function() {
        loading.style.display = 'none';
        iframe.style.display = 'block';

        // Send INIT message to tool
        iframe.contentWindow.postMessage({
          type: 'INIT',
          version: '1.0',
          payload: {
            sessionId: SESSION_ID,
            token: TOKEN,
            learnerContext: LEARNER_CONTEXT,
            scopes: SCOPES,
          }
        }, TOOL_ORIGIN);

        isInitialized = true;
      });

      // Handle messages from tool
      window.addEventListener('message', function(event) {
        // Validate origin
        if (event.origin !== TOOL_ORIGIN) {
          console.warn('Message from unexpected origin:', event.origin);
          return;
        }

        const message = event.data;
        if (!message || !message.type) return;

        switch (message.type) {
          case 'SESSION_EVENT':
            // Forward event to backend
            fetch('/api/events', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + TOKEN
              },
              body: JSON.stringify({
                sessionId: SESSION_ID,
                ...message.payload
              })
            }).catch(console.error);
            break;

          case 'UI_REQUEST':
            handleUIRequest(message.payload);
            break;

          case 'ERROR':
            console.error('Tool error:', message.payload);
            // Report error to parent window if embedded
            if (window.parent !== window) {
              window.parent.postMessage({
                type: 'AIVO_TOOL_ERROR',
                sessionId: SESSION_ID,
                error: message.payload
              }, '*');
            }
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      });

      function handleUIRequest(payload) {
        switch (payload.action) {
          case 'resize':
            // Notify parent about resize request
            if (window.parent !== window) {
              window.parent.postMessage({
                type: 'AIVO_RESIZE_REQUEST',
                sessionId: SESSION_ID,
                dimensions: payload.dimensions
              }, '*');
            }
            break;

          case 'fullscreen':
            if (document.fullscreenEnabled) {
              iframe.requestFullscreen();
            }
            break;

          case 'exit':
            // Notify parent about exit request
            if (window.parent !== window) {
              window.parent.postMessage({
                type: 'AIVO_EXIT_REQUEST',
                sessionId: SESSION_ID,
                data: payload.data
              }, '*');
            }
            break;
        }
      }

      // Listen for theme updates from parent
      window.addEventListener('message', function(event) {
        const message = event.data;
        if (message?.type === 'AIVO_THEME_UPDATE' && isInitialized) {
          iframe.contentWindow.postMessage({
            type: 'THEME_UPDATE',
            payload: message.theme
          }, TOOL_ORIGIN);
        }
      });

      // Handle errors
      iframe.addEventListener('error', function() {
        loading.innerHTML = '<div class="error">Failed to load tool</div>';
      });

      // Cleanup on unload
      window.addEventListener('beforeunload', function() {
        // Send END_SESSION to tool
        if (isInitialized) {
          iframe.contentWindow.postMessage({
            type: 'END_SESSION',
            payload: { reason: 'NAVIGATION' }
          }, TOOL_ORIGIN);
        }
      });
    })();
  </script>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// Plugin Registration
// ══════════════════════════════════════════════════════════════════════════════

export async function embedRoutes(fastify: FastifyInstance) {
  fastify.post('/launch', launchTool);
  fastify.get('/frame', embedFrame);
  fastify.get('/config/:installationId', getEmbedConfig);
  fastify.post('/validate-origin', validateOrigin);
}
