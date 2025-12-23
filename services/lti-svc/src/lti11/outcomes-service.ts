/**
 * LTI 1.1 Outcomes Service (Grade Passback)
 *
 * Implements the LTI 1.1 Basic Outcomes Service for submitting grades
 * back to the LMS. Uses POX (Plain Old XML) message format as defined
 * in the IMS LTI Basic Outcomes specification.
 *
 * Supported operations:
 * - replaceResult: Submit or update a score
 * - readResult: Read the current score
 * - deleteResult: Remove a score
 *
 * @see https://www.imsglobal.org/specs/ltiomv1p0
 */

import crypto from 'crypto';

import type { PrismaClient } from '../../generated/prisma-client/index.js';

import type { Lti11OutcomeSubmission, Lti11OutcomeResult } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// ERRORS
// ══════════════════════════════════════════════════════════════════════════════

export class Lti11OutcomeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus = 400
  ) {
    super(message);
    this.name = 'Lti11OutcomeError';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// OUTCOMES SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class Lti11OutcomesService {
  private readonly REQUEST_TIMEOUT_MS = 30000;

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Submit a score to the LMS via LTI 1.1 Outcomes Service
   */
  async submitScore(submission: Lti11OutcomeSubmission): Promise<Lti11OutcomeResult> {
    // 1. Get outcome binding
    const binding = await this.prisma.lti11OutcomeBinding.findFirst({
      where: {
        userId: submission.userId,
        resourceLinkId: submission.resourceLinkId,
      },
      include: {
        consumer: true,
      },
    });

    if (!binding) {
      throw new Lti11OutcomeError(
        'No outcome binding found for this user/resource',
        'BINDING_NOT_FOUND',
        404
      );
    }

    if (!binding.serviceUrl || !binding.sourcedId) {
      throw new Lti11OutcomeError(
        'Outcome service not configured for this launch',
        'OUTCOMES_NOT_CONFIGURED',
        400
      );
    }

    // 2. Validate score range
    if (submission.score < 0 || submission.score > 1) {
      throw new Lti11OutcomeError('Score must be between 0.0 and 1.0', 'INVALID_SCORE', 400);
    }

    // 3. Build POX (Plain Old XML) message
    const messageId = crypto.randomUUID();
    const poxBody = this.buildReplaceResultRequest(
      messageId,
      binding.sourcedId,
      submission.score,
      submission.comment,
      submission.resultData
    );

    // 4. Sign request with OAuth 1.0a body hash
    const authHeader = this.buildOAuthHeader(
      binding.serviceUrl,
      poxBody,
      binding.consumer.consumerKey,
      binding.consumer.sharedSecret
    );

    // 5. Send request
    try {
      const response = await fetch(binding.serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          Authorization: authHeader,
        },
        body: poxBody,
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
      });

      const responseText = await response.text();

      // 6. Parse response
      const result = this.parseOutcomeResponse(responseText);

      // 7. Log result
      await this.logOutcomeSubmission(binding.id, submission, result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failed attempt
      await this.logOutcomeSubmission(binding.id, submission, {
        success: false,
        description: errorMessage,
        errorCode: 'NETWORK_ERROR',
      });

      throw new Lti11OutcomeError(
        `Failed to submit outcome: ${errorMessage}`,
        'SUBMISSION_FAILED',
        502
      );
    }
  }

  /**
   * Read current score from LMS
   */
  async readScore(userId: string, resourceLinkId: string): Promise<number | null> {
    const binding = await this.prisma.lti11OutcomeBinding.findFirst({
      where: { userId, resourceLinkId },
      include: { consumer: true },
    });

    if (!binding) {
      throw new Lti11OutcomeError('No outcome binding found', 'BINDING_NOT_FOUND', 404);
    }

    const messageId = crypto.randomUUID();
    const poxBody = this.buildReadResultRequest(messageId, binding.sourcedId);

    const authHeader = this.buildOAuthHeader(
      binding.serviceUrl,
      poxBody,
      binding.consumer.consumerKey,
      binding.consumer.sharedSecret
    );

    const response = await fetch(binding.serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        Authorization: authHeader,
      },
      body: poxBody,
      signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
    });

    const responseText = await response.text();
    return this.parseReadResultResponse(responseText);
  }

  /**
   * Delete score from LMS
   */
  async deleteScore(userId: string, resourceLinkId: string): Promise<Lti11OutcomeResult> {
    const binding = await this.prisma.lti11OutcomeBinding.findFirst({
      where: { userId, resourceLinkId },
      include: { consumer: true },
    });

    if (!binding) {
      throw new Lti11OutcomeError('No outcome binding found', 'BINDING_NOT_FOUND', 404);
    }

    const messageId = crypto.randomUUID();
    const poxBody = this.buildDeleteResultRequest(messageId, binding.sourcedId);

    const authHeader = this.buildOAuthHeader(
      binding.serviceUrl,
      poxBody,
      binding.consumer.consumerKey,
      binding.consumer.sharedSecret
    );

    const response = await fetch(binding.serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        Authorization: authHeader,
      },
      body: poxBody,
      signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
    });

    const responseText = await response.text();
    const result = this.parseOutcomeResponse(responseText);

    // Log the delete operation
    await this.prisma.lti11OutcomeLog.create({
      data: {
        bindingId: binding.id,
        userId,
        resourceLinkId,
        operation: 'deleteResult',
        success: result.success,
        messageId: result.messageId ?? null,
        description: result.description ?? null,
        errorCode: result.errorCode ?? null,
      },
    });

    return result;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // POX MESSAGE BUILDERS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Build replaceResult POX request
   */
  private buildReplaceResultRequest(
    messageId: string,
    sourcedId: string,
    score: number,
    comment?: string,
    resultData?: { text?: string | undefined; url?: string | undefined }
  ): string {
    let resultDataXml = '';
    if (resultData?.text) {
      resultDataXml += `<resultData><text>${this.escapeXml(resultData.text)}</text></resultData>`;
    }
    if (resultData?.url) {
      resultDataXml += `<resultData><url>${this.escapeXml(resultData.url)}</url></resultData>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<imsx_POXEnvelopeRequest xmlns="http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0">
  <imsx_POXHeader>
    <imsx_POXRequestHeaderInfo>
      <imsx_version>V1.0</imsx_version>
      <imsx_messageIdentifier>${messageId}</imsx_messageIdentifier>
    </imsx_POXRequestHeaderInfo>
  </imsx_POXHeader>
  <imsx_POXBody>
    <replaceResultRequest>
      <resultRecord>
        <sourcedGUID>
          <sourcedId>${this.escapeXml(sourcedId)}</sourcedId>
        </sourcedGUID>
        <result>
          <resultScore>
            <language>en</language>
            <textString>${score.toFixed(4)}</textString>
          </resultScore>
          ${comment ? `<resultData><text>${this.escapeXml(comment)}</text></resultData>` : ''}
          ${resultDataXml}
        </result>
      </resultRecord>
    </replaceResultRequest>
  </imsx_POXBody>
</imsx_POXEnvelopeRequest>`;
  }

  /**
   * Build readResult POX request
   */
  private buildReadResultRequest(messageId: string, sourcedId: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<imsx_POXEnvelopeRequest xmlns="http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0">
  <imsx_POXHeader>
    <imsx_POXRequestHeaderInfo>
      <imsx_version>V1.0</imsx_version>
      <imsx_messageIdentifier>${messageId}</imsx_messageIdentifier>
    </imsx_POXRequestHeaderInfo>
  </imsx_POXHeader>
  <imsx_POXBody>
    <readResultRequest>
      <resultRecord>
        <sourcedGUID>
          <sourcedId>${this.escapeXml(sourcedId)}</sourcedId>
        </sourcedGUID>
      </resultRecord>
    </readResultRequest>
  </imsx_POXBody>
</imsx_POXEnvelopeRequest>`;
  }

  /**
   * Build deleteResult POX request
   */
  private buildDeleteResultRequest(messageId: string, sourcedId: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<imsx_POXEnvelopeRequest xmlns="http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0">
  <imsx_POXHeader>
    <imsx_POXRequestHeaderInfo>
      <imsx_version>V1.0</imsx_version>
      <imsx_messageIdentifier>${messageId}</imsx_messageIdentifier>
    </imsx_POXRequestHeaderInfo>
  </imsx_POXHeader>
  <imsx_POXBody>
    <deleteResultRequest>
      <resultRecord>
        <sourcedGUID>
          <sourcedId>${this.escapeXml(sourcedId)}</sourcedId>
        </sourcedGUID>
      </resultRecord>
    </deleteResultRequest>
  </imsx_POXBody>
</imsx_POXEnvelopeRequest>`;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // OAUTH SIGNING
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Build OAuth 1.0a Authorization header with body hash
   */
  private buildOAuthHeader(
    url: string,
    body: string,
    consumerKey: string,
    sharedSecret: string
  ): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    // Calculate body hash (SHA-1 for LTI 1.1)
    const bodyHash = crypto.createHash('sha1').update(body).digest('base64');

    // OAuth parameters
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
      oauth_body_hash: bodyHash,
    };

    // Build signature base string
    const baseString = this.buildSignatureBaseString('POST', url, oauthParams);

    // Sign with HMAC-SHA1
    const signingKey = `${this.percentEncode(sharedSecret)}&`;
    const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

    oauthParams.oauth_signature = signature;

    // Build Authorization header
    const authParams = Object.entries(oauthParams)
      .map(([key, value]) => `${key}="${this.percentEncode(value)}"`)
      .join(', ');

    return `OAuth ${authParams}`;
  }

  /**
   * Build OAuth signature base string
   */
  private buildSignatureBaseString(
    method: string,
    url: string,
    params: Record<string, string>
  ): string {
    const sortedParams = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${this.percentEncode(key)}=${this.percentEncode(value)}`)
      .join('&');

    return `${method.toUpperCase()}&${this.percentEncode(url)}&${this.percentEncode(sortedParams)}`;
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

  // ════════════════════════════════════════════════════════════════════════════
  // RESPONSE PARSING
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Parse POX outcome response (simple XML parsing without external deps)
   */
  private parseOutcomeResponse(xml: string): Lti11OutcomeResult {
    // Extract status info using regex (avoiding xml2js dependency)
    const codeMajorMatch = /<imsx_codeMajor>([^<]+)<\/imsx_codeMajor>/.exec(xml);
    const codeMinorMatch = /<imsx_codeMinor>([^<]+)<\/imsx_codeMinor>/.exec(xml);
    const descriptionMatch = /<imsx_description>([^<]*)<\/imsx_description>/.exec(xml);
    const messageIdMatch = /<imsx_messageIdentifier>([^<]+)<\/imsx_messageIdentifier>/.exec(xml);

    const codeMajor = codeMajorMatch?.[1] || 'failure';
    const codeMinor = codeMinorMatch?.[1];
    const description = descriptionMatch?.[1] || '';
    const messageId = messageIdMatch?.[1];

    const result: Lti11OutcomeResult = {
      success: codeMajor.toLowerCase() === 'success',
    };
    if (messageId) result.messageId = messageId;
    if (description) result.description = description;
    if (codeMajor.toLowerCase() !== 'success' && codeMinor) {
      result.errorCode = codeMinor;
    }
    return result;
  }

  /**
   * Parse readResult response to extract score
   */
  private parseReadResultResponse(xml: string): number | null {
    const scoreMatch = /<textString>([^<]+)<\/textString>/.exec(xml);
    if (scoreMatch?.[1]) {
      const score = parseFloat(scoreMatch[1]);
      return isNaN(score) ? null : score;
    }
    return null;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Escape special XML characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Log outcome submission attempt
   */
  private async logOutcomeSubmission(
    bindingId: string,
    submission: Lti11OutcomeSubmission,
    result: Lti11OutcomeResult
  ): Promise<void> {
    await this.prisma.lti11OutcomeLog.create({
      data: {
        bindingId,
        userId: submission.userId,
        resourceLinkId: submission.resourceLinkId,
        operation: 'replaceResult',
        score: submission.score,
        success: result.success,
        messageId: result.messageId ?? null,
        description: result.description ?? null,
        errorCode: result.errorCode ?? null,
      },
    });
  }
}
