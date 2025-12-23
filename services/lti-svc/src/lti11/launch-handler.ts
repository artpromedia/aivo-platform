/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unused-vars */
/**
 * LTI 1.1 Launch Handler
 *
 * Implements OAuth 1.0a signature verification and LTI 1.1 launch processing.
 * This handler validates incoming LTI 1.1 launches from legacy LMS platforms
 * and creates user sessions compatible with the rest of the AIVO platform.
 *
 * Security features:
 * - OAuth 1.0a signature verification (HMAC-SHA1/SHA256)
 * - Timestamp validation (5-minute window)
 * - Nonce replay protection
 * - Timing-safe signature comparison
 *
 * @see https://www.imsglobal.org/specs/ltiv1p1
 */

import crypto from 'crypto';

import type { FastifyRequest } from 'fastify';

import type { PrismaClient } from '../../generated/prisma-client/index.js';
import type { LtiUserService } from '../lti-user-service.js';

import type { Lti11LaunchParams, Lti11Consumer, Lti11LaunchResult } from './types.js';
import { LTI11_CONSTANTS, LEGACY_ROLE_MAP, LTI11_ROLE_URNS } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// ERRORS
// ══════════════════════════════════════════════════════════════════════════════

export class Lti11Error extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus = 400
  ) {
    super(message);
    this.name = 'Lti11Error';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LAUNCH HANDLER
// ══════════════════════════════════════════════════════════════════════════════

export class Lti11LaunchHandler {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ltiUserService: LtiUserService,
    private readonly config: { baseUrl: string }
  ) {}

  /**
   * Validate and process LTI 1.1 launch
   */
  async handleLaunch(req: FastifyRequest): Promise<Lti11LaunchResult> {
    const params = req.body as Lti11LaunchParams;
    const launchUrl = this.reconstructLaunchUrl(req);

    // 1. Validate required parameters
    this.validateRequiredParams(params);

    // 2. Get consumer by key
    const consumer = await this.getConsumer(params.oauth_consumer_key);
    if (!consumer) {
      throw new Lti11Error('Unknown consumer key', 'UNKNOWN_CONSUMER', 401);
    }

    // 3. Verify OAuth signature
    await this.verifyOAuthSignature(params, consumer, launchUrl);

    // 4. Validate timestamp and nonce
    await this.validateTimestampAndNonce(params, consumer.id);

    // 5. Resolve or create user
    const userId = params.user_id || this.generateAnonymousUserId(params);

    // Build user context, only including optional properties if they have values
    const userContext: Parameters<typeof this.ltiUserService.resolveOrCreateUser>[0] = {
      issuer: `lti11:${consumer.consumerKey}`,
      clientId: consumer.consumerKey,
      deploymentId: params.tool_consumer_instance_guid || 'default',
      sub: userId,
      roles: this.parseRoles(params.roles),
      customClaims: this.extractCustomParams(params),
      tenantId: consumer.tenantId,
      toolId: consumer.id,
    };

    if (params.lis_person_contact_email_primary) {
      userContext.email = params.lis_person_contact_email_primary;
    }
    if (params.lis_person_name_given) {
      userContext.givenName = params.lis_person_name_given;
    }
    if (params.lis_person_name_family) {
      userContext.familyName = params.lis_person_name_family;
    }
    if (params.lis_person_name_full) {
      userContext.name = params.lis_person_name_full;
    }

    const user = await this.ltiUserService.resolveOrCreateUser(userContext);

    // 6. Store outcomes service info for grade passback
    if (params.lis_outcome_service_url && params.lis_result_sourcedid) {
      await this.storeOutcomesInfo(
        user.userId,
        consumer.id,
        params.resource_link_id,
        params.lis_outcome_service_url,
        params.lis_result_sourcedid
      );
    }

    // 7. Log launch
    await this.logLaunch(consumer, params, user.userId);

    // 8. Create session
    const session = await this.createSession(user.userId, consumer.tenantId, {
      ltiVersion: '1.1',
      consumerId: consumer.id,
      contextId: params.context_id,
      resourceLinkId: params.resource_link_id,
    });

    // Build result with proper optional handling for exactOptionalPropertyTypes
    const userResult: Lti11LaunchResult['user'] = {
      userId: user.userId,
      displayName: user.displayName,
      role: user.role,
      isNewUser: user.isNewUser,
    };
    if (user.email) {
      userResult.email = user.email;
    }

    const context: Lti11LaunchResult['context'] = {};
    if (params.context_id) context.id = params.context_id;
    if (params.context_title) context.title = params.context_title;
    if (params.context_label) context.label = params.context_label;
    if (params.context_type) context.type = params.context_type;

    return {
      user: userResult,
      session,
      consumer,
      context,
      resourceLinkId: params.resource_link_id,
      customParams: this.extractCustomParams(params),
      hasOutcomesService: !!(params.lis_outcome_service_url && params.lis_result_sourcedid),
    };
  }

  /**
   * Validate required LTI 1.1 launch parameters
   */
  private validateRequiredParams(params: Lti11LaunchParams): void {
    const required = [
      'oauth_consumer_key',
      'oauth_signature_method',
      'oauth_timestamp',
      'oauth_nonce',
      'oauth_signature',
      'lti_message_type',
      'lti_version',
      'resource_link_id',
    ];

    const missing = required.filter((key) => !params[key]);
    if (missing.length > 0) {
      throw new Lti11Error(
        `Missing required parameters: ${missing.join(', ')}`,
        'MISSING_PARAMS',
        400
      );
    }

    // Validate message type
    const validMessageTypes: string[] = [
      LTI11_CONSTANTS.BASIC_LAUNCH_MESSAGE_TYPE,
      LTI11_CONSTANTS.CONTENT_ITEM_MESSAGE_TYPE,
    ];
    if (!validMessageTypes.includes(params.lti_message_type)) {
      throw new Lti11Error(
        `Invalid lti_message_type: ${params.lti_message_type}`,
        'INVALID_MESSAGE_TYPE',
        400
      );
    }

    // Validate LTI version
    if (params.lti_version !== LTI11_CONSTANTS.LTI_VERSION) {
      throw new Lti11Error(
        `Unsupported LTI version: ${params.lti_version}`,
        'UNSUPPORTED_VERSION',
        400
      );
    }

    // Validate signature method
    const supportedMethods = LTI11_CONSTANTS.SUPPORTED_SIGNATURE_METHODS as readonly string[];
    if (!supportedMethods.includes(params.oauth_signature_method)) {
      throw new Lti11Error(
        `Unsupported signature method: ${params.oauth_signature_method}`,
        'UNSUPPORTED_SIGNATURE_METHOD',
        400
      );
    }
  }

  /**
   * Get consumer by OAuth consumer key
   */
  private async getConsumer(consumerKey: string): Promise<Lti11Consumer | null> {
    const consumer = await this.prisma.lti11Consumer.findUnique({
      where: { consumerKey },
    });

    if (!consumer?.isActive) {
      return null;
    }

    const result: Lti11Consumer = {
      id: consumer.id,
      tenantId: consumer.tenantId,
      name: consumer.name,
      consumerKey: consumer.consumerKey,
      sharedSecret: consumer.sharedSecret,
      isActive: consumer.isActive,
      settings: (consumer.settings as Record<string, unknown>) ?? {},
      createdAt: consumer.createdAt,
      updatedAt: consumer.updatedAt,
    };
    if (consumer.instanceGuid) {
      result.instanceGuid = consumer.instanceGuid;
    }
    return result;
  }

  /**
   * Verify OAuth 1.0a signature
   *
   * Implements the OAuth 1.0a signature base string algorithm:
   * 1. Uppercase HTTP method
   * 2. URL-encode base URI (without query string)
   * 3. Normalize and URL-encode parameters
   * 4. Concatenate with & and sign with HMAC
   */
  private async verifyOAuthSignature(
    params: Lti11LaunchParams,
    consumer: Lti11Consumer,
    launchUrl: string
  ): Promise<void> {
    // Build parameters for signature (exclude oauth_signature)
    const signatureParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (key !== 'oauth_signature' && value !== undefined) {
        signatureParams[key] = value;
      }
    }

    // Build signature base string
    const baseString = this.buildSignatureBaseString('POST', launchUrl, signatureParams);

    // Build signing key (consumer_secret&token_secret, but token_secret is empty for LTI)
    const signingKey = `${this.percentEncode(consumer.sharedSecret)}&`;

    // Calculate expected signature
    const algorithm = params.oauth_signature_method === 'HMAC-SHA256' ? 'sha256' : 'sha1';
    const expectedSignature = crypto
      .createHmac(algorithm, signingKey)
      .update(baseString)
      .digest('base64');

    // Timing-safe comparison
    const receivedSig = Buffer.from(decodeURIComponent(params.oauth_signature));
    const expectedSig = Buffer.from(expectedSignature);

    if (
      receivedSig.length !== expectedSig.length ||
      !crypto.timingSafeEqual(receivedSig, expectedSig)
    ) {
      throw new Lti11Error('Invalid OAuth signature', 'INVALID_SIGNATURE', 401);
    }
  }

  /**
   * Build OAuth 1.0a signature base string
   */
  private buildSignatureBaseString(
    method: string,
    url: string,
    params: Record<string, string>
  ): string {
    // 1. Uppercase method
    const upperMethod = method.toUpperCase();

    // 2. Base URL (without query string)
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

    // 3. Sort and encode parameters
    const sortedParams = Object.entries(params)
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .map(([key, value]): [string, string] => [
        this.percentEncode(key),
        this.percentEncode(value ?? ''),
      ])
      .sort((a, b) => {
        if (a[0] === b[0]) return a[1].localeCompare(b[1]);
        return a[0].localeCompare(b[0]);
      })
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    // 4. Concatenate
    return `${upperMethod}&${this.percentEncode(baseUrl)}&${this.percentEncode(sortedParams)}`;
  }

  /**
   * RFC 3986 percent encoding
   */
  private percentEncode(str: string): string {
    return encodeURIComponent(str).replace(
      /[!'()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
    );
  }

  /**
   * Validate OAuth timestamp and nonce
   */
  private async validateTimestampAndNonce(
    params: Lti11LaunchParams,
    consumerId: string
  ): Promise<void> {
    // Validate timestamp
    const timestamp = parseInt(params.oauth_timestamp, 10);
    const now = Math.floor(Date.now() / 1000);

    if (Math.abs(now - timestamp) > LTI11_CONSTANTS.TIMESTAMP_TOLERANCE_SECONDS) {
      throw new Lti11Error('OAuth timestamp out of range', 'TIMESTAMP_INVALID', 401);
    }

    // Check nonce hasn't been used (for this consumer)
    const nonceKey = `${consumerId}:${params.oauth_nonce}`;
    const existingNonce = await this.prisma.lti11Nonce.findUnique({
      where: { key: nonceKey },
    });

    if (existingNonce) {
      throw new Lti11Error('OAuth nonce already used', 'NONCE_REUSED', 401);
    }

    // Store nonce with expiry
    const expiresAt = new Date((timestamp + LTI11_CONSTANTS.NONCE_EXPIRY_SECONDS) * 1000);
    await this.prisma.lti11Nonce.create({
      data: {
        key: nonceKey,
        consumerId,
        timestamp: new Date(timestamp * 1000),
        expiresAt,
      },
    });
  }

  /**
   * Parse LTI 1.1 roles string into role URNs
   */
  private parseRoles(rolesString?: string): string[] {
    if (!rolesString) return [];

    return rolesString.split(',').map((role) => {
      role = role.trim();

      // If already a URN, return as-is
      if (role.startsWith('urn:')) {
        return role;
      }

      // Convert legacy role names to URNs
      return LEGACY_ROLE_MAP[role] || role;
    });
  }

  /**
   * Extract custom parameters (custom_ prefix)
   */
  private extractCustomParams(params: Lti11LaunchParams): Record<string, string> {
    const customParams: Record<string, string> = {};

    for (const [key, value] of Object.entries(params)) {
      if (key.startsWith('custom_') && value !== undefined) {
        const cleanKey = key.substring(7);
        customParams[cleanKey] = value;
      }
    }

    return customParams;
  }

  /**
   * Store outcome service binding for grade passback
   */
  private async storeOutcomesInfo(
    userId: string,
    consumerId: string,
    resourceLinkId: string,
    serviceUrl: string,
    sourcedId: string
  ): Promise<void> {
    await this.prisma.lti11OutcomeBinding.upsert({
      where: {
        userId_consumerId_resourceLinkId: {
          userId,
          consumerId,
          resourceLinkId,
        },
      },
      create: {
        userId,
        consumerId,
        resourceLinkId,
        serviceUrl,
        sourcedId,
      },
      update: {
        serviceUrl,
        sourcedId,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Generate consistent anonymous user ID
   */
  private generateAnonymousUserId(params: Lti11LaunchParams): string {
    const seed = `${params.oauth_consumer_key}:${params.context_id || ''}:${params.resource_link_id}`;
    return `anon_${crypto.createHash('sha256').update(seed).digest('hex').substring(0, 24)}`;
  }

  /**
   * Reconstruct the launch URL from request
   */
  private reconstructLaunchUrl(req: FastifyRequest): string {
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
    const path = req.url.split('?')[0];
    return `${protocol}://${host}${path}`;
  }

  /**
   * Log launch for audit/debugging
   */
  private async logLaunch(
    consumer: Lti11Consumer,
    params: Lti11LaunchParams,
    userId: string
  ): Promise<void> {
    await this.prisma.lti11LaunchLog.create({
      data: {
        consumerId: consumer.id,
        tenantId: consumer.tenantId,
        userId,
        messageType: params.lti_message_type,
        resourceLinkId: params.resource_link_id,
        contextId: params.context_id ?? null,
        contextTitle: params.context_title ?? null,
        roles: params.roles ?? null,
        outcomeServiceUrl: params.lis_outcome_service_url ?? null,
        customParams: this.extractCustomParams(params) as object,
        launchData: params as object,
        consumerInstanceGuid: params.tool_consumer_instance_guid ?? null,
        consumerInstanceName: params.tool_consumer_instance_name ?? null,
        productFamily: params.tool_consumer_info_product_family_code ?? null,
        productVersion: params.tool_consumer_info_version ?? null,
      },
    });
  }

  /**
   * Create session for authenticated user
   */
  private async createSession(
    userId: string,
    tenantId: string,
    ltiContext: Record<string, unknown>
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    // Create LTI session record
    const session = await this.prisma.lti11Session.create({
      data: {
        userId,
        tenantId,
        expiresAt,
        ltiVersion: '1.1',
        consumerId: ltiContext.consumerId as string,
        contextId: (ltiContext.contextId as string | undefined) ?? null,
        resourceLinkId: ltiContext.resourceLinkId as string,
        metadata: ltiContext as object,
      },
    });

    // Generate session token
    const accessToken = this.generateSessionToken(session.id, userId);

    return { accessToken, expiresAt };
  }

  /**
   * Generate opaque session token
   */
  private generateSessionToken(sessionId: string, userId: string): string {
    const payload = `${sessionId}:${userId}:${Date.now()}`;
    const signature = crypto
      .createHmac('sha256', process.env.SESSION_SECRET || 'dev-secret')
      .update(payload)
      .digest('base64url');
    return `lti11_${Buffer.from(payload).toString('base64url')}.${signature}`;
  }
}
