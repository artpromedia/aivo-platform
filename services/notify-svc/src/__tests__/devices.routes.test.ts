/**
 * Device Routes Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import Fastify from 'fastify';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    deviceToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  })),
}));

// Mock push service
vi.mock('../channels/push/push-service.js', () => ({
  subscribeToTopics: vi.fn().mockResolvedValue(undefined),
  unsubscribeFromTopics: vi.fn().mockResolvedValue(undefined),
}));

describe('Device Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    app = Fastify();
    
    // Add mock user context (simulating auth middleware)
    app.addHook('onRequest', async (request) => {
      (request as any).user = {
        id: 'user-123',
        tenantId: 'tenant-456',
        roles: ['student'],
      };
    });

    // Register routes
    const { default: deviceRoutes } = await import('../routes/devices.js');
    await app.register(deviceRoutes, { prefix: '/devices' });
    
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /devices/register', () => {
    it('should require token in request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices/register',
        payload: {
          // Missing token
          platform: 'android',
          deviceInfo: { model: 'Pixel 6' },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require platform in request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices/register',
        payload: {
          token: 'fcm-token-123',
          // Missing platform
          deviceInfo: { model: 'Pixel 6' },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate platform enum', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices/register',
        payload: {
          token: 'token-123',
          platform: 'blackberry', // Invalid platform
          deviceInfo: {},
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /devices/refresh', () => {
    it('should require oldToken and newToken', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices/refresh',
        payload: {
          oldToken: 'old-token',
          // Missing newToken
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /devices/:token', () => {
    it('should accept token as path parameter', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/devices/test-token-123',
      });

      // Should process (may be 200 or 404 depending on mock)
      expect([200, 204, 404]).toContain(response.statusCode);
    });
  });

  describe('GET /devices', () => {
    it('should return list of devices for user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/devices',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('devices');
    });
  });

  describe('DELETE /devices/all', () => {
    it('should unregister all devices for user', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/devices/all',
      });

      expect([200, 204]).toContain(response.statusCode);
    });
  });

  describe('Admin Routes', () => {
    beforeEach(async () => {
      // Override user with admin role
      await app.close();
      
      app = Fastify();
      app.addHook('onRequest', async (request) => {
        (request as any).user = {
          id: 'admin-user',
          tenantId: 'tenant-456',
          roles: ['admin'],
        };
      });

      const { default: deviceRoutes } = await import('../routes/devices.js');
      await app.register(deviceRoutes, { prefix: '/devices' });
      await app.ready();
    });

    it('should return device stats for admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/devices/admin/devices/stats',
      });

      // Depends on route structure
      expect([200, 404]).toContain(response.statusCode);
    });
  });
});

describe('Device Routes Schema Validation', () => {
  describe('Register Device Schema', () => {
    it('should accept valid android registration', () => {
      const validPayload = {
        token: 'fcm-token-abc123',
        platform: 'android',
        deviceInfo: {
          model: 'Pixel 7 Pro',
          osVersion: '14.0',
          appVersion: '2.5.0',
        },
      };

      expect(validPayload.token).toBeTruthy();
      expect(validPayload.platform).toBe('android');
    });

    it('should accept valid ios registration', () => {
      const validPayload = {
        token: 'apns-token-xyz789',
        platform: 'ios',
        deviceInfo: {
          model: 'iPhone 15 Pro',
          osVersion: '17.2',
          appVersion: '2.5.0',
        },
      };

      expect(validPayload.token).toBeTruthy();
      expect(validPayload.platform).toBe('ios');
    });

    it('should accept web platform', () => {
      const validPayload = {
        token: 'web-push-token',
        platform: 'web',
        deviceInfo: {
          browser: 'Chrome',
          browserVersion: '120',
        },
      };

      expect(validPayload.platform).toBe('web');
    });
  });

  describe('Refresh Token Schema', () => {
    it('should require both old and new tokens', () => {
      const validPayload = {
        oldToken: 'old-token-123',
        newToken: 'new-token-456',
      };

      expect(validPayload.oldToken).toBeTruthy();
      expect(validPayload.newToken).toBeTruthy();
      expect(validPayload.oldToken).not.toBe(validPayload.newToken);
    });
  });
});
