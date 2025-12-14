/**
 * OAuth Routes for SIS Providers
 * 
 * Handles OAuth 2.0 authorization flows for:
 * - Google Workspace for Education
 * - Microsoft Entra ID (Azure AD)
 * - Clever
 * - ClassLink
 * 
 * These routes initiate OAuth flows and handle callbacks to store
 * access/refresh tokens securely.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, SisProviderType, IntegrationStatus } from '@prisma/client';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';

import { GoogleOAuthHelpers, GOOGLE_ROSTERING_SCOPES, GOOGLE_SSO_SCOPES } from '../providers/google-workspace';
import { MicrosoftOAuthHelpers, MICROSOFT_ROSTERING_SCOPES, MICROSOFT_SSO_SCOPES } from '../providers/microsoft-entra';

// ============================================================================
// Configuration
// ============================================================================

interface OAuthConfig {
  baseUrl: string;
  google?: {
    clientId: string;
    clientSecret: string;
  };
  microsoft?: {
    clientId: string;
    clientSecret: string;
  };
  clever?: {
    clientId: string;
    clientSecret: string;
  };
  classlink?: {
    clientId: string;
    clientSecret: string;
  };
}

// OAuth state expiry (10 minutes)
const STATE_EXPIRY_MS = 10 * 60 * 1000;

// ============================================================================
// Request Schemas
// ============================================================================

const OAuthInitiateParams = z.object({
  providerId: z.string().min(1),
});

const OAuthInitiateQuery = z.object({
  redirect_uri: z.string().url().optional(),
  scopes: z.string().optional(), // Comma-separated additional scopes
});

const OAuthCallbackQuery = z.object({
  code: z.string().optional(),
  state: z.string(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

// ============================================================================
// Route Registration
// ============================================================================

export function registerOAuthRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  config: OAuthConfig
): void {
  // ==========================================================================
  // OAuth Initiation
  // ==========================================================================

  /**
   * Initiate OAuth flow for a provider
   * GET /api/v1/providers/:providerId/oauth/initiate
   */
  app.get('/api/v1/providers/:providerId/oauth/initiate', async (request, reply) => {
    const paramsResult = OAuthInitiateParams.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ error: 'Invalid provider ID' });
    }

    const queryResult = OAuthInitiateQuery.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({ error: 'Invalid query parameters' });
    }

    const { providerId } = paramsResult.data;
    const { redirect_uri, scopes: additionalScopes } = queryResult.data;

    // Fetch provider
    const provider = await prisma.sisProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    // Parse provider config
    const providerConfig = JSON.parse(provider.configJson || '{}');

    // Generate state token and PKCE verifier
    const stateToken = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(32).toString('base64url');
    const nonce = randomBytes(16).toString('base64url');

    // Calculate code challenge for PKCE
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Store state in database
    const expiresAt = new Date(Date.now() + STATE_EXPIRY_MS);
    await prisma.oAuthState.create({
      data: {
        stateToken,
        tenantId: provider.tenantId,
        providerId: provider.id,
        providerType: provider.providerType,
        codeVerifier,
        redirectUri: redirect_uri || `${config.baseUrl}/api/v1/oauth/callback`,
        nonce,
        expiresAt,
      },
    });

    // Update provider status
    await prisma.sisProvider.update({
      where: { id: providerId },
      data: { integrationStatus: IntegrationStatus.CONNECTING },
    });

    // Generate OAuth URL based on provider type
    let authUrl: string;

    switch (provider.providerType) {
      case 'GOOGLE_WORKSPACE': {
        if (!config.google) {
          return reply.status(500).send({ error: 'Google OAuth not configured' });
        }

        const scopes = [...GOOGLE_ROSTERING_SCOPES, ...GOOGLE_SSO_SCOPES];
        if (additionalScopes) {
          scopes.push(...additionalScopes.split(','));
        }

        authUrl = GoogleOAuthHelpers.getAuthorizationUrl({
          clientId: config.google.clientId,
          redirectUri: `${config.baseUrl}/api/v1/oauth/callback`,
          state: stateToken,
          nonce,
          scopes,
          hostedDomain: providerConfig.domain,
          accessType: 'offline',
          prompt: 'consent',
        });
        break;
      }

      case 'MICROSOFT_ENTRA': {
        if (!config.microsoft) {
          return reply.status(500).send({ error: 'Microsoft OAuth not configured' });
        }

        const msScopes = [...MICROSOFT_ROSTERING_SCOPES, ...MICROSOFT_SSO_SCOPES];
        if (additionalScopes) {
          msScopes.push(...additionalScopes.split(','));
        }

        authUrl = MicrosoftOAuthHelpers.getAuthorizationUrl({
          clientId: config.microsoft.clientId,
          tenantId: providerConfig.tenantId || 'common',
          redirectUri: `${config.baseUrl}/api/v1/oauth/callback`,
          state: stateToken,
          nonce,
          scopes: msScopes,
          domainHint: providerConfig.domain,
          prompt: 'consent',
        });
        break;
      }

      case 'CLEVER': {
        if (!config.clever) {
          return reply.status(500).send({ error: 'Clever OAuth not configured' });
        }

        const cleverUrl = new URL('https://clever.com/oauth/authorize');
        cleverUrl.searchParams.set('response_type', 'code');
        cleverUrl.searchParams.set('client_id', config.clever.clientId);
        cleverUrl.searchParams.set('redirect_uri', `${config.baseUrl}/api/v1/oauth/callback`);
        cleverUrl.searchParams.set('state', stateToken);
        cleverUrl.searchParams.set('district_id', providerConfig.districtId || '');
        authUrl = cleverUrl.toString();
        break;
      }

      case 'CLASSLINK': {
        if (!config.classlink) {
          return reply.status(500).send({ error: 'ClassLink OAuth not configured' });
        }

        const classlinkUrl = new URL('https://launchpad.classlink.com/oauth2/v2/auth');
        classlinkUrl.searchParams.set('response_type', 'code');
        classlinkUrl.searchParams.set('client_id', config.classlink.clientId);
        classlinkUrl.searchParams.set('redirect_uri', `${config.baseUrl}/api/v1/oauth/callback`);
        classlinkUrl.searchParams.set('state', stateToken);
        classlinkUrl.searchParams.set('scope', 'oneroster full');
        authUrl = classlinkUrl.toString();
        break;
      }

      default:
        return reply.status(400).send({ 
          error: `OAuth not supported for provider type: ${provider.providerType}` 
        });
    }

    // Redirect to OAuth provider
    return reply.redirect(302, authUrl);
  });

  // ==========================================================================
  // OAuth Callback
  // ==========================================================================

  /**
   * Handle OAuth callback from provider
   * GET /api/v1/oauth/callback
   */
  app.get('/api/v1/oauth/callback', async (request, reply) => {
    const queryResult = OAuthCallbackQuery.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({ error: 'Invalid callback parameters' });
    }

    const { code, state, error, error_description } = queryResult.data;

    // Handle OAuth error
    if (error) {
      app.log.warn({ error, error_description }, 'OAuth callback error');
      return reply.redirect(302, `/integrations/sis?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return reply.status(400).send({ error: 'Missing authorization code' });
    }

    // Lookup and validate state
    const oauthState = await prisma.oAuthState.findUnique({
      where: { stateToken: state },
    });

    if (!oauthState) {
      return reply.status(400).send({ error: 'Invalid or expired state token' });
    }

    if (oauthState.expiresAt < new Date()) {
      await prisma.oAuthState.delete({ where: { id: oauthState.id } });
      return reply.status(400).send({ error: 'State token expired' });
    }

    // Fetch the provider
    const provider = await prisma.sisProvider.findUnique({
      where: { id: oauthState.providerId! },
    });

    if (!provider) {
      await prisma.oAuthState.delete({ where: { id: oauthState.id } });
      return reply.status(404).send({ error: 'Provider not found' });
    }

    const providerConfig = JSON.parse(provider.configJson || '{}');
    const redirectUri = `${config.baseUrl}/api/v1/oauth/callback`;

    try {
      let tokens: {
        accessToken: string;
        refreshToken?: string;
        expiresIn: number;
        scope?: string;
      };

      // Exchange code for tokens based on provider type
      switch (provider.providerType) {
        case 'GOOGLE_WORKSPACE': {
          if (!config.google) {
            throw new Error('Google OAuth not configured');
          }

          tokens = await GoogleOAuthHelpers.exchangeCodeForTokens({
            code,
            clientId: config.google.clientId,
            clientSecret: config.google.clientSecret,
            redirectUri,
          });
          break;
        }

        case 'MICROSOFT_ENTRA': {
          if (!config.microsoft) {
            throw new Error('Microsoft OAuth not configured');
          }

          tokens = await MicrosoftOAuthHelpers.exchangeCodeForTokens({
            code,
            clientId: config.microsoft.clientId,
            clientSecret: config.microsoft.clientSecret,
            tenantId: providerConfig.tenantId || 'common',
            redirectUri,
          });
          break;
        }

        case 'CLEVER': {
          if (!config.clever) {
            throw new Error('Clever OAuth not configured');
          }

          const cleverResponse = await fetch('https://clever.com/oauth/tokens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${Buffer.from(
                `${config.clever.clientId}:${config.clever.clientSecret}`
              ).toString('base64')}`,
            },
            body: JSON.stringify({
              code,
              grant_type: 'authorization_code',
              redirect_uri: redirectUri,
            }),
          });

          if (!cleverResponse.ok) {
            const cleverError = await cleverResponse.json();
            throw new Error(`Clever token exchange failed: ${cleverError.error}`);
          }

          const cleverData = await cleverResponse.json();
          tokens = {
            accessToken: cleverData.access_token,
            expiresIn: 86400 * 365, // Clever tokens don't expire
          };
          break;
        }

        case 'CLASSLINK': {
          if (!config.classlink) {
            throw new Error('ClassLink OAuth not configured');
          }

          const classlinkResponse = await fetch(
            'https://launchpad.classlink.com/oauth2/v2/token',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                code,
                client_id: config.classlink.clientId,
                client_secret: config.classlink.clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
              }),
            }
          );

          if (!classlinkResponse.ok) {
            const classlinkError = await classlinkResponse.json();
            throw new Error(`ClassLink token exchange failed: ${classlinkError.error}`);
          }

          const classlinkData = await classlinkResponse.json();
          tokens = {
            accessToken: classlinkData.access_token,
            refreshToken: classlinkData.refresh_token,
            expiresIn: classlinkData.expires_in || 3600,
          };
          break;
        }

        default:
          throw new Error(`OAuth not supported for provider type: ${provider.providerType}`);
      }

      // Update provider with tokens and status
      // In production, tokens should be stored in Vault/KMS
      const updatedConfig = {
        ...providerConfig,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
      };

      await prisma.sisProvider.update({
        where: { id: provider.id },
        data: {
          configJson: JSON.stringify(updatedConfig),
          integrationStatus: IntegrationStatus.CONNECTED,
          lastConnectionCheck: new Date(),
          connectionError: null,
          oauthMetadata: {
            scopes: tokens.scope,
            connectedAt: new Date().toISOString(),
          },
        },
      });

      // Clean up state
      await prisma.oAuthState.delete({ where: { id: oauthState.id } });

      // Redirect to success page
      return reply.redirect(302, `/integrations/sis?provider=${provider.id}&connected=true`);
    } catch (err) {
      app.log.error(err, 'OAuth token exchange failed');

      // Update provider status to error
      await prisma.sisProvider.update({
        where: { id: provider.id },
        data: {
          integrationStatus: IntegrationStatus.ERROR,
          connectionError: err instanceof Error ? err.message : 'Unknown error',
          lastConnectionCheck: new Date(),
        },
      });

      // Clean up state
      await prisma.oAuthState.delete({ where: { id: oauthState.id } });

      return reply.redirect(
        302,
        `/integrations/sis?provider=${provider.id}&error=${encodeURIComponent(
          err instanceof Error ? err.message : 'OAuth failed'
        )}`
      );
    }
  });

  // ==========================================================================
  // Disconnect / Revoke
  // ==========================================================================

  /**
   * Disconnect OAuth and revoke tokens
   * POST /api/v1/providers/:providerId/oauth/disconnect
   */
  app.post('/api/v1/providers/:providerId/oauth/disconnect', async (request, reply) => {
    const paramsResult = OAuthInitiateParams.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ error: 'Invalid provider ID' });
    }

    const { providerId } = paramsResult.data;

    const provider = await prisma.sisProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    const providerConfig = JSON.parse(provider.configJson || '{}');

    try {
      // Revoke tokens if possible
      if (providerConfig.accessToken) {
        switch (provider.providerType) {
          case 'GOOGLE_WORKSPACE':
            try {
              await GoogleOAuthHelpers.revokeToken(providerConfig.accessToken);
            } catch (e) {
              app.log.warn(e, 'Failed to revoke Google token');
            }
            break;
          // Microsoft and others don't have easy token revocation
        }
      }

      // Clear tokens and update status
      const updatedConfig = {
        ...providerConfig,
        accessToken: undefined,
        refreshToken: undefined,
        tokenExpiry: undefined,
      };

      await prisma.sisProvider.update({
        where: { id: providerId },
        data: {
          configJson: JSON.stringify(updatedConfig),
          integrationStatus: IntegrationStatus.DISCONNECTED,
          lastConnectionCheck: new Date(),
          connectionError: null,
          oauthMetadata: null,
        },
      });

      return reply.send({ success: true, message: 'Provider disconnected' });
    } catch (err) {
      app.log.error(err, 'Failed to disconnect provider');
      return reply.status(500).send({
        error: 'Failed to disconnect',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // ==========================================================================
  // Connection Status Check
  // ==========================================================================

  /**
   * Check OAuth connection status and refresh if needed
   * POST /api/v1/providers/:providerId/oauth/check
   */
  app.post('/api/v1/providers/:providerId/oauth/check', async (request, reply) => {
    const paramsResult = OAuthInitiateParams.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ error: 'Invalid provider ID' });
    }

    const { providerId } = paramsResult.data;

    const provider = await prisma.sisProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    const providerConfig = JSON.parse(provider.configJson || '{}');

    // Check if we have tokens
    if (!providerConfig.accessToken) {
      await prisma.sisProvider.update({
        where: { id: providerId },
        data: {
          integrationStatus: IntegrationStatus.DISCONNECTED,
          lastConnectionCheck: new Date(),
        },
      });

      return reply.send({
        connected: false,
        status: 'DISCONNECTED',
        message: 'No access token configured',
      });
    }

    // Check if token is expired
    const tokenExpiry = providerConfig.tokenExpiry 
      ? new Date(providerConfig.tokenExpiry) 
      : null;
    const isExpired = tokenExpiry && tokenExpiry < new Date();

    if (isExpired && providerConfig.refreshToken) {
      // Try to refresh the token
      try {
        let newTokens: { accessToken: string; refreshToken?: string; expiresIn: number };

        switch (provider.providerType) {
          case 'GOOGLE_WORKSPACE': {
            if (!config.google) {
              throw new Error('Google OAuth not configured');
            }

            newTokens = await GoogleOAuthHelpers.refreshAccessToken({
              refreshToken: providerConfig.refreshToken,
              clientId: config.google.clientId,
              clientSecret: config.google.clientSecret,
            });
            break;
          }

          case 'MICROSOFT_ENTRA': {
            if (!config.microsoft) {
              throw new Error('Microsoft OAuth not configured');
            }

            newTokens = await MicrosoftOAuthHelpers.refreshAccessToken({
              refreshToken: providerConfig.refreshToken,
              clientId: config.microsoft.clientId,
              clientSecret: config.microsoft.clientSecret,
              tenantId: providerConfig.tenantId || 'common',
            });
            break;
          }

          default:
            throw new Error('Token refresh not supported for this provider');
        }

        // Update tokens
        const updatedConfig = {
          ...providerConfig,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken || providerConfig.refreshToken,
          tokenExpiry: new Date(Date.now() + newTokens.expiresIn * 1000),
        };

        await prisma.sisProvider.update({
          where: { id: providerId },
          data: {
            configJson: JSON.stringify(updatedConfig),
            integrationStatus: IntegrationStatus.CONNECTED,
            lastConnectionCheck: new Date(),
            connectionError: null,
          },
        });

        return reply.send({
          connected: true,
          status: 'CONNECTED',
          message: 'Token refreshed successfully',
          tokenRefreshed: true,
        });
      } catch (err) {
        await prisma.sisProvider.update({
          where: { id: providerId },
          data: {
            integrationStatus: IntegrationStatus.ERROR,
            lastConnectionCheck: new Date(),
            connectionError: err instanceof Error ? err.message : 'Token refresh failed',
          },
        });

        return reply.send({
          connected: false,
          status: 'ERROR',
          message: 'Token refresh failed - reauthorization required',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    if (isExpired) {
      await prisma.sisProvider.update({
        where: { id: providerId },
        data: {
          integrationStatus: IntegrationStatus.ERROR,
          lastConnectionCheck: new Date(),
          connectionError: 'Token expired and no refresh token available',
        },
      });

      return reply.send({
        connected: false,
        status: 'ERROR',
        message: 'Token expired - reauthorization required',
      });
    }

    // Token is valid, update status
    await prisma.sisProvider.update({
      where: { id: providerId },
      data: {
        integrationStatus: IntegrationStatus.CONNECTED,
        lastConnectionCheck: new Date(),
        connectionError: null,
      },
    });

    return reply.send({
      connected: true,
      status: 'CONNECTED',
      message: 'Connection is valid',
      expiresAt: tokenExpiry?.toISOString(),
    });
  });

  // ==========================================================================
  // SSO Configuration Export
  // ==========================================================================

  /**
   * Get SSO configuration details for a provider
   * This data can be used to configure an IdpConfig in auth-svc
   */
  app.get('/api/v1/providers/:providerId/sso-config', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };

    const provider = await prisma.sisProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    // Only Google Workspace and Microsoft Entra support SSO configuration
    if (provider.providerType !== 'GOOGLE_WORKSPACE' && provider.providerType !== 'MICROSOFT_ENTRA') {
      return reply.status(400).send({ 
        error: 'Provider does not support SSO configuration',
        message: 'Only Google Workspace and Microsoft Entra providers support SSO'
      });
    }

    const config = JSON.parse(provider.configJson || '{}');

    if (provider.providerType === 'GOOGLE_WORKSPACE') {
      return reply.send({
        providerType: 'GOOGLE_WORKSPACE',
        protocol: 'OIDC',
        ssoConfig: {
          name: `Google Workspace SSO - ${provider.name}`,
          issuer: 'https://accounts.google.com',
          authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenEndpoint: 'https://oauth2.googleapis.com/token',
          userinfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
          jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
          clientId: config.clientId || process.env.GOOGLE_OAUTH_CLIENT_ID,
          // Note: clientSecret should be stored in KMS/Vault, referenced here
          clientSecretRef: `sis-provider/${providerId}/google-client-secret`,
          scopes: ['openid', 'profile', 'email'],
          domain: config.domain,
          // Google-specific claims
          emailClaim: 'email',
          nameClaim: 'name',
          firstNameClaim: 'given_name',
          lastNameClaim: 'family_name',
          externalIdClaim: 'sub',
          // Hosted domain restriction (optional)
          hd: config.domain, // Google's "hosted domain" parameter
        },
        linkable: !!config.domain,
      });
    }

    if (provider.providerType === 'MICROSOFT_ENTRA') {
      const tenantId = config.azureTenantId || 'common';
      return reply.send({
        providerType: 'MICROSOFT_ENTRA',
        protocol: 'OIDC',
        ssoConfig: {
          name: `Microsoft Entra SSO - ${provider.name}`,
          issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
          authorizationEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
          tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
          userinfoEndpoint: 'https://graph.microsoft.com/oidc/userinfo',
          jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
          clientId: config.clientId || process.env.MICROSOFT_OAUTH_CLIENT_ID,
          clientSecretRef: `sis-provider/${providerId}/microsoft-client-secret`,
          scopes: ['openid', 'profile', 'email'],
          domain: config.domain,
          // Microsoft-specific claims
          emailClaim: 'email',
          nameClaim: 'name',
          firstNameClaim: 'given_name',
          lastNameClaim: 'family_name',
          externalIdClaim: 'oid', // Microsoft uses 'oid' for stable user ID
        },
        linkable: !!config.azureTenantId,
      });
    }
  });

  // ==========================================================================
  // State Cleanup (should run periodically)
  // ==========================================================================

  /**
   * Clean up expired OAuth state entries
   * Called internally or via cron job
   */
  async function cleanupExpiredStates(): Promise<number> {
    const result = await prisma.oAuthState.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }

  // Expose cleanup function for external use
  (app as FastifyInstance & { cleanupOAuthStates?: () => Promise<number> }).cleanupOAuthStates = 
    cleanupExpiredStates;
}
