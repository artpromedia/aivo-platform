/**
 * LTI Platform Registration Service
 *
 * Handles registration of LTI platforms (Canvas, Schoology, etc.)
 * and provides dynamic registration support for LTI 1.3.
 */

import type { PrismaClient, LtiTool } from '../generated/prisma-client/index.js';
import { z } from 'zod';

import { LtiPlatformType } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Platform registration request
 */
export const PlatformRegistrationSchema = z.object({
  tenantId: z.string().uuid(),
  platformType: z.nativeEnum(LtiPlatformType),
  platformName: z.string().min(1).max(255),
  clientId: z.string().min(1),
  deploymentId: z.string().min(1),
  issuer: z.string().url(),
  authLoginUrl: z.string().url(),
  authTokenUrl: z.string().url(),
  jwksUrl: z.string().url(),
  toolPrivateKeyRef: z.string().min(1),
  toolPublicKeyId: z.string().optional(),
  lineItemsUrl: z.string().url().optional(),
  membershipsUrl: z.string().url().optional(),
  deepLinkingUrl: z.string().url().optional(),
  enabled: z.boolean().default(true),
  configJson: z.record(z.unknown()).default({}),
});

export type PlatformRegistration = z.infer<typeof PlatformRegistrationSchema>;

/**
 * Platform configuration for well-known LMS providers
 */
interface PlatformPreset {
  platformType: LtiPlatformType;
  /** Template for issuer URL */
  issuerTemplate: string;
  /** Template for auth login URL */
  authLoginUrlTemplate: string;
  /** Template for auth token URL */
  authTokenUrlTemplate: string;
  /** Template for JWKS URL */
  jwksUrlTemplate: string;
  /** Additional configuration hints */
  configHints: Record<string, string>;
}

/**
 * Registration result
 */
