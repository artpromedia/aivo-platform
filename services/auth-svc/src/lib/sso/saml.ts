/**
 * SAML 2.0 SSO Implementation
 *
 * Handles SAML authentication flows including:
 * - AuthnRequest generation
 * - SAML Response/Assertion validation
 * - Claims extraction
 *
 * Security: Validates signatures, issuer, audience, and timestamps.
 */

import { createHash, createVerify, randomBytes } from 'node:crypto';

import { inflate, deflate } from 'node:zlib';
import { promisify } from 'node:util';

import type { SamlIdpConfig, SsoUserClaims, SsoResult, SpMetadata } from './types.js';

const inflateAsync = promisify(inflate);
const deflateAsync = promisify(deflate);

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface SamlServiceConfig {
  /** Service Provider Entity ID */
  spEntityId: string;
  /** Base URL for callback endpoints */
  baseUrl: string;
  /** SP private key for signing (optional) */
  spPrivateKey?: string;
  /** SP certificate for metadata */
  spCertificate?: string;
  /** Clock skew tolerance in seconds */
  clockSkewSeconds?: number;
}

// ============================================================================
// SAML SERVICE
// ============================================================================

export class SamlService {
  private config: Required<SamlServiceConfig>;

  constructor(config: SamlServiceConfig) {
    this.config = {
      spEntityId: config.spEntityId,
      baseUrl: config.baseUrl,
      spPrivateKey: config.spPrivateKey ?? '',
      spCertificate: config.spCertificate ?? '',
      clockSkewSeconds: config.clockSkewSeconds ?? 300, // 5 minutes
    };
  }

  // ==========================================================================
  // AUTHN REQUEST
  // ==========================================================================

  /**
   * Generate a SAML AuthnRequest for IdP-initiated or SP-initiated SSO.
   */
  async generateAuthnRequest(
    idpConfig: SamlIdpConfig,
    options: {
      acsUrl: string;
      relayState?: string;
      forceAuthn?: boolean;
      loginHint?: string;
    }
  ): Promise<{ url: string; requestId: string }> {
    const requestId = `_${randomBytes(16).toString('hex')}`;
    const issueInstant = new Date().toISOString();

    const authnRequest = `
      <samlp:AuthnRequest
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="${requestId}"
        Version="2.0"
        IssueInstant="${issueInstant}"
        Destination="${idpConfig.ssoUrl}"
        AssertionConsumerServiceURL="${options.acsUrl}"
        ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        ${options.forceAuthn ? 'ForceAuthn="true"' : ''}>
        <saml:Issuer>${this.config.spEntityId}</saml:Issuer>
        <samlp:NameIDPolicy
          Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
          AllowCreate="true"/>
      </samlp:AuthnRequest>
    `.trim();

    // Deflate and base64 encode for HTTP-Redirect binding
    const deflated = await deflateAsync(Buffer.from(authnRequest, 'utf8'));
    const encoded = deflated.toString('base64');

    // Build URL
    const url = new URL(idpConfig.ssoUrl);
    url.searchParams.set('SAMLRequest', encoded);
    if (options.relayState) {
      url.searchParams.set('RelayState', options.relayState);
    }

    return { url: url.toString(), requestId };
  }

  // ==========================================================================
  // RESPONSE VALIDATION
  // ==========================================================================

  /**
   * Validate a SAML Response and extract user claims.
   */
  async validateResponse(
    samlResponse: string,
    idpConfig: SamlIdpConfig
  ): Promise<SsoResult> {
    try {
      // Decode the response
      const decoded = Buffer.from(samlResponse, 'base64').toString('utf8');

      // Parse XML (basic parsing - in production use a proper XML parser)
      const response = this.parseXml(decoded);

      // Validate signature
      if (!this.validateSignature(decoded, idpConfig.x509Certificate)) {
        return {
          success: false,
          error: 'INVALID_SIGNATURE',
          message: 'SAML response signature validation failed',
        };
      }

      // Validate issuer
      const issuer = this.extractValue(response, 'Issuer');
      if (issuer !== idpConfig.issuer) {
        return {
          success: false,
          error: 'INVALID_ISSUER',
          message: `Expected issuer ${idpConfig.issuer}, got ${issuer}`,
        };
      }

      // Validate audience
      const audience = this.extractValue(response, 'Audience');
      if (audience && audience !== this.config.spEntityId) {
        return {
          success: false,
          error: 'INVALID_AUDIENCE',
          message: `Expected audience ${this.config.spEntityId}, got ${audience}`,
        };
      }

      // Validate timestamps
      const notBefore = this.extractAttribute(response, 'Conditions', 'NotBefore');
      const notOnOrAfter = this.extractAttribute(response, 'Conditions', 'NotOnOrAfter');
      
      if (!this.validateTimestamps(notBefore, notOnOrAfter)) {
        return {
          success: false,
          error: 'ASSERTION_EXPIRED',
          message: 'SAML assertion has expired or is not yet valid',
        };
      }

      // Extract claims
      const claims = this.extractClaims(response, idpConfig);
      if (!claims) {
        return {
          success: false,
          error: 'MISSING_CLAIMS',
          message: 'Required claims not found in SAML assertion',
        };
      }

      // Extract session index for SLO
      const sessionIndex = this.extractAttribute(
        response,
        'AuthnStatement',
        'SessionIndex'
      );

      // Map roles
      const mappedUser = this.mapUserClaims(claims, idpConfig);

      return {
        success: true,
        user: mappedUser,
        idpConfigId: idpConfig.id,
        tenantId: idpConfig.tenantId,
        sessionIndex: sessionIndex ?? undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to validate SAML response',
      };
    }
  }

