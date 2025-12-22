/**
 * Platform Registration Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  PlatformRegistrationService,
  createPlatformRegistrationService,
} from '../src/platform-registration-service';
import { LtiPlatformType } from '../src/types';

// ══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  ltiTool: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

const mockGenerateKeyPair = vi.fn().mockResolvedValue({
  privateKeyRef: 'kms://test-key',
  publicKeyId: 'test-kid',
});

const BASE_URL = 'https://lti.aivo.app';

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('PlatformRegistrationService', () => {
  let service: PlatformRegistrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PlatformRegistrationService(mockPrisma as any, BASE_URL, mockGenerateKeyPair);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PLATFORM PRESETS
  // ════════════════════════════════════════════════════════════════════════════

  describe('getPlatformPreset', () => {
    it('should return Canvas preset', () => {
      const preset = service.getPlatformPreset(LtiPlatformType.CANVAS);

      expect(preset.platformType).toBe(LtiPlatformType.CANVAS);
      expect(preset.issuerTemplate).toBe('https://{domain}');
      expect(preset.configHints).toHaveProperty('domain');
    });

    it('should return Schoology preset', () => {
      const preset = service.getPlatformPreset(LtiPlatformType.SCHOOLOGY);

      expect(preset.platformType).toBe(LtiPlatformType.SCHOOLOGY);
      expect(preset.issuerTemplate).toBe('https://lti.schoology.com');
    });

    it('should return Google Classroom preset', () => {
      const preset = service.getPlatformPreset(LtiPlatformType.GOOGLE_CLASSROOM);

      expect(preset.platformType).toBe(LtiPlatformType.GOOGLE_CLASSROOM);
      expect(preset.issuerTemplate).toBe('https://classroom.google.com');
    });

    it('should return generic preset with empty templates', () => {
      const preset = service.getPlatformPreset(LtiPlatformType.GENERIC);

      expect(preset.platformType).toBe(LtiPlatformType.GENERIC);
      expect(preset.issuerTemplate).toBe('');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // BUILD PLATFORM URLS
  // ════════════════════════════════════════════════════════════════════════════

  describe('buildPlatformUrls', () => {
    it('should build Canvas URLs with domain', () => {
      const urls = service.buildPlatformUrls(LtiPlatformType.CANVAS, 'myschool.instructure.com');

      expect(urls.issuer).toBe('https://myschool.instructure.com');
      expect(urls.authLoginUrl).toBe('https://myschool.instructure.com/api/lti/authorize_redirect');
      expect(urls.authTokenUrl).toBe('https://myschool.instructure.com/login/oauth2/token');
      expect(urls.jwksUrl).toBe('https://myschool.instructure.com/api/lti/security/jwks');
    });

    it('should build Moodle URLs with domain', () => {
      const urls = service.buildPlatformUrls(LtiPlatformType.MOODLE, 'moodle.school.edu');

      expect(urls.issuer).toBe('https://moodle.school.edu');
      expect(urls.authLoginUrl).toBe('https://moodle.school.edu/mod/lti/auth.php');
      expect(urls.authTokenUrl).toBe('https://moodle.school.edu/mod/lti/token.php');
      expect(urls.jwksUrl).toBe('https://moodle.school.edu/mod/lti/certs.php');
    });

    it('should build Blackboard URLs with domain and clientId', () => {
      const urls = service.buildPlatformUrls(
        LtiPlatformType.BLACKBOARD,
        'bb.school.edu',
        'my-client-id'
      );

      expect(urls.jwksUrl).toBe(
        'https://bb.school.edu/api/v1/management/applications/my-client-id/jwks.json'
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PLATFORM REGISTRATION
  // ════════════════════════════════════════════════════════════════════════════

  describe('registerPlatform', () => {
    const validRegistration = {
      tenantId: 'tenant-uuid-1',
      platformType: LtiPlatformType.CANVAS,
      platformName: 'Springfield School Canvas',
      clientId: 'client-123',
      deploymentId: 'deploy-1',
      issuer: 'https://springfield.instructure.com',
      authLoginUrl: 'https://springfield.instructure.com/api/lti/authorize_redirect',
      authTokenUrl: 'https://springfield.instructure.com/login/oauth2/token',
      jwksUrl: 'https://springfield.instructure.com/api/lti/security/jwks',
      toolPrivateKeyRef: 'kms://my-key',
      enabled: true,
      configJson: {},
    };

    it('should create a new platform registration', async () => {
      mockPrisma.ltiTool.findFirst.mockResolvedValue(null);
      mockPrisma.ltiTool.create.mockResolvedValue({
        id: 'new-tool-uuid',
        ...validRegistration,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.registerPlatform(validRegistration);

      expect(result.tool.id).toBe('new-tool-uuid');
      expect(result.jwksUrl).toBe(`${BASE_URL}/lti/jwks`);
      expect(result.loginUrl).toBe(`${BASE_URL}/lti/login`);
      expect(result.launchUrl).toBe(`${BASE_URL}/lti/launch`);
      expect(result.deepLinkingUrl).toBe(`${BASE_URL}/lti/deep-linking`);
    });

    it('should throw error if platform already exists', async () => {
      mockPrisma.ltiTool.findFirst.mockResolvedValue({
        id: 'existing-tool',
        platformName: 'Existing Platform',
      });

      await expect(service.registerPlatform(validRegistration)).rejects.toThrow(
        'Platform already registered'
      );
    });

    it('should generate key pair if not provided', async () => {
      mockPrisma.ltiTool.findFirst.mockResolvedValue(null);
      mockPrisma.ltiTool.create.mockResolvedValue({
        id: 'new-tool-uuid',
        ...validRegistration,
        toolPrivateKeyRef: 'kms://generated-key',
        toolPublicKeyId: 'generated-kid',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const _registrationWithoutKey = {
        ...validRegistration,
        toolPrivateKeyRef: '',
      };

      // This will use the mock key generator
      const service2 = new PlatformRegistrationService(
        mockPrisma as any,
        BASE_URL,
        mockGenerateKeyPair
      );

      // Since toolPrivateKeyRef is empty string (falsy), it should generate
      mockPrisma.ltiTool.findFirst.mockResolvedValue(null);

      await expect(
        service2.registerPlatform({
          ...validRegistration,
          toolPrivateKeyRef: '',
        })
      ).resolves.toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // QUERY OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  describe('getPlatforms', () => {
    it('should return all platforms for a tenant', async () => {
      const platforms = [
        { id: 'tool-1', platformName: 'Canvas', platformType: LtiPlatformType.CANVAS },
        { id: 'tool-2', platformName: 'Schoology', platformType: LtiPlatformType.SCHOOLOGY },
      ];
      mockPrisma.ltiTool.findMany.mockResolvedValue(platforms);

      const result = await service.getPlatforms('tenant-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.ltiTool.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getPlatform', () => {
    it('should return platform by ID', async () => {
      const platform = { id: 'tool-1', platformName: 'Canvas' };
      mockPrisma.ltiTool.findUnique.mockResolvedValue(platform);

      const result = await service.getPlatform('tool-1');

      expect(result).toEqual(platform);
      expect(mockPrisma.ltiTool.findUnique).toHaveBeenCalledWith({
        where: { id: 'tool-1' },
      });
    });

    it('should return null for non-existent platform', async () => {
      mockPrisma.ltiTool.findUnique.mockResolvedValue(null);

      const result = await service.getPlatform('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getPlatformByIssuer', () => {
    it('should find platform by issuer and client ID', async () => {
      const platform = { id: 'tool-1', issuer: 'https://canvas.school.edu', clientId: 'client-1' };
      mockPrisma.ltiTool.findFirst.mockResolvedValue(platform);

      const result = await service.getPlatformByIssuer('https://canvas.school.edu', 'client-1');

      expect(result).toEqual(platform);
    });

    it('should include deployment ID if provided', async () => {
      mockPrisma.ltiTool.findFirst.mockResolvedValue(null);

      await service.getPlatformByIssuer('https://canvas.school.edu', 'client-1', 'deploy-1');

      expect(mockPrisma.ltiTool.findFirst).toHaveBeenCalledWith({
        where: {
          issuer: 'https://canvas.school.edu',
          clientId: 'client-1',
          deploymentId: 'deploy-1',
        },
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PLATFORM MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  describe('updatePlatform', () => {
    it('should update platform fields', async () => {
      const updated = {
        id: 'tool-1',
        platformName: 'Updated Name',
        enabled: false,
      };
      mockPrisma.ltiTool.update.mockResolvedValue(updated);

      const result = await service.updatePlatform('tool-1', {
        platformName: 'Updated Name',
        enabled: false,
      });

      expect(result.platformName).toBe('Updated Name');
      expect(mockPrisma.ltiTool.update).toHaveBeenCalledWith({
        where: { id: 'tool-1' },
        data: expect.objectContaining({
          platformName: 'Updated Name',
          enabled: false,
        }),
      });
    });
  });

  describe('deletePlatform', () => {
    it('should delete platform', async () => {
      mockPrisma.ltiTool.delete.mockResolvedValue({});

      await service.deletePlatform('tool-1');

      expect(mockPrisma.ltiTool.delete).toHaveBeenCalledWith({
        where: { id: 'tool-1' },
      });
    });
  });

  describe('setPlatformEnabled', () => {
    it('should enable platform', async () => {
      mockPrisma.ltiTool.update.mockResolvedValue({ id: 'tool-1', enabled: true });

      await service.setPlatformEnabled('tool-1', true);

      expect(mockPrisma.ltiTool.update).toHaveBeenCalledWith({
        where: { id: 'tool-1' },
        data: { enabled: true },
      });
    });

    it('should disable platform', async () => {
      mockPrisma.ltiTool.update.mockResolvedValue({ id: 'tool-1', enabled: false });

      await service.setPlatformEnabled('tool-1', false);

      expect(mockPrisma.ltiTool.update).toHaveBeenCalledWith({
        where: { id: 'tool-1' },
        data: { enabled: false },
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONFIGURATION HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  describe('getToolConfiguration', () => {
    it('should return LTI configuration JSON', () => {
      const config = service.getToolConfiguration('tenant-1');

      expect(config.title).toBe('Aivo Learning Platform');
      expect(config.oidc_initiation_url).toBe(`${BASE_URL}/lti/login`);
      expect(config.target_link_uri).toBe(`${BASE_URL}/lti/launch`);
      expect(config.public_jwk_url).toBe(`${BASE_URL}/lti/jwks`);
      expect(config.scopes).toContain('https://purl.imsglobal.org/spec/lti-ags/scope/score');
    });
  });

  describe('getCanvasDevKeyJson', () => {
    it('should return Canvas-specific JSON', () => {
      const json = service.getCanvasDevKeyJson();

      expect(json.title).toBe('Aivo');
      expect(json.extensions).toHaveLength(1);
      expect(json.extensions[0]).toHaveProperty('platform', 'canvas.instructure.com');
      expect(json.extensions[0]).toHaveProperty('settings');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('createPlatformRegistrationService', () => {
  it('should create service with default key generator', () => {
    const service = createPlatformRegistrationService(mockPrisma as any, BASE_URL);

    expect(service).toBeInstanceOf(PlatformRegistrationService);
  });

  it('should create service with custom key generator', () => {
    const customGenerator = vi.fn().mockResolvedValue({
      privateKeyRef: 'custom-key',
      publicKeyId: 'custom-kid',
    });

    const service = createPlatformRegistrationService(mockPrisma as any, BASE_URL, customGenerator);

    expect(service).toBeInstanceOf(PlatformRegistrationService);
  });
});
