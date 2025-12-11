/**
 * LTI Assignment and Grade Services (AGS)
 *
 * Handles grade passback to LMS platforms using LTI Advantage AGS.
 * @see https://www.imsglobal.org/spec/lti-ags/v2p0
 */

import type { PrismaClient } from '@prisma/client';

import { LtiError, signToolJwt } from './lti-auth.js';
import { LtiGradeStatus } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * AGS Score submission payload
 * @see https://www.imsglobal.org/spec/lti-ags/v2p0#score-publish-service
 */
interface AgsScore {
  userId: string;
  scoreGiven?: number;
  scoreMaximum?: number;
  activityProgress: 'Initialized' | 'Started' | 'InProgress' | 'Submitted' | 'Completed';
  gradingProgress: 'FullyGraded' | 'Pending' | 'PendingManual' | 'Failed' | 'NotReady';
  comment?: string;
  timestamp: string;
}

/**
 * AGS Line Item (assignment/grade column in LMS)
 */
interface AgsLineItem {
  id?: string;
  scoreMaximum: number;
  label: string;
  resourceId?: string;
  resourceLinkId?: string;
  tag?: string;
  startDateTime?: string;
  endDateTime?: string;
}

/**
 * OAuth2 token response
 */
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN CACHE
// ══════════════════════════════════════════════════════════════════════════════

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