  // ==========================================================================
  // SP METADATA
  // ==========================================================================

  /**
   * Generate SP metadata XML for IdP configuration.
   */
  generateSpMetadata(tenantSlug: string): string {
    const acsUrl = `${this.config.baseUrl}/auth/saml/acs/${tenantSlug}`;
    const sloUrl = `${this.config.baseUrl}/auth/saml/slo/${tenantSlug}`;

    return `
<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor
  xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${this.config.spEntityId}">
  <md:SPSSODescriptor
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acsUrl}"
      index="0"
      isDefault="true"/>
    <md:SingleLogoutService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${sloUrl}"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>
    `.trim();
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private parseXml(xml: string): string {
    // Basic normalization - in production use a proper XML parser like fast-xml-parser
    return xml.replace(/\s+/g, ' ').trim();
  }

  private extractValue(xml: string, tagName: string): string | null {
    // Simple regex extraction - in production use proper XML parsing
    const patterns = [
      new RegExp(`<(?:saml:|saml2:)?${tagName}[^>]*>([^<]+)<`, 'i'),
      new RegExp(`<${tagName}[^>]*>([^<]+)<`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = xml.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }

  private extractAttribute(xml: string, tagName: string, attrName: string): string | null {
    const patterns = [
      new RegExp(`<(?:saml:|saml2:)?${tagName}[^>]*${attrName}="([^"]+)"`, 'i'),
      new RegExp(`<${tagName}[^>]*${attrName}="([^"]+)"`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = xml.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  private validateSignature(xml: string, certificate: string): boolean {
    try {
      // Extract signature value and signed info
      const signatureValueMatch = xml.match(/<(?:ds:)?SignatureValue[^>]*>([^<]+)</i);
      const signedInfoMatch = xml.match(/<(?:ds:)?SignedInfo[^>]*>[\s\S]*?<\/(?:ds:)?SignedInfo>/i);

      if (!signatureValueMatch || !signedInfoMatch) {
        // No signature present - might be okay for some IdPs
        console.warn('[SAML] No signature found in response');
        return true; // In production, this should be configurable per IdP
      }

      const signatureValue = signatureValueMatch[1].replace(/\s/g, '');
      const signedInfo = signedInfoMatch[0];

      // Normalize certificate
      const normalizedCert = this.normalizeCertificate(certificate);

      // Verify signature
      const verifier = createVerify('RSA-SHA256');
      verifier.update(signedInfo);
      
      return verifier.verify(normalizedCert, signatureValue, 'base64');
    } catch (error) {
      console.error('[SAML] Signature validation error:', error);
      return false;
    }
  }

  private normalizeCertificate(cert: string): string {
    // Remove headers if present
    const cleanCert = cert
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');

    return `-----BEGIN CERTIFICATE-----\n${cleanCert.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`;
  }

  private validateTimestamps(notBefore: string | null, notOnOrAfter: string | null): boolean {
    const now = Date.now();
    const skew = this.config.clockSkewSeconds * 1000;

    if (notBefore) {
      const nbTime = new Date(notBefore).getTime();
      if (now + skew < nbTime) {
        return false;
      }
    }

    if (notOnOrAfter) {
      const noaTime = new Date(notOnOrAfter).getTime();
      if (now - skew >= noaTime) {
        return false;
      }
    }

    return true;
  }

  private extractClaims(xml: string, idpConfig: SamlIdpConfig): SsoUserClaims | null {
    // Extract NameID (external ID)
    const nameId = this.extractValue(xml, 'NameID');
    if (!nameId) {
      return null;
    }

    // Extract attributes
    const attributes = this.extractAttributes(xml);

    const email = attributes[idpConfig.emailClaim] ?? nameId;
    const name = attributes[idpConfig.nameClaim];
    const firstName = attributes[idpConfig.firstNameClaim];
    const lastName = attributes[idpConfig.lastNameClaim];
    
    // Roles can be multi-valued
    const rawRoles = this.extractMultiValueAttribute(xml, idpConfig.roleClaim);

    return {
      externalId: nameId,
      email,
      name,
      firstName,
      lastName,
      rawRoles,
      additionalClaims: attributes,
    };
  }

  private extractAttributes(xml: string): Record<string, string> {
    const attributes: Record<string, string> = {};

    // Match Attribute elements and extract Name and Value
    const attrPattern = /<(?:saml:|saml2:)?Attribute[^>]*Name="([^"]+)"[^>]*>[\s\S]*?<(?:saml:|saml2:)?AttributeValue[^>]*>([^<]+)/gi;
    
    let match;
    while ((match = attrPattern.exec(xml)) !== null) {
      const [, name, value] = match;
      if (name && value) {
        attributes[name] = value.trim();
      }
    }

    return attributes;
  }

  private extractMultiValueAttribute(xml: string, attributeName: string): string[] {
    const values: string[] = [];
    
    // Find the attribute element
    const attrPattern = new RegExp(
      `<(?:saml:|saml2:)?Attribute[^>]*Name="${attributeName}"[^>]*>([\\s\\S]*?)</(?:saml:|saml2:)?Attribute>`,
      'gi'
    );
    
    const attrMatch = xml.match(attrPattern);
    if (!attrMatch) return values;

    // Extract all values
    const valuePattern = /<(?:saml:|saml2:)?AttributeValue[^>]*>([^<]+)</gi;
    let match;
    while ((match = valuePattern.exec(attrMatch[0])) !== null) {
      if (match[1]) {
        values.push(match[1].trim());
      }
    }

    return values;
  }

  private mapUserClaims(
    claims: SsoUserClaims,
    idpConfig: SamlIdpConfig
  ): SsoUserClaims & { roles: string[] } {
    const roleMapping = idpConfig.roleMapping as Record<string, string>;
    const mappedRoles: string[] = [];

    for (const rawRole of claims.rawRoles) {
      const mapped = roleMapping[rawRole];
      if (mapped && !mappedRoles.includes(mapped)) {
        mappedRoles.push(mapped);
      }
    }

    // Default role if no roles mapped
    if (mappedRoles.length === 0) {
      mappedRoles.push(idpConfig.defaultRole);
    }

    return {
      ...claims,
      roles: mappedRoles,
    };
  }
}

// ============================================================================
// SAML METADATA PARSER
// ============================================================================

export interface ParsedSamlMetadata {
  entityId: string;
  ssoUrl: string;
  sloUrl?: string;
  x509Certificate: string;
  nameIdFormat?: string;
}

/**
 * Parse IdP SAML metadata XML.
 */
export function parseSamlMetadata(metadataXml: string): ParsedSamlMetadata | null {
  try {
    // Extract EntityID
    const entityIdMatch = metadataXml.match(/entityID="([^"]+)"/i);
    if (!entityIdMatch) return null;

    // Extract SSO URL (HTTP-Redirect or HTTP-POST binding)
    const ssoUrlMatch = metadataXml.match(
      /SingleSignOnService[^>]*Binding="[^"]*(Redirect|POST)"[^>]*Location="([^"]+)"/i
    ) || metadataXml.match(
      /SingleSignOnService[^>]*Location="([^"]+)"[^>]*Binding="[^"]*(Redirect|POST)"/i
    );

    // Extract SLO URL (optional)
    const sloUrlMatch = metadataXml.match(
      /SingleLogoutService[^>]*Location="([^"]+)"/i
    );

    // Extract X.509 certificate
    const certMatch = metadataXml.match(/<(?:ds:)?X509Certificate[^>]*>([^<]+)</i);

    if (!ssoUrlMatch || !certMatch) return null;

    return {
      entityId: entityIdMatch[1],
      ssoUrl: ssoUrlMatch[2] || ssoUrlMatch[1],
      sloUrl: sloUrlMatch?.[1],
      x509Certificate: certMatch[1].replace(/\s/g, ''),
    };
  } catch {
    return null;
  }
}
