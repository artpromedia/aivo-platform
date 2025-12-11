/**
 * SSO Service
 *
 * Orchestrates SSO flows for both SAML and OIDC protocols.
 * Handles user lookup, auto-provisioning, and JWT issuance.
 */

import type { Role } from '@aivo/ts-rbac';

import type { IdpConfig as PrismaIdpConfig, Tenant, User, UserRoleEnum } from '../../generated/prisma-client/index.js';
import { signAccessToken, signRefreshToken } from '../jwt.js';
import { prisma } from '../../prisma.js';

import { OidcService } from './oidc.js';
import { SamlService, type SamlServiceConfig } from './saml.js';
import { generateSsoState, validateSsoState, SsoStateError } from './state.js';
import type {
  IdpConfig,
  OidcIdpConfig,
  SamlIdpConfig,
  SsoResult,
  SsoErrorCode,
  SsoAttemptLog,
  MappedSsoUser,
} from './types.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface SsoServiceConfig {
  /** Base URL for SSO callbacks */
  baseUrl: string;
  /** SAML SP Entity ID */
  spEntityId: string;
  /** SAML SP private key (optional, for signing) */
  spPrivateKey?: string;
  /** SAML SP certificate */
  spCertificate?: string;
}

// ============================================================================
// SSO SERVICE
// ============================================================================

export class SsoService {
  private samlService: SamlService;
  private oidcService: OidcService;
  private config: SsoServiceConfig;

  constructor(config: SsoServiceConfig) {
    this.config = config;
    this.samlService = new SamlService({
      spEntityId: config.spEntityId,
      baseUrl: config.baseUrl,
      spPrivateKey: config.spPrivateKey,
      spCertificate: config.spCertificate,
    });
    this.oidcService = new OidcService();
  }

  // ==========================================================================
  // SSO INITIATION
  // ==========================================================================

  /**
   * Initiate SSO flow for a tenant.
   * Returns the redirect URL to the IdP.
   */
  async initiateSso(options: {
    tenantSlug: string;
    protocol?: 'SAML' | 'OIDC';
    loginHint?: string;
    redirectUri: string;
    clientType: 'web' | 'mobile';
  }): Promise<{ redirectUrl: string; state: string }> {
    // Get tenant
    const tenant = await this.getTenantBySlug(options.tenantSlug);
    if (!tenant) {
      throw new SsoError('IDP_NOT_FOUND', `Tenant not found: ${options.tenantSlug}`);
    }

    if (!tenant.ssoEnabled) {
      throw new SsoError('IDP_DISABLED', 'SSO is not enabled for this tenant');
    }

    // Get IdP config
    const idpConfig = await this.getIdpConfig(tenant.id, options.protocol);
    if (!idpConfig) {
      throw new SsoError(
        'IDP_NOT_FOUND',
        `No ${options.protocol ?? 'SSO'} configuration found for tenant`
      );
    }

    if (!idpConfig.enabled) {
      throw new SsoError('IDP_DISABLED', 'IdP configuration is disabled');
    }

    // Generate state
    const state = generateSsoState({
      tenantId: tenant.id,
      idpConfigId: idpConfig.id,
      protocol: idpConfig.protocol,
      redirectUri: options.redirectUri,
      clientType: options.clientType,
      loginHint: options.loginHint,
    });

    // Generate redirect URL based on protocol
    if (idpConfig.protocol === 'SAML') {
      const samlConfig = this.toSamlConfig(idpConfig);
      const acsUrl = `${this.config.baseUrl}/auth/saml/acs/${options.tenantSlug}`;
      
      const { url } = await this.samlService.generateAuthnRequest(samlConfig, {
        acsUrl,
        relayState: state,
        loginHint: options.loginHint,
      });

      return { redirectUrl: url, state };
    } else {
      const oidcConfig = this.toOidcConfig(idpConfig);
      const callbackUrl = `${this.config.baseUrl}/auth/oidc/callback/${options.tenantSlug}`;
      
      // Get nonce from state
      const ssoState = validateSsoState(state);
      const newState = generateSsoState({
        tenantId: tenant.id,
        idpConfigId: idpConfig.id,
        protocol: idpConfig.protocol,
        redirectUri: options.redirectUri,
        clientType: options.clientType,
        loginHint: options.loginHint,
      });

      const url = this.oidcService.generateAuthorizationUrl(oidcConfig, {
        redirectUri: callbackUrl,
        state: newState,
        nonce: ssoState.nonce,
        loginHint: options.loginHint,
      });

      return { redirectUrl: url, state: newState };
    }
  }

  // ==========================================================================
  // SAML CALLBACK
  // ==========================================================================

