/**
 * LTI 1.1 Content-Item Service (Deep Linking)
 *
 * Implements the LTI Content-Item Message specification for
 * embedding content from AIVO into the LMS via deep linking.
 *
 * Content-Item flow:
 * 1. LMS sends ContentItemSelectionRequest to AIVO
 * 2. User selects content in AIVO's picker UI
 * 3. AIVO sends ContentItemSelection response back to LMS
 * 4. LMS creates assignment/link with selected content
 *
 * @see https://www.imsglobal.org/specs/lticiv1p0
 */

import crypto from 'crypto';

import type { PrismaClient } from '../../generated/prisma-client/index.js';

import type { Lti11ContentItem, Lti11ContentItemResponse } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT-ITEM SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class Lti11ContentItemService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: { baseUrl: string }
  ) {}

  /**
   * Build a content-item response to send back to the LMS
   */
  async buildContentItemResponse(
    consumerId: string,
    returnUrl: string,
    items: Lti11ContentItem[],
    data?: string
  ): Promise<Lti11ContentItemResponse> {
    const consumer = await this.prisma.lti11Consumer.findUnique({
      where: { id: consumerId },
    });

    if (!consumer) {
      throw new Error('Consumer not found');
    }

    // Build content-item JSON-LD
    const contentItems = {
      '@context': 'http://purl.imsglobal.org/ctx/lti/v1/ContentItem',
      '@graph': items.map((item) => this.formatContentItem(item)),
    };

    const contentItemsJson = JSON.stringify(contentItems);

    // Build form parameters
    const formParams: Record<string, string> = {
      lti_message_type: 'ContentItemSelection',
      lti_version: 'LTI-1p0',
      content_items: contentItemsJson,
    };

    if (data) {
      formParams.data = data;
    }

    // Sign with OAuth 1.0a
    const signedParams = this.signFormParams(
      returnUrl,
      formParams,
      consumer.consumerKey,
      consumer.sharedSecret
    );

    return {
      formAction: returnUrl,
      formMethod: 'POST',
      formParams: signedParams,
    };
  }

  /**
   * Build an LTI Link content item for a lesson/activity
   */
  buildLtiLinkItem(options: {
    title: string;
    text?: string;
    launchUrl: string;
    custom?: Record<string, string>;
    icon?: string;
    lineItem?: {
      label: string;
      scoreMaximum: number;
    };
  }): Lti11ContentItem {
    const item: Lti11ContentItem = {
      '@type': 'LtiLinkItem',
      title: options.title,
      url: options.launchUrl,
      mediaType: 'application/vnd.ims.lti.v1.ltilink',
      placementAdvice: {
        presentationDocumentTarget: 'iframe',
      },
    };

    if (options.text) {
      item.text = options.text;
    }

    if (options.custom) {
      item.custom = options.custom;
    }

    if (options.icon) {
      item.icon = {
        '@id': options.icon,
        width: 50,
        height: 50,
      };
    }

    if (options.lineItem) {
      item.lineItem = {
        '@type': 'LineItem',
        label: options.lineItem.label,
        scoreMaximum: options.lineItem.scoreMaximum,
      };
    }

    return item;
  }

  /**
   * Build a file content item
   */
  buildFileItem(options: {
    title: string;
    text?: string;
    url: string;
    mediaType: string;
    thumbnail?: string;
  }): Lti11ContentItem {
    const item: Lti11ContentItem = {
      '@type': 'FileItem',
      title: options.title,
      url: options.url,
      mediaType: options.mediaType,
    };

    if (options.text) {
      item.text = options.text;
    }

    if (options.thumbnail) {
      item.thumbnail = {
        '@id': options.thumbnail,
        width: 128,
        height: 128,
      };
    }

    return item;
  }

  /**
   * Build content items from AIVO content selection
   */
  buildContentItemsFromSelection(
    selection: {
      type: 'lesson' | 'assessment' | 'activity';
      id: string;
      title: string;
      description?: string | undefined;
      scoreMaximum?: number | undefined;
    }[]
  ): Lti11ContentItem[] {
    return selection.map((selectionItem) => {
      const linkOptions: Parameters<typeof this.buildLtiLinkItem>[0] = {
        title: selectionItem.title,
        launchUrl: `${this.config.baseUrl}/lti/1.1/launch?content_type=${selectionItem.type}&content_id=${selectionItem.id}`,
        custom: {
          content_type: selectionItem.type,
          content_id: selectionItem.id,
        },
        icon: `${this.config.baseUrl}/images/lti-icon-${selectionItem.type}.png`,
      };

      if (selectionItem.description) {
        linkOptions.text = selectionItem.description;
      }

      if (selectionItem.scoreMaximum) {
        linkOptions.lineItem = {
          label: selectionItem.title,
          scoreMaximum: selectionItem.scoreMaximum,
        };
      }

      return this.buildLtiLinkItem(linkOptions);
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Format content item for JSON-LD output
   */
  private formatContentItem(item: Lti11ContentItem): Record<string, unknown> {
    const formatted: Record<string, unknown> = {
      '@type': item['@type'],
      title: item.title,
    };

    if (item['@id']) formatted['@id'] = item['@id'];
    if (item.text) formatted.text = item.text;
    if (item.url) formatted.url = item.url;
    if (item.mediaType) formatted.mediaType = item.mediaType;
    if (item.placementAdvice) formatted.placementAdvice = item.placementAdvice;
    if (item.icon) formatted.icon = item.icon;
    if (item.thumbnail) formatted.thumbnail = item.thumbnail;
    if (item.custom) formatted.custom = item.custom;
    if (item.lineItem) formatted.lineItem = item.lineItem;

    return formatted;
  }

  /**
   * Sign form parameters with OAuth 1.0a
   */
  private signFormParams(
    url: string,
    params: Record<string, string>,
    consumerKey: string,
    sharedSecret: string
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
    };

    // Combine all parameters for signature
    const allParams = { ...params, ...oauthParams };

    // Build signature base string
    const sortedParams = Object.entries(allParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${this.percentEncode(key)}=${this.percentEncode(value)}`)
      .join('&');

    const baseString = `POST&${this.percentEncode(url)}&${this.percentEncode(sortedParams)}`;

    // Sign with HMAC-SHA1
    const signingKey = `${this.percentEncode(sharedSecret)}&`;
    const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

    // Return all params including signature
    return {
      ...params,
      ...oauthParams,
      oauth_signature: signature,
    };
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
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-SUBMIT FORM HTML GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate HTML for auto-submitting form back to LMS
 */
export function generateAutoSubmitHtml(response: Lti11ContentItemResponse): string {
  const formInputs = Object.entries(response.formParams)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`
    )
    .join('\n    ');

  return `<!DOCTYPE html>
<html>
<head>
  <title>Returning to LMS...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .loading {
      text-align: center;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e0e0e0;
      border-top-color: #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <p>Returning to your LMS...</p>
  </div>
  <form id="lti-return-form" action="${escapeHtml(response.formAction)}" method="POST">
    ${formInputs}
  </form>
  <script>
    document.getElementById('lti-return-form').submit();
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