// ══════════════════════════════════════════════════════════════════════════════
// GRADE SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class GradeService {
  private prisma: PrismaClient;
  private getPrivateKey: (keyRef: string) => Promise<string>;

  constructor(prisma: PrismaClient, getPrivateKey: (keyRef: string) => Promise<string>) {
    this.prisma = prisma;
    this.getPrivateKey = getPrivateKey;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GRADE PASSBACK
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Send grade/completion result to LMS
   *
   * This is the main entry point for grade passback.
   * Call this when a learner completes an LTI-linked activity.
   */
  async sendLmsResult(
    launchId: string,
    score: number,
    completed: boolean,
    comment?: string
  ): Promise<{ success: boolean; error?: string }> {
    // Get launch with tool and link info
    const launch = await this.prisma.ltiLaunch.findUnique({
      where: { id: launchId },
      include: {
        tool: true,
        link: true,
      },
    });

    if (!launch) {
      return { success: false, error: 'Launch not found' };
    }

    // Check if grading is enabled for this link
    if (!launch.link?.gradingEnabled) {
      // Update launch status to indicate grade not applicable
      await this.prisma.ltiLaunch.update({
        where: { id: launchId },
        data: {
          gradeStatus: LtiGradeStatus.NOT_APPLICABLE,
        },
      });
      return { success: true }; // Not an error, just not configured
    }

    // Get AGS endpoint from launch params
    const launchParams = launch.launchParamsJson as Record<string, unknown>;
    const agsEndpoint = launchParams['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'] as
      | {
          scope?: string[];
          lineitems?: string;
          lineitem?: string;
        }
      | undefined;

    if (!agsEndpoint) {
      await this.prisma.ltiLaunch.update({
        where: { id: launchId },
        data: {
          gradeStatus: LtiGradeStatus.NOT_APPLICABLE,
          gradeError: 'No AGS endpoint in launch',
        },
      });
      return { success: false, error: 'AGS not supported by LMS' };
    }

    // Mark as pending
    await this.prisma.ltiLaunch.update({
      where: { id: launchId },
      data: { gradeStatus: LtiGradeStatus.PENDING },
    });

    try {
      // Get access token for AGS
      const accessToken = await this.getAgsAccessToken(launch.tool);

      // Determine line item URL
      let lineItemUrl = agsEndpoint.lineitem;

      if (!lineItemUrl && agsEndpoint.lineitems) {
        // Need to find or create line item
        lineItemUrl = await this.findOrCreateLineItem(agsEndpoint.lineitems, accessToken, {
          scoreMaximum: Number(launch.link.maxPoints) || 100,
          label: launch.link.title,
          resourceLinkId: launch.lmsResourceLinkId || undefined,
        });
      }

      if (!lineItemUrl) {
        throw new LtiError('Unable to determine line item URL', 'NO_LINE_ITEM', 400);
      }

      // Submit score
      const scoreUrl = lineItemUrl.endsWith('/scores') ? lineItemUrl : `${lineItemUrl}/scores`;

      await this.submitScore(scoreUrl, accessToken, {
        userId: launch.lmsUserId,
        scoreGiven: score,
        scoreMaximum: Number(launch.link.maxPoints) || 100,
        activityProgress: completed ? 'Completed' : 'InProgress',
        gradingProgress: 'FullyGraded',
        comment,
        timestamp: new Date().toISOString(),
      });

      // Update launch with success
      await this.prisma.ltiLaunch.update({
        where: { id: launchId },
        data: {
          gradeStatus: LtiGradeStatus.SENT,
          scoreGiven: score,
          scoreMaximum: Number(launch.link.maxPoints) || 100,
          gradeSentAt: new Date(),
          gradeError: null,
        },
      });

      // Update link with line item ID for future use
      if (lineItemUrl && !launch.link.lineItemId) {
        await this.prisma.ltiLink.update({
          where: { id: launch.link.id },
          data: { lineItemId: lineItemUrl },
        });
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.prisma.ltiLaunch.update({
        where: { id: launchId },
        data: {
          gradeStatus: LtiGradeStatus.FAILED,
          gradeError: errorMessage,
        },
      });

      return { success: false, error: errorMessage };
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AGS OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get OAuth2 access token for AGS API calls
   */
  private async getAgsAccessToken(tool: {
    id: string;
    clientId: string;
    authTokenUrl: string;
    toolPrivateKeyRef: string;
    toolPublicKeyId?: string | null;
  }): Promise<string> {
    // Check cache
    const cacheKey = `ags:${tool.id}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return cached.accessToken;
    }

    // Get private key from KMS/Vault
    const privateKey = await this.getPrivateKey(tool.toolPrivateKeyRef);

    // Create client assertion JWT
    const clientAssertion = await signToolJwt(
      {
        iss: tool.clientId,
        sub: tool.clientId,
        aud: tool.authTokenUrl,
        jti: crypto.randomUUID(),
      },
      privateKey,
      tool.toolPublicKeyId || 'key-1',
      '5m'
    );

    // Request access token
    const response = await fetch(tool.authTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: clientAssertion,
        scope: [
          'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
          'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
          'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
          'https://purl.imsglobal.org/spec/lti-ags/scope/score',
        ].join(' '),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new LtiError(`Token request failed: ${error}`, 'TOKEN_ERROR', response.status);
    }

    const tokenData = (await response.json()) as TokenResponse;

    // Cache token
    tokenCache.set(cacheKey, {
      accessToken: tokenData.access_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
    });

    return tokenData.access_token;
  }

  /**
   * Find existing line item or create new one
   */
  private async findOrCreateLineItem(
    lineItemsUrl: string,
    accessToken: string,
    lineItem: AgsLineItem
  ): Promise<string> {
    // Try to find existing line item by resourceLinkId
    if (lineItem.resourceLinkId) {
      const searchUrl = new URL(lineItemsUrl);
      searchUrl.searchParams.set('resource_link_id', lineItem.resourceLinkId);

      const searchResponse = await fetch(searchUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.ims.lis.v2.lineitemcontainer+json',
        },
      });

      if (searchResponse.ok) {
        const items = (await searchResponse.json()) as AgsLineItem[];
        if (items.length > 0 && items[0].id) {
          return items[0].id;
        }
      }
    }

    // Create new line item
    const createResponse = await fetch(lineItemsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.ims.lis.v2.lineitem+json',
        Accept: 'application/vnd.ims.lis.v2.lineitem+json',
      },
      body: JSON.stringify(lineItem),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new LtiError(
        `Failed to create line item: ${error}`,
        'LINE_ITEM_ERROR',
        createResponse.status
      );
    }

    const created = (await createResponse.json()) as AgsLineItem;
    if (!created.id) {
      throw new LtiError('Created line item missing ID', 'LINE_ITEM_ERROR', 500);
    }

    return created.id;
  }

  /**
   * Submit score to line item
   */
  private async submitScore(scoreUrl: string, accessToken: string, score: AgsScore): Promise<void> {
    const response = await fetch(scoreUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.ims.lis.v1.score+json',
      },
      body: JSON.stringify(score),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new LtiError(`Score submission failed: ${error}`, 'SCORE_ERROR', response.status);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BATCH OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Retry failed grade submissions
   */
  async retryFailedGrades(tenantId?: string): Promise<{ retried: number; succeeded: number }> {
    const where: Record<string, unknown> = {
      gradeStatus: LtiGradeStatus.FAILED,
    };
    if (tenantId) where.tenantId = tenantId;

    const failedLaunches = await this.prisma.ltiLaunch.findMany({
      where,
      include: { link: true },
      take: 100, // Process in batches
    });

    let succeeded = 0;
    for (const launch of failedLaunches) {
      if (launch.scoreGiven !== null && launch.scoreMaximum !== null) {
        const result = await this.sendLmsResult(
          launch.id,
          Number(launch.scoreGiven),
          launch.status === 'COMPLETED'
        );
        if (result.success) succeeded++;
      }
    }

    return { retried: failedLaunches.length, succeeded };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Simple function to send LMS result (for use without full service)
 */
export async function sendLmsResult(
  prisma: PrismaClient,
  getPrivateKey: (keyRef: string) => Promise<string>,
  launchId: string,
  score: number,
  completed: boolean,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  const service = new GradeService(prisma, getPrivateKey);
  return service.sendLmsResult(launchId, score, completed, comment);
}