interface RegistrationResult {
  tool: LtiTool;
  jwksUrl: string;
  loginUrl: string;
  launchUrl: string;
  deepLinkingUrl: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PLATFORM PRESETS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Well-known platform configurations
 * Replace {domain} with the institution's domain
 * Replace {accountId} with the Canvas account ID (for Canvas)
 */
const PLATFORM_PRESETS: Record<LtiPlatformType, PlatformPreset> = {
  [LtiPlatformType.CANVAS]: {
    platformType: LtiPlatformType.CANVAS,
    issuerTemplate: 'https://{domain}',
    authLoginUrlTemplate: 'https://{domain}/api/lti/authorize_redirect',
    authTokenUrlTemplate: 'https://{domain}/login/oauth2/token',
    jwksUrlTemplate: 'https://{domain}/api/lti/security/jwks',
    configHints: {
      domain: 'Your Canvas domain (e.g., canvas.instructure.com or myschool.instructure.com)',
      developerKeyId: 'Developer Key ID from Canvas Admin',
      clientId: 'Client ID from Developer Key',
    },
  },
  [LtiPlatformType.SCHOOLOGY]: {
    platformType: LtiPlatformType.SCHOOLOGY,
    issuerTemplate: 'https://lti.schoology.com',
    authLoginUrlTemplate: 'https://lti.schoology.com/lti/v1p3/oidc/authorize',
    authTokenUrlTemplate: 'https://lti.schoology.com/lti/v1p3/oauth/access_token',
    jwksUrlTemplate: 'https://lti.schoology.com/lti/v1p3/security/jwks',
    configHints: {
      consumerKey: 'OAuth Consumer Key from Schoology App Center',
      clientId: 'Client ID from LTI 1.3 app registration',
    },
  },
  [LtiPlatformType.GOOGLE_CLASSROOM]: {
    platformType: LtiPlatformType.GOOGLE_CLASSROOM,
    issuerTemplate: 'https://classroom.google.com',
    authLoginUrlTemplate: 'https://accounts.google.com/o/oauth2/v2/auth',
    authTokenUrlTemplate: 'https://oauth2.googleapis.com/token',
    jwksUrlTemplate: 'https://www.googleapis.com/oauth2/v3/certs',
    configHints: {
      gcpProjectId: 'Google Cloud Project ID',
      clientId: 'OAuth 2.0 Client ID from GCP Console',
    },
  },
  [LtiPlatformType.BLACKBOARD]: {
    platformType: LtiPlatformType.BLACKBOARD,
    issuerTemplate: 'https://blackboard.com',
    authLoginUrlTemplate: 'https://{domain}/api/v1/gateway/oidcauth',
    authTokenUrlTemplate: 'https://{domain}/api/v1/gateway/oauth2/jwttoken',
    jwksUrlTemplate: 'https://{domain}/api/v1/management/applications/{clientId}/jwks.json',
    configHints: {
      domain: 'Your Blackboard domain',
      clientId: 'Application Key from Blackboard Developer Portal',
    },
  },
  [LtiPlatformType.BRIGHTSPACE]: {
    platformType: LtiPlatformType.BRIGHTSPACE,
    issuerTemplate: 'https://{domain}',
    authLoginUrlTemplate: 'https://auth.brightspace.com/oauth2/authorize',
    authTokenUrlTemplate: 'https://auth.brightspace.com/oauth2/token',
    jwksUrlTemplate: 'https://{domain}/d2l/.well-known/jwks',
    configHints: {
      domain: 'Your Brightspace/D2L domain',
      clientId: 'Client ID from Brightspace App Management',
    },
  },
  [LtiPlatformType.MOODLE]: {
    platformType: LtiPlatformType.MOODLE,
    issuerTemplate: 'https://{domain}',
    authLoginUrlTemplate: 'https://{domain}/mod/lti/auth.php',
    authTokenUrlTemplate: 'https://{domain}/mod/lti/token.php',
    jwksUrlTemplate: 'https://{domain}/mod/lti/certs.php',
    configHints: {
      domain: 'Your Moodle domain',
      clientId: 'Client ID from External Tool configuration',
    },
  },
  [LtiPlatformType.GENERIC]: {
    platformType: LtiPlatformType.GENERIC,
    issuerTemplate: '',
    authLoginUrlTemplate: '',
    authTokenUrlTemplate: '',
    jwksUrlTemplate: '',
    configHints: {
      issuer: 'Platform issuer URL (iss claim in JWT)',
      authLoginUrl: 'OIDC authorization endpoint',
      authTokenUrl: 'OAuth2 token endpoint',
      jwksUrl: 'Platform JWKS endpoint for signature verification',
    },
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// REGISTRATION SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class PlatformRegistrationService {
  private readonly prisma: PrismaClient;
  private readonly baseUrl: string;
  private readonly generateKeyPair: () => Promise<{ privateKeyRef: string; publicKeyId: string }>;

  constructor(
    prisma: PrismaClient,
    baseUrl: string,
    generateKeyPair: () => Promise<{ privateKeyRef: string; publicKeyId: string }>
  ) {
    this.prisma = prisma;
    this.baseUrl = baseUrl;
    this.generateKeyPair = generateKeyPair;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REGISTRATION OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Register a new LTI platform
   */
  async registerPlatform(data: PlatformRegistration): Promise<RegistrationResult> {
    // Validate input
    const validated = PlatformRegistrationSchema.parse(data);

    // Check for existing registration with same issuer/clientId/deploymentId
    const existing = await this.prisma.ltiTool.findFirst({
      where: {
        tenantId: validated.tenantId,
        issuer: validated.issuer,
        clientId: validated.clientId,
        deploymentId: validated.deploymentId,
      },
    });

    if (existing) {
      throw new Error(`Platform already registered: ${existing.platformName} (${existing.id})`);
    }

    // Generate key pair if not provided
    let keyPair: { privateKeyRef: string; publicKeyId: string };
    if (validated.toolPrivateKeyRef) {
      keyPair = {
        privateKeyRef: validated.toolPrivateKeyRef,
        publicKeyId: validated.toolPublicKeyId || 'key-1',
      };
    } else {
      keyPair = await this.generateKeyPair();
    }

    // Create tool registration
    const tool = await this.prisma.ltiTool.create({
      data: {
        tenantId: validated.tenantId,
        platformType: validated.platformType,
        platformName: validated.platformName,
        clientId: validated.clientId,
        deploymentId: validated.deploymentId,
        issuer: validated.issuer,
        authLoginUrl: validated.authLoginUrl,
        authTokenUrl: validated.authTokenUrl,
        jwksUrl: validated.jwksUrl,
        toolPrivateKeyRef: keyPair.privateKeyRef,
        toolPublicKeyId: keyPair.publicKeyId ?? null,
        lineItemsUrl: validated.lineItemsUrl ?? null,
        membershipsUrl: validated.membershipsUrl ?? null,
        deepLinkingUrl: validated.deepLinkingUrl ?? null,
        enabled: validated.enabled,
        configJson: validated.configJson as object,
      },
    });

    return {
      tool,
      jwksUrl: `${this.baseUrl}/lti/jwks`,
      loginUrl: `${this.baseUrl}/lti/login`,
      launchUrl: `${this.baseUrl}/lti/launch`,
      deepLinkingUrl: `${this.baseUrl}/lti/deep-linking`,
    };
  }

  /**
   * Get preset configuration for a platform type
   */
  getPlatformPreset(platformType: LtiPlatformType): PlatformPreset {
    return PLATFORM_PRESETS[platformType];
  }

  /**
   * Build platform URLs from preset and domain
   */
  buildPlatformUrls(
    platformType: LtiPlatformType,
    domain: string,
    clientId?: string
  ): {
    issuer: string;
    authLoginUrl: string;
    authTokenUrl: string;
    jwksUrl: string;
  } {
    const preset = PLATFORM_PRESETS[platformType];

    const replacePlaceholders = (template: string) =>
      template.replace('{domain}', domain).replace('{clientId}', clientId || '');

    return {
      issuer: replacePlaceholders(preset.issuerTemplate),
      authLoginUrl: replacePlaceholders(preset.authLoginUrlTemplate),
      authTokenUrl: replacePlaceholders(preset.authTokenUrlTemplate),
      jwksUrl: replacePlaceholders(preset.jwksUrlTemplate),
    };
  }

  /**
   * Update an existing platform registration
   */
  async updatePlatform(toolId: string, data: Partial<PlatformRegistration>): Promise<LtiTool> {
    // Only include fields that are defined
    const updateData: Record<string, unknown> = {};
    if (data.platformName !== undefined) updateData.platformName = data.platformName;
    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.deploymentId !== undefined) updateData.deploymentId = data.deploymentId;
    if (data.issuer !== undefined) updateData.issuer = data.issuer;
    if (data.authLoginUrl !== undefined) updateData.authLoginUrl = data.authLoginUrl;
    if (data.authTokenUrl !== undefined) updateData.authTokenUrl = data.authTokenUrl;
    if (data.jwksUrl !== undefined) updateData.jwksUrl = data.jwksUrl;
    if (data.toolPrivateKeyRef !== undefined) updateData.toolPrivateKeyRef = data.toolPrivateKeyRef;
    if (data.toolPublicKeyId !== undefined)
      updateData.toolPublicKeyId = data.toolPublicKeyId ?? null;
    if (data.lineItemsUrl !== undefined) updateData.lineItemsUrl = data.lineItemsUrl ?? null;
    if (data.membershipsUrl !== undefined) updateData.membershipsUrl = data.membershipsUrl ?? null;
    if (data.deepLinkingUrl !== undefined) updateData.deepLinkingUrl = data.deepLinkingUrl ?? null;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.configJson !== undefined) updateData.configJson = data.configJson as object;

    return this.prisma.ltiTool.update({
      where: { id: toolId },
      data: updateData,
    });
  }

  /**
   * Delete a platform registration
   */
  async deletePlatform(toolId: string): Promise<void> {
    await this.prisma.ltiTool.delete({
      where: { id: toolId },
    });
  }

  /**
   * Enable/disable a platform
   */
  async setPlatformEnabled(toolId: string, enabled: boolean): Promise<LtiTool> {
    return this.prisma.ltiTool.update({
      where: { id: toolId },
      data: { enabled },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // QUERY OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get all platforms for a tenant
   */
  async getPlatforms(tenantId: string): Promise<LtiTool[]> {
    return this.prisma.ltiTool.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a platform by ID
   */
  async getPlatform(toolId: string): Promise<LtiTool | null> {
    return this.prisma.ltiTool.findUnique({
      where: { id: toolId },
    });
  }

  /**
   * Get platform by issuer and client ID
   */
  async getPlatformByIssuer(
    issuer: string,
    clientId: string,
    deploymentId?: string
  ): Promise<LtiTool | null> {
    const where: Record<string, string> = { issuer, clientId };
    if (deploymentId) where.deploymentId = deploymentId;

    return this.prisma.ltiTool.findFirst({ where });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CONFIGURATION HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get LTI configuration JSON for platform setup
   * This generates the JSON that admins paste into their LMS
   */
  getToolConfiguration(tenantId: string): {
    title: string;
    description: string;
    oidc_initiation_url: string;
    target_link_uri: string;
    extensions: unknown[];
    public_jwk_url: string;
    scopes: string[];
  } {
    return {
      title: 'Aivo Learning Platform',
      description: 'Personalized AI-powered learning activities',
      oidc_initiation_url: `${this.baseUrl}/lti/login`,
      target_link_uri: `${this.baseUrl}/lti/launch`,
      extensions: [
        {
          platform: 'canvas.instructure.com',
          privacy_level: 'public',
          settings: {
            placements: [
              {
                placement: 'assignment_selection',
                message_type: 'LtiDeepLinkingRequest',
                target_link_uri: `${this.baseUrl}/lti/deep-linking`,
              },
              {
                placement: 'link_selection',
                message_type: 'LtiDeepLinkingRequest',
                target_link_uri: `${this.baseUrl}/lti/deep-linking`,
              },
              {
                placement: 'course_navigation',
                message_type: 'LtiResourceLinkRequest',
                default: 'disabled',
              },
            ],
          },
        },
      ],
      public_jwk_url: `${this.baseUrl}/lti/jwks`,
      scopes: [
        'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
        'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
        'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
        'https://purl.imsglobal.org/spec/lti-ags/scope/score',
        'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
      ],
    };
  }

  /**
   * Generate Canvas-specific LTI JSON for developer key creation
   */
  getCanvasDevKeyJson(): {
    title: string;
    description: string;
    oidc_initiation_url: string;
    target_link_uri: string;
    extensions: unknown[];
    public_jwk_url: string;
    scopes: string[];
  } {
    return {
      title: 'Aivo',
      description: 'AI-Powered Personalized Learning',
      oidc_initiation_url: `${this.baseUrl}/lti/login`,
      target_link_uri: `${this.baseUrl}/lti/launch`,
      extensions: [
        {
          domain: new URL(this.baseUrl).hostname,
          platform: 'canvas.instructure.com',
          privacy_level: 'public',
          tool_id: 'aivo',
          settings: {
            text: 'Aivo',
            icon_url: `${this.baseUrl}/assets/icon.png`,
            placements: [
              {
                text: 'Aivo Activity',
                placement: 'assignment_selection',
                message_type: 'LtiDeepLinkingRequest',
                target_link_uri: `${this.baseUrl}/lti/deep-linking`,
                selection_height: 800,
                selection_width: 600,
              },
              {
                text: 'Aivo Content',
                placement: 'editor_button',
                message_type: 'LtiDeepLinkingRequest',
                target_link_uri: `${this.baseUrl}/lti/deep-linking`,
                icon_url: `${this.baseUrl}/assets/icon.png`,
                selection_height: 800,
                selection_width: 600,
              },
            ],
          },
        },
      ],
      public_jwk_url: `${this.baseUrl}/lti/jwks`,
      scopes: [
        'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
        'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
        'https://purl.imsglobal.org/spec/lti-ags/scope/score',
        'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
      ],
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create platform registration service instance
 */
export function createPlatformRegistrationService(
  prisma: PrismaClient,
  baseUrl: string,
  generateKeyPair?: () => Promise<{ privateKeyRef: string; publicKeyId: string }>
): PlatformRegistrationService {
  // Default key pair generator (returns placeholder - replace in production)
  const defaultGenerateKeyPair = async () => ({
    privateKeyRef: `kms://lti-keys/${crypto.randomUUID()}`,
    publicKeyId: `kid-${Date.now()}`,
  });

  return new PlatformRegistrationService(
    prisma,
    baseUrl,
    generateKeyPair || defaultGenerateKeyPair
  );
}