  /**
   * Handle SAML ACS callback.
   */
  async handleSamlCallback(options: {
    tenantSlug: string;
    samlResponse: string;
    relayState: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<SsoCallbackResult> {
    let ssoState;
    let idpConfig: PrismaIdpConfig | null = null;
    let tenant: Tenant | null = null;

    try {
      // Validate state
      ssoState = validateSsoState(options.relayState);

      // Get tenant and IdP config
      tenant = await this.getTenantBySlug(options.tenantSlug);
      if (!tenant || tenant.id !== ssoState.tenantId) {
        throw new SsoError('INVALID_STATE', 'Tenant mismatch');
      }

      idpConfig = await prisma.idpConfig.findUnique({
        where: { id: ssoState.idpConfigId },
      });

      if (!idpConfig || idpConfig.protocol !== 'SAML') {
        throw new SsoError('IDP_NOT_FOUND', 'SAML configuration not found');
      }

      // Validate SAML response
      const samlConfig = this.toSamlConfig(idpConfig);
      const result = await this.samlService.validateResponse(options.samlResponse, samlConfig);

      if (!result.success) {
        await this.logSsoAttempt({
          idpConfigId: idpConfig.id,
          tenantId: tenant.id,
          userIdentifier: null,
          ipAddress: options.ipAddress ?? null,
          userAgent: options.userAgent ?? null,
          success: false,
          userId: null,
          errorCode: result.error,
          errorMessage: result.message,
          completedAt: new Date(),
        });

        return {
          success: false,
          error: result.error,
          message: result.message,
        };
      }

      // Find or create user
      const userResult = await this.findOrCreateUser(tenant.id, result.user, idpConfig);
      
      if (!userResult.success) {
        await this.logSsoAttempt({
          idpConfigId: idpConfig.id,
          tenantId: tenant.id,
          userIdentifier: result.user.email,
          ipAddress: options.ipAddress ?? null,
          userAgent: options.userAgent ?? null,
          success: false,
          userId: null,
          errorCode: userResult.error,
          errorMessage: userResult.message,
          completedAt: new Date(),
        });

        return userResult;
      }

      // Issue tokens
      const tokens = await this.issueTokens(userResult.user);

      // Log success
      await this.logSsoAttempt({
        idpConfigId: idpConfig.id,
        tenantId: tenant.id,
        userIdentifier: result.user.email,
        ipAddress: options.ipAddress ?? null,
        userAgent: options.userAgent ?? null,
        success: true,
        userId: userResult.user.id,
        errorCode: null,
        errorMessage: null,
        completedAt: new Date(),
      });

      return {
        success: true,
        user: userResult.user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        redirectUri: ssoState.redirectUri,
        clientType: ssoState.clientType,
      };
    } catch (error) {
      const errorCode: SsoErrorCode = error instanceof SsoStateError
        ? (error.code === 'STATE_EXPIRED' ? 'STATE_EXPIRED' : 'INVALID_STATE')
        : error instanceof SsoError
        ? error.code
        : 'UNKNOWN_ERROR';

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (idpConfig && tenant) {
        await this.logSsoAttempt({
          idpConfigId: idpConfig.id,
          tenantId: tenant.id,
          userIdentifier: null,
          ipAddress: options.ipAddress ?? null,
          userAgent: options.userAgent ?? null,
          success: false,
          userId: null,
          errorCode,
          errorMessage,
          completedAt: new Date(),
        });
      }

      return {
        success: false,
        error: errorCode,
        message: errorMessage,
      };
    }
  }

  // ==========================================================================
  // OIDC CALLBACK
  // ==========================================================================

  /**
   * Handle OIDC callback.
   */
  async handleOidcCallback(options: {
    tenantSlug: string;
    code: string;
    state: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<SsoCallbackResult> {
    let ssoState;
    let idpConfig: PrismaIdpConfig | null = null;
    let tenant: Tenant | null = null;

    try {
      // Validate state
      ssoState = validateSsoState(options.state);

      // Get tenant and IdP config
      tenant = await this.getTenantBySlug(options.tenantSlug);
      if (!tenant || tenant.id !== ssoState.tenantId) {
        throw new SsoError('INVALID_STATE', 'Tenant mismatch');
      }

      idpConfig = await prisma.idpConfig.findUnique({
        where: { id: ssoState.idpConfigId },
      });

      if (!idpConfig || idpConfig.protocol !== 'OIDC') {
        throw new SsoError('IDP_NOT_FOUND', 'OIDC configuration not found');
      }

      const oidcConfig = this.toOidcConfig(idpConfig);
      const callbackUrl = `${this.config.baseUrl}/auth/oidc/callback/${options.tenantSlug}`;

      // Exchange code for tokens
      const tokens = await this.oidcService.exchangeCode(oidcConfig, {
        code: options.code,
        redirectUri: callbackUrl,
      });

      // Validate ID token
      const result = await this.oidcService.validateIdToken(
        tokens.id_token!,
        oidcConfig,
        { nonce: ssoState.nonce }
      );

      if (!result.success) {
        await this.logSsoAttempt({
          idpConfigId: idpConfig.id,
          tenantId: tenant.id,
          userIdentifier: null,
          ipAddress: options.ipAddress ?? null,
          userAgent: options.userAgent ?? null,
          success: false,
          userId: null,
          errorCode: result.error,
          errorMessage: result.message,
          completedAt: new Date(),
        });

        return {
          success: false,
          error: result.error,
          message: result.message,
        };
      }

      // Find or create user
      const userResult = await this.findOrCreateUser(tenant.id, result.user, idpConfig);
      
      if (!userResult.success) {
        await this.logSsoAttempt({
          idpConfigId: idpConfig.id,
          tenantId: tenant.id,
          userIdentifier: result.user.email,
          ipAddress: options.ipAddress ?? null,
          userAgent: options.userAgent ?? null,
          success: false,
          userId: null,
          errorCode: userResult.error,
          errorMessage: userResult.message,
          completedAt: new Date(),
        });

        return userResult;
      }

      // Issue Aivo tokens
      const aivoTokens = await this.issueTokens(userResult.user);

      // Log success
      await this.logSsoAttempt({
        idpConfigId: idpConfig.id,
        tenantId: tenant.id,
        userIdentifier: result.user.email,
        ipAddress: options.ipAddress ?? null,
        userAgent: options.userAgent ?? null,
        success: true,
        userId: userResult.user.id,
        errorCode: null,
        errorMessage: null,
        completedAt: new Date(),
      });

      return {
        success: true,
        user: userResult.user,
        accessToken: aivoTokens.accessToken,
        refreshToken: aivoTokens.refreshToken,
        redirectUri: ssoState.redirectUri,
        clientType: ssoState.clientType,
      };
    } catch (error) {
      const errorCode: SsoErrorCode = error instanceof SsoStateError
        ? (error.code === 'STATE_EXPIRED' ? 'STATE_EXPIRED' : 'INVALID_STATE')
        : error instanceof SsoError
        ? error.code
        : 'UNKNOWN_ERROR';

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (idpConfig && tenant) {
        await this.logSsoAttempt({
          idpConfigId: idpConfig.id,
          tenantId: tenant.id,
          userIdentifier: null,
          ipAddress: options.ipAddress ?? null,
          userAgent: options.userAgent ?? null,
          success: false,
          userId: null,
          errorCode,
          errorMessage,
          completedAt: new Date(),
        });
      }

      return {
        success: false,
        error: errorCode,
        message: errorMessage,
      };
    }
  }

  // ==========================================================================
  // USER MANAGEMENT
  // ==========================================================================

  /**
   * Find existing user or create if auto-provisioning is enabled.
   */
  private async findOrCreateUser(
    tenantId: string,
    ssoUser: MappedSsoUser,
    idpConfig: PrismaIdpConfig
  ): Promise<FindOrCreateUserResult> {
    // Try to find by external ID first
    let user = await prisma.user.findFirst({
      where: {
        tenantId,
        externalId: ssoUser.externalId,
      },
      include: { roles: true },
    });

    // Try by email if not found
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          tenantId,
          email: ssoUser.email,
        },
        include: { roles: true },
      });

      // Update external ID if found by email
      if (user && !user.externalId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { externalId: ssoUser.externalId },
          include: { roles: true },
        });
      }
    }

    // Check if user type is allowed
    if (user) {
      const userRoles = user.roles.map((r) => r.role);
      const allowedTypes = idpConfig.allowedUserTypes as UserRoleEnum[];
      
      if (!userRoles.some((role) => allowedTypes.includes(role))) {
        return {
          success: false,
          error: 'USER_NOT_ALLOWED',
          message: 'User role not allowed for this SSO configuration',
        };
      }
    }

    if (user) {
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          tenantId: user.tenantId,
          roles: user.roles.map((r) => r.role as Role),
        },
      };
    }

    // Auto-provision if enabled
    if (!idpConfig.autoProvisionUsers) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found and auto-provisioning is disabled',
      };
    }

    try {
      const rolesToCreate = ssoUser.roles.length > 0
        ? ssoUser.roles
        : [idpConfig.defaultRole];

      const newUser = await prisma.user.create({
        data: {
          tenantId,
          email: ssoUser.email,
          externalId: ssoUser.externalId,
          passwordHash: '', // No password for SSO users
          status: 'ACTIVE',
          roles: {
            create: rolesToCreate.map((role) => ({
              role: role as UserRoleEnum,
            })),
          },
        },
        include: { roles: true },
      });

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          tenantId: newUser.tenantId,
          roles: newUser.roles.map((r) => r.role as Role),
        },
        provisioned: true,
      };
    } catch (error) {
      return {
        success: false,
        error: 'PROVISION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to provision user',
      };
    }
  }

  /**
   * Issue Aivo JWT tokens for authenticated user.
   */
  private async issueTokens(user: { id: string; tenantId: string; roles: Role[] }): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await signAccessToken({
      sub: user.id,
      tenant_id: user.tenantId,
      roles: user.roles,
    });

    const refreshToken = await signRefreshToken({
      sub: user.id,
      tenant_id: user.tenantId,
      roles: user.roles,
    });

    return { accessToken, refreshToken };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private async getTenantBySlug(slug: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({ where: { slug } });
  }

  private async getIdpConfig(tenantId: string, protocol?: 'SAML' | 'OIDC'): Promise<PrismaIdpConfig | null> {
    if (protocol) {
      return prisma.idpConfig.findFirst({
        where: { tenantId, protocol, enabled: true },
      });
    }

    // Prefer OIDC if both are configured
    const configs = await prisma.idpConfig.findMany({
      where: { tenantId, enabled: true },
      orderBy: { protocol: 'asc' }, // OIDC comes before SAML alphabetically
    });

    return configs[0] ?? null;
  }

  private toSamlConfig(config: PrismaIdpConfig): SamlIdpConfig {
    return {
      id: config.id,
      tenantId: config.tenantId,
      protocol: 'SAML',
      name: config.name,
      issuer: config.issuer,
      enabled: config.enabled,
      ssoUrl: config.ssoUrl!,
      sloUrl: config.sloUrl,
      x509Certificate: config.x509Certificate!,
      metadataXml: config.metadataXml,
      emailClaim: config.emailClaim,
      nameClaim: config.nameClaim,
      firstNameClaim: config.firstNameClaim,
      lastNameClaim: config.lastNameClaim,
      roleClaim: config.roleClaim,
      externalIdClaim: config.externalIdClaim,
      roleMapping: config.roleMapping as Record<string, UserRoleEnum>,
      autoProvisionUsers: config.autoProvisionUsers,
      defaultRole: config.defaultRole,
      loginHintTemplate: config.loginHintTemplate,
      allowedUserTypes: config.allowedUserTypes,
    };
  }

  private toOidcConfig(config: PrismaIdpConfig): OidcIdpConfig {
    return {
      id: config.id,
      tenantId: config.tenantId,
      protocol: 'OIDC',
      name: config.name,
      issuer: config.issuer,
      enabled: config.enabled,
      clientId: config.clientId!,
      clientSecretRef: config.clientSecretRef!,
      authorizationEndpoint: config.authorizationEndpoint!,
      tokenEndpoint: config.tokenEndpoint!,
      userinfoEndpoint: config.userinfoEndpoint,
      jwksUri: config.jwksUri!,
      scopes: config.scopes,
      emailClaim: config.emailClaim,
      nameClaim: config.nameClaim,
      firstNameClaim: config.firstNameClaim,
      lastNameClaim: config.lastNameClaim,
      roleClaim: config.roleClaim,
      externalIdClaim: config.externalIdClaim,
      roleMapping: config.roleMapping as Record<string, UserRoleEnum>,
      autoProvisionUsers: config.autoProvisionUsers,
      defaultRole: config.defaultRole,
      loginHintTemplate: config.loginHintTemplate,
      allowedUserTypes: config.allowedUserTypes,
    };
  }

  private async logSsoAttempt(log: SsoAttemptLog): Promise<void> {
    try {
      await prisma.ssoAttempt.create({
        data: log,
      });
    } catch (error) {
      console.error('[SSO] Failed to log SSO attempt:', error);
    }
  }

  // ==========================================================================
  // SP METADATA
  // ==========================================================================

  /**
   * Get SAML SP metadata for a tenant.
   */
  getSpMetadata(tenantSlug: string): string {
    return this.samlService.generateSpMetadata(tenantSlug);
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface SsoCallbackResult {
  success: boolean;
  error?: SsoErrorCode;
  message?: string;
  user?: {
    id: string;
    email: string;
    tenantId: string;
    roles: Role[];
  };
  accessToken?: string;
  refreshToken?: string;
  redirectUri?: string;
  clientType?: 'web' | 'mobile';
}

interface FindOrCreateUserResult {
  success: boolean;
  error?: SsoErrorCode;
  message?: string;
  user?: {
    id: string;
    email: string;
    tenantId: string;
    roles: Role[];
  };
  provisioned?: boolean;
}

// ============================================================================
// ERRORS
// ============================================================================

export class SsoError extends Error {
  constructor(
    public readonly code: SsoErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'SsoError';
  }
}
