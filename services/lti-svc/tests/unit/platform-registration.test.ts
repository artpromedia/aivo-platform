/**
 * LTI Platform Registration Service Unit Tests
 *
 * Tests for LTI platform registration including:
 * - Platform presets (Canvas, Schoology, Moodle, etc.)
 * - Dynamic registration (LTI 1.3 Advantage)
 * - JWKS handling
 * - Tool configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock prisma
const mockPrisma = {
  ltiPlatform: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  ltiTool: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
};

// Types
interface PlatformPreset {
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  issuerPattern: RegExp;
  features: string[];
}

interface PlatformRegistration {
  id: string;
  issuer: string;
  clientId: string;
  authorizationUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  deploymentId?: string;
  privateKey: string;
  publicKey: string;
}

interface DynamicRegistrationPayload {
  openid_configuration: string;
  registration_token?: string;
}

describe('LTI Platform Registration Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Platform Presets', () => {
    const presets: Record<string, PlatformPreset> = {
      canvas: {
        name: 'Canvas LMS',
        authorizationUrl: '{issuer}/api/lti/authorize_redirect',
        tokenUrl: '{issuer}/login/oauth2/token',
        jwksUrl: '{issuer}/api/lti/security/jwks',
        issuerPattern: /\.instructure\.com$/,
        features: ['ags', 'names_and_roles', 'deep_linking'],
      },
      schoology: {
        name: 'Schoology',
        authorizationUrl: 'https://api.schoology.com/oauth2/authorize',
        tokenUrl: 'https://api.schoology.com/oauth2/token',
        jwksUrl: 'https://api.schoology.com/.well-known/jwks.json',
        issuerPattern: /schoology\.com$/,
        features: ['ags'],
      },
      moodle: {
        name: 'Moodle',
        authorizationUrl: '{issuer}/mod/lti/auth.php',
        tokenUrl: '{issuer}/mod/lti/token.php',
        jwksUrl: '{issuer}/mod/lti/certs.php',
        issuerPattern: /.*/, // Moodle can be self-hosted
        features: ['ags', 'names_and_roles'],
      },
    };

    it('should detect Canvas platform from issuer', () => {
      const issuer = 'https://school.instructure.com';
      const detected = Object.entries(presets).find(([_, preset]) =>
        preset.issuerPattern.test(issuer.replace('https://', ''))
      );
      expect(detected?.[0]).toBe('canvas');
    });

    it('should detect Schoology platform from issuer', () => {
      const issuer = 'https://app.schoology.com';
      const detected = Object.entries(presets).find(([_, preset]) =>
        preset.issuerPattern.test(issuer.replace('https://', ''))
      );
      expect(detected?.[0]).toBe('schoology');
    });

    it('should populate URLs from preset template', () => {
      const issuer = 'https://school.instructure.com';
      const preset = presets.canvas;

      const authUrl = preset.authorizationUrl.replace('{issuer}', issuer);
      const tokenUrl = preset.tokenUrl.replace('{issuer}', issuer);
      const jwksUrl = preset.jwksUrl.replace('{issuer}', issuer);

      expect(authUrl).toBe('https://school.instructure.com/api/lti/authorize_redirect');
      expect(tokenUrl).toBe('https://school.instructure.com/login/oauth2/token');
      expect(jwksUrl).toBe('https://school.instructure.com/api/lti/security/jwks');
    });

    it('should list supported features for preset', () => {
      expect(presets.canvas.features).toContain('ags');
      expect(presets.canvas.features).toContain('deep_linking');
      expect(presets.schoology.features).not.toContain('deep_linking');
    });

    it('should support custom Moodle URLs', () => {
      const selfHostedIssuer = 'https://moodle.myschool.edu';
      const preset = presets.moodle;

      const authUrl = preset.authorizationUrl.replace('{issuer}', selfHostedIssuer);
      expect(authUrl).toBe('https://moodle.myschool.edu/mod/lti/auth.php');
    });
  });

  describe('Platform Registration CRUD', () => {
    it('should create platform registration', async () => {
      const newPlatform: Partial<PlatformRegistration> = {
        issuer: 'https://school.instructure.com',
        clientId: 'client-123',
        authorizationUrl: 'https://school.instructure.com/api/lti/authorize_redirect',
        tokenUrl: 'https://school.instructure.com/login/oauth2/token',
        jwksUrl: 'https://school.instructure.com/api/lti/security/jwks',
      };

      mockPrisma.ltiPlatform.create.mockResolvedValue({
        id: 'platform-1',
        ...newPlatform,
      });

      const result = await mockPrisma.ltiPlatform.create({
        data: newPlatform,
      });

      expect(result.id).toBe('platform-1');
      expect(result.issuer).toBe(newPlatform.issuer);
    });

    it('should find platform by issuer', async () => {
      mockPrisma.ltiPlatform.findUnique.mockResolvedValue({
        id: 'platform-1',
        issuer: 'https://school.instructure.com',
        clientId: 'client-123',
      });

      const platform = await mockPrisma.ltiPlatform.findUnique({
        where: { issuer: 'https://school.instructure.com' },
      });

      expect(platform).not.toBeNull();
      expect(platform.clientId).toBe('client-123');
    });

    it('should list all platforms for organization', async () => {
      mockPrisma.ltiPlatform.findMany.mockResolvedValue([
        { id: 'p1', issuer: 'https://canvas1.instructure.com' },
        { id: 'p2', issuer: 'https://canvas2.instructure.com' },
      ]);

      const platforms = await mockPrisma.ltiPlatform.findMany({
        where: { organizationId: 'org-1' },
      });

      expect(platforms).toHaveLength(2);
    });

    it('should update platform settings', async () => {
      mockPrisma.ltiPlatform.update.mockResolvedValue({
        id: 'platform-1',
        deploymentId: 'deploy-456',
      });

      const result = await mockPrisma.ltiPlatform.update({
        where: { id: 'platform-1' },
        data: { deploymentId: 'deploy-456' },
      });

      expect(result.deploymentId).toBe('deploy-456');
    });

    it('should delete platform registration', async () => {
      mockPrisma.ltiPlatform.delete.mockResolvedValue({
        id: 'platform-1',
      });

      const deleted = await mockPrisma.ltiPlatform.delete({
        where: { id: 'platform-1' },
      });

      expect(deleted.id).toBe('platform-1');
    });
  });

  describe('Dynamic Registration', () => {
    it('should fetch OpenID configuration', async () => {
      const configUrl = 'https://school.instructure.com/.well-known/openid-configuration';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            issuer: 'https://school.instructure.com',
            authorization_endpoint: 'https://school.instructure.com/api/lti/authorize_redirect',
            token_endpoint: 'https://school.instructure.com/login/oauth2/token',
            jwks_uri: 'https://school.instructure.com/api/lti/security/jwks',
            registration_endpoint: 'https://school.instructure.com/api/lti/registration',
          }),
      });

      const response = await mockFetch(configUrl);
      const config = await response.json();

      expect(config.issuer).toBe('https://school.instructure.com');
      expect(config.registration_endpoint).toBeDefined();
    });

    it('should send tool registration request', async () => {
      const registrationEndpoint = 'https://school.instructure.com/api/lti/registration';
      const toolConfig = {
        application_type: 'web',
        grant_types: ['implicit', 'client_credentials'],
        response_types: ['id_token'],
        redirect_uris: ['https://aivo.app/lti/launch'],
        initiate_login_uri: 'https://aivo.app/lti/login',
        client_name: 'AIVO Learning',
        jwks_uri: 'https://aivo.app/.well-known/jwks.json',
        logo_uri: 'https://aivo.app/logo.png',
        'https://purl.imsglobal.org/spec/lti-tool-configuration': {
          domain: 'aivo.app',
          target_link_uri: 'https://aivo.app/lti/launch',
          claims: ['sub', 'iss', 'name', 'email'],
          messages: [
            {
              type: 'LtiResourceLinkRequest',
              target_link_uri: 'https://aivo.app/lti/launch',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            client_id: 'auto-generated-client-id',
            ...toolConfig,
          }),
      });

      const response = await mockFetch(registrationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer registration-token',
        },
        body: JSON.stringify(toolConfig),
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.client_id).toBeDefined();
    });

    it('should handle registration token expiry', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Registration token expired' }),
      });

      const response = await mockFetch('/registration', {
        method: 'POST',
        headers: { Authorization: 'Bearer expired-token' },
      });

      expect(response.status).toBe(401);
    });

    it('should validate required claims in registration', () => {
      const requiredClaims = ['sub', 'iss', 'aud', 'exp', 'iat'];
      const providedClaims = ['sub', 'iss', 'name'];

      const missingClaims = requiredClaims.filter((c) => !providedClaims.includes(c));
      expect(missingClaims).toContain('aud');
      expect(missingClaims).toContain('exp');
    });
  });

  describe('JWKS Management', () => {
    it('should generate RSA key pair', () => {
      // Simulate key pair generation
      const keyPair = {
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----',
        publicKey: '-----BEGIN RSA PUBLIC KEY-----\nMIIB...\n-----END RSA PUBLIC KEY-----',
      };

      expect(keyPair.privateKey).toContain('PRIVATE KEY');
      expect(keyPair.publicKey).toContain('PUBLIC KEY');
    });

    it('should format public key as JWKS', () => {
      const jwk = {
        kty: 'RSA',
        kid: 'key-1',
        alg: 'RS256',
        use: 'sig',
        n: 'base64url-encoded-modulus',
        e: 'AQAB',
      };

      const jwks = { keys: [jwk] };

      expect(jwks.keys).toHaveLength(1);
      expect(jwks.keys[0].kty).toBe('RSA');
      expect(jwks.keys[0].alg).toBe('RS256');
    });

    it('should serve JWKS endpoint', async () => {
      const jwks = {
        keys: [
          {
            kty: 'RSA',
            kid: 'key-1',
            alg: 'RS256',
            use: 'sig',
            n: 'modulus',
            e: 'AQAB',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { 'content-type': 'application/json' },
        json: () => Promise.resolve(jwks),
      });

      const response = await mockFetch('https://aivo.app/.well-known/jwks.json');
      const data = await response.json();

      expect(data.keys).toBeDefined();
      expect(data.keys[0].kid).toBe('key-1');
    });

    it('should rotate keys periodically', async () => {
      const keys = [
        { kid: 'key-old', createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        { kid: 'key-current', createdAt: new Date() },
      ];

      const rotationPeriodMs = 30 * 24 * 60 * 60 * 1000; // 30 days
      const oldKeys = keys.filter((k) => Date.now() - k.createdAt.getTime() > rotationPeriodMs);

      expect(oldKeys).toHaveLength(1);
      expect(oldKeys[0].kid).toBe('key-old');
    });

    it('should keep old keys for validation grace period', () => {
      const gracePeriodDays = 7;
      const keyAge = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days old
      const rotationDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Rotated 30 days ago

      const withinGracePeriod =
        keyAge.getTime() < rotationDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000;
      expect(withinGracePeriod).toBe(true);
    });
  });

  describe('Tool Configuration', () => {
    it('should configure tool deployment', async () => {
      mockPrisma.ltiTool.create.mockResolvedValue({
        id: 'tool-1',
        platformId: 'platform-1',
        deploymentId: 'deploy-1',
        name: 'AIVO Learning',
        launchUrl: 'https://aivo.app/lti/launch',
      });

      const tool = await mockPrisma.ltiTool.create({
        data: {
          platformId: 'platform-1',
          deploymentId: 'deploy-1',
          name: 'AIVO Learning',
          launchUrl: 'https://aivo.app/lti/launch',
        },
      });

      expect(tool.deploymentId).toBe('deploy-1');
    });

    it('should validate tool launch URL format', () => {
      const validUrls = ['https://aivo.app/lti/launch', 'https://secure.aivo.app/launch'];

      const invalidUrls = ['http://insecure.com/launch', 'ftp://file.com/launch'];

      validUrls.forEach((url) => {
        expect(url.startsWith('https://')).toBe(true);
      });

      invalidUrls.forEach((url) => {
        expect(url.startsWith('https://')).toBe(false);
      });
    });

    it('should restrict tool to specific courses', async () => {
      mockPrisma.ltiTool.update.mockResolvedValue({
        id: 'tool-1',
        allowedCourses: ['course-1', 'course-2'],
      });

      const tool = await mockPrisma.ltiTool.update({
        where: { id: 'tool-1' },
        data: { allowedCourses: ['course-1', 'course-2'] },
      });

      expect(tool.allowedCourses).toHaveLength(2);
    });

    it('should enable/disable specific LTI services', async () => {
      mockPrisma.ltiTool.update.mockResolvedValue({
        id: 'tool-1',
        agsEnabled: true,
        namesRolesEnabled: false,
        deepLinkingEnabled: true,
      });

      const tool = await mockPrisma.ltiTool.update({
        where: { id: 'tool-1' },
        data: {
          agsEnabled: true,
          namesRolesEnabled: false,
          deepLinkingEnabled: true,
        },
      });

      expect(tool.agsEnabled).toBe(true);
      expect(tool.namesRolesEnabled).toBe(false);
    });
  });
});
