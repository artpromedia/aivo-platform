/**
 * SSO Routes
 *
 * Handles SSO initiation and callback endpoints for both SAML and OIDC.
 *
 * Endpoints:
 * - GET  /auth/sso/:tenantSlug          - Initiate SSO
 * - POST /auth/saml/acs/:tenantSlug     - SAML ACS callback
 * - GET  /auth/oidc/callback/:tenantSlug - OIDC callback
 * - GET  /auth/sso/metadata/:tenantSlug  - SAML SP metadata
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { config } from '../config.js';
import { ssoRateLimiter } from '../lib/rate-limit.js';
import { SsoService, SsoError } from '../lib/sso/index.js';

// ============================================================================
// SCHEMAS
// ============================================================================

const tenantParams = z.object({
  tenantSlug: z.string().min(1),
});

const ssoInitQuery = z.object({
  protocol: z.enum(['SAML', 'OIDC']).optional(),
  login_hint: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  client_type: z.enum(['web', 'mobile']).optional(),
});

const samlCallbackBody = z.object({
  SAMLResponse: z.string(),
  RelayState: z.string().optional(),
});

const oidcCallbackQuery = z.object({
  code: z.string(),
  state: z.string(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

export async function registerSsoRoutes(fastify: FastifyInstance) {
  // Initialize SSO service
  const ssoService = new SsoService({
    baseUrl: config.baseUrl,
    spEntityId: config.samlSpEntityId,
    spPrivateKey: config.samlSpPrivateKey,
    spCertificate: config.samlSpCertificate,
  });

  // ==========================================================================
  // SSO INITIATION
  // ==========================================================================

  /**
   * Initiate SSO flow for a tenant.
   * Redirects to the configured IdP.
   */
  fastify.get<{
    Params: z.infer<typeof tenantParams>;
    Querystring: z.infer<typeof ssoInitQuery>;
  }>('/sso/:tenantSlug', { preHandler: ssoRateLimiter }, async (request, reply) => {
    const paramsResult = tenantParams.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ error: 'Invalid tenant slug' });
    }

    const queryResult = ssoInitQuery.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({ error: 'Invalid query parameters' });
    }

    const { tenantSlug } = paramsResult.data;
    const { protocol, login_hint, redirect_uri, client_type } = queryResult.data;

    try {
      const result = await ssoService.initiateSso({
        tenantSlug,
        protocol,
        loginHint: login_hint,
        redirectUri: redirect_uri ?? `${config.webAppUrl}/auth/callback`,
        clientType: client_type ?? 'web',
      });

      // Redirect to IdP
      return reply.redirect(302, result.redirectUrl);
    } catch (error) {
      if (error instanceof SsoError) {
        fastify.log.warn({ error: error.code, message: error.message }, 'SSO initiation failed');
        
        // Redirect to error page
        const errorUrl = new URL(`${config.webAppUrl}/auth/error`);
        errorUrl.searchParams.set('error', error.code);
        errorUrl.searchParams.set('message', error.message);
        return reply.redirect(302, errorUrl.toString());
      }

      fastify.log.error(error, 'SSO initiation error');
      return reply.status(500).send({ error: 'SSO initiation failed' });
    }
  });

  // ==========================================================================
  // SAML ACS CALLBACK
  // ==========================================================================

  /**
   * SAML Assertion Consumer Service endpoint.
   * Receives SAML Response via HTTP-POST binding.
   */
  fastify.post<{
    Params: z.infer<typeof tenantParams>;
    Body: z.infer<typeof samlCallbackBody>;
  }>('/saml/acs/:tenantSlug', { preHandler: ssoRateLimiter }, async (request, reply) => {
    const paramsResult = tenantParams.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ error: 'Invalid tenant slug' });
    }

    const bodyResult = samlCallbackBody.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({ error: 'Invalid SAML response' });
    }

    const { tenantSlug } = paramsResult.data;
    const { SAMLResponse, RelayState } = bodyResult.data;

    if (!RelayState) {
      return reply.status(400).send({ error: 'Missing RelayState' });
    }

    const ipAddress = getClientIp(request);
    const userAgent = request.headers['user-agent'];

    const result = await ssoService.handleSamlCallback({
      tenantSlug,
      samlResponse: SAMLResponse,
      relayState: RelayState,
      ipAddress,
      userAgent,
    });

    return handleSsoResult(result, reply, config.webAppUrl);
  });

  // ==========================================================================
  // OIDC CALLBACK
  // ==========================================================================

  /**
   * OIDC callback endpoint.
   * Receives authorization code via redirect.
   */
  fastify.get<{
    Params: z.infer<typeof tenantParams>;
    Querystring: z.infer<typeof oidcCallbackQuery>;
  }>('/oidc/callback/:tenantSlug', { preHandler: ssoRateLimiter }, async (request, reply) => {
    const paramsResult = tenantParams.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ error: 'Invalid tenant slug' });
    }

    const queryResult = oidcCallbackQuery.safeParse(request.query);
    if (!queryResult.success) {
      // Check for OIDC error response
      const error = (request.query as Record<string, string>).error;
      const errorDesc = (request.query as Record<string, string>).error_description;
      
      if (error) {
        fastify.log.warn({ error, errorDesc }, 'OIDC error response');
        const errorUrl = new URL(`${config.webAppUrl}/auth/error`);
        errorUrl.searchParams.set('error', error);
        if (errorDesc) {
          errorUrl.searchParams.set('message', errorDesc);
        }
        return reply.redirect(302, errorUrl.toString());
      }

      return reply.status(400).send({ error: 'Invalid callback parameters' });
    }

    const { tenantSlug } = paramsResult.data;
    const { code, state, error, error_description } = queryResult.data;

    // Handle OIDC error
    if (error) {
      fastify.log.warn({ error, error_description }, 'OIDC error response');
      const errorUrl = new URL(`${config.webAppUrl}/auth/error`);
      errorUrl.searchParams.set('error', error);
      if (error_description) {
        errorUrl.searchParams.set('message', error_description);
      }
      return reply.redirect(302, errorUrl.toString());
    }

    const ipAddress = getClientIp(request);
    const userAgent = request.headers['user-agent'];

    const result = await ssoService.handleOidcCallback({
      tenantSlug,
      code,
      state,
      ipAddress,
      userAgent,
    });

    return handleSsoResult(result, reply, config.webAppUrl);
  });

  // ==========================================================================
  // SP METADATA
  // ==========================================================================

  /**
   * Get SAML SP metadata for IdP configuration.
   */
  fastify.get<{
    Params: z.infer<typeof tenantParams>;
  }>('/sso/metadata/:tenantSlug', async (request, reply) => {
    const paramsResult = tenantParams.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ error: 'Invalid tenant slug' });
    }

    const { tenantSlug } = paramsResult.data;
    const metadata = ssoService.getSpMetadata(tenantSlug);

    return reply
      .header('Content-Type', 'application/xml')
      .send(metadata);
  });

  // ==========================================================================
  // MOBILE DEEP LINK CALLBACK
  // ==========================================================================

  /**
   * Mobile SSO callback that returns tokens for deep linking.
   * Used when client_type is 'mobile'.
   */
  fastify.get<{
    Params: z.infer<typeof tenantParams>;
    Querystring: { token?: string; error?: string };
  }>('/sso/mobile/:tenantSlug', async (request, reply) => {
    // This endpoint serves an HTML page that redirects via deep link
    const { token, error } = request.query;

    // SECURITY: Properly escape values to prevent XSS
    // Use JSON.stringify for safe JavaScript string embedding
    const safeError = error ? JSON.stringify(encodeURIComponent(error)) : null;
    const safeToken = token ? JSON.stringify(encodeURIComponent(token)) : '""';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aivo SSO</title>
  <style>
    body { font-family: system-ui; text-align: center; padding: 2rem; }
    .spinner { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="spinner">⏳</div>
  <p id="status">${error ? 'Authentication failed' : 'Redirecting to app...'}</p>
  <script>
    (function() {
      // Build deep link safely using properly escaped values
      var deepLink = ${safeError !== null
        ? `'aivo://auth/error?error=' + ${safeError}`
        : `'aivo://auth/callback?token=' + ${safeToken}`
      };

      window.location.href = deepLink;

      // Fallback: show manual link after 2 seconds using DOM API (not innerHTML)
      setTimeout(function() {
        var body = document.body;
        body.textContent = '';

        var p = document.createElement('p');
        p.textContent = 'If you are not redirected, ';

        var link = document.createElement('a');
        link.href = deepLink;
        link.textContent = 'tap here';

        p.appendChild(link);
        p.appendChild(document.createTextNode('.'));
        body.appendChild(p);
      }, 2000);
    })();
  </script>
</body>
</html>
    `.trim();

    return reply.header('Content-Type', 'text/html').send(html);
  });
}

// ============================================================================
// HELPERS
// ============================================================================

function getClientIp(request: FastifyRequest): string | undefined {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return request.ip;
}

interface SsoCallbackResult {
  success: boolean;
  error?: string;
  message?: string;
  user?: { id: string; email: string };
  accessToken?: string;
  refreshToken?: string;
  redirectUri?: string;
  clientType?: 'web' | 'mobile';
}

function handleSsoResult(
  result: SsoCallbackResult,
  reply: FastifyReply,
  webAppUrl: string
): FastifyReply {
  if (!result.success) {
    const errorUrl = new URL(`${webAppUrl}/auth/error`);
    errorUrl.searchParams.set('error', result.error ?? 'UNKNOWN_ERROR');
    if (result.message) {
      errorUrl.searchParams.set('message', result.message);
    }
    return reply.redirect(302, errorUrl.toString());
  }

  // For mobile clients, redirect to deep link handler
  if (result.clientType === 'mobile') {
    const mobileUrl = new URL(`${webAppUrl}/auth/sso/mobile/complete`);
    mobileUrl.searchParams.set('token', result.accessToken ?? '');
    return reply.redirect(302, mobileUrl.toString());
  }

  // For web clients, redirect with tokens
  const successUrl = new URL(result.redirectUri ?? `${webAppUrl}/auth/callback`);
  successUrl.searchParams.set('access_token', result.accessToken ?? '');
  successUrl.searchParams.set('refresh_token', result.refreshToken ?? '');
  
  return reply.redirect(302, successUrl.toString());
}
