/**
 * SAML Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { SamlService, parseSamlMetadata } from '../src/lib/sso/saml.js';
import type { SamlIdpConfig } from '../src/lib/sso/types.js';

describe('SamlService', () => {
  let service: SamlService;
  let mockConfig: SamlIdpConfig;

  beforeEach(() => {
    service = new SamlService({
      spEntityId: 'https://aivo.education/sp',
      baseUrl: 'https://auth.aivo.education',
    });

    mockConfig = {
      id: 'idp-1',
      tenantId: 'tenant-1',
      protocol: 'SAML',
      name: 'Test SAML IdP',
      issuer: 'https://idp.example.com/saml',
      enabled: true,
      ssoUrl: 'https://idp.example.com/saml/sso',
      sloUrl: 'https://idp.example.com/saml/slo',
      x509Certificate: `MIIDpTCCAo2gAwIBAgIJAJYwZ5n5wZmAMA0GCSqGSIb3DQEBCwUA...`,
      metadataXml: null,
      emailClaim: 'email',
      nameClaim: 'name',
      firstNameClaim: 'firstName',
      lastNameClaim: 'lastName',
      roleClaim: 'role',
      externalIdClaim: 'nameID',
      roleMapping: {
        Teacher: 'TEACHER',
        Admin: 'DISTRICT_ADMIN',
        Staff: 'TEACHER',
      },
      autoProvisionUsers: true,
      defaultRole: 'TEACHER',
      loginHintTemplate: null,
      allowedUserTypes: ['TEACHER', 'DISTRICT_ADMIN'],
    };
  });

  describe('generateAuthnRequest', () => {
    it('should generate AuthnRequest with correct destination', async () => {
      const { url, requestId } = await service.generateAuthnRequest(mockConfig, {
        acsUrl: 'https://auth.aivo.education/auth/saml/acs/test-tenant',
      });

      expect(requestId).toMatch(/^_[a-f0-9]+$/);
      expect(url).toContain('https://idp.example.com/saml/sso');
      expect(url).toContain('SAMLRequest=');
    });

    it('should include RelayState when provided', async () => {
      const { url } = await service.generateAuthnRequest(mockConfig, {
        acsUrl: 'https://auth.aivo.education/auth/saml/acs/test-tenant',
        relayState: 'state-123',
      });

      expect(url).toContain('RelayState=state-123');
    });
  });

  describe('generateSpMetadata', () => {
    it('should generate valid SP metadata XML', () => {
      const metadata = service.generateSpMetadata('test-tenant');

      expect(metadata).toContain('EntityDescriptor');
      expect(metadata).toContain('entityID="https://aivo.education/sp"');
      expect(metadata).toContain('SPSSODescriptor');
      expect(metadata).toContain('AssertionConsumerService');
      expect(metadata).toContain('/auth/saml/acs/test-tenant');
    });

    it('should include NameIDFormat', () => {
      const metadata = service.generateSpMetadata('test-tenant');

      expect(metadata).toContain('NameIDFormat');
      expect(metadata).toContain('emailAddress');
    });
  });

  describe('validateResponse', () => {
    it('should return error for invalid issuer', async () => {
      // Mock a SAML response with wrong issuer
      const mockResponse = Buffer.from(`
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
          <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
            https://wrong-issuer.com
          </saml:Issuer>
        </samlp:Response>
      `).toString('base64');

      const result = await service.validateResponse(mockResponse, mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('INVALID_ISSUER');
      }
    });
  });
});

describe('parseSamlMetadata', () => {
  it('should parse valid IdP metadata', () => {
    const metadata = `
      <?xml version="1.0" encoding="UTF-8"?>
      <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                           entityID="https://idp.example.com/saml">
        <md:IDPSSODescriptor>
          <md:SingleSignOnService
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
            Location="https://idp.example.com/saml/sso"/>
          <md:SingleLogoutService
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
            Location="https://idp.example.com/saml/slo"/>
          <md:KeyDescriptor use="signing">
            <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
              <ds:X509Data>
                <ds:X509Certificate>MIIDpTCCAo2gAwIBAgIJAJYwZ5n5</ds:X509Certificate>
              </ds:X509Data>
            </ds:KeyInfo>
          </md:KeyDescriptor>
        </md:IDPSSODescriptor>
      </md:EntityDescriptor>
    `;

    const parsed = parseSamlMetadata(metadata);

    expect(parsed).not.toBeNull();
    expect(parsed?.entityId).toBe('https://idp.example.com/saml');
    expect(parsed?.ssoUrl).toBe('https://idp.example.com/saml/sso');
    expect(parsed?.sloUrl).toBe('https://idp.example.com/saml/slo');
    expect(parsed?.x509Certificate).toContain('MIIDpTCCAo2gAwIBAgIJAJYwZ5n5');
  });

  it('should return null for invalid metadata', () => {
    const invalid = '<invalid>not saml metadata</invalid>';
    const parsed = parseSamlMetadata(invalid);

    expect(parsed).toBeNull();
  });

  it('should handle metadata without SLO URL', () => {
    const metadata = `
      <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                           entityID="https://idp.example.com">
        <md:IDPSSODescriptor>
          <md:SingleSignOnService
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
            Location="https://idp.example.com/sso"/>
          <ds:X509Certificate xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
            MIIC...
          </ds:X509Certificate>
        </md:IDPSSODescriptor>
      </md:EntityDescriptor>
    `;

    const parsed = parseSamlMetadata(metadata);

    expect(parsed).not.toBeNull();
    expect(parsed?.sloUrl).toBeUndefined();
  });
});
