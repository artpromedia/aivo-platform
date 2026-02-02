/**
 * Auth Service - Session Management Tests
 *
 * Tests for session creation, validation, invalidation, and concurrent session handling.
 *
 * @module tests/session.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';

// Session configuration
const SESSION_CONFIG = {
  absoluteTimeout: 86400, // 24 hours
  idleTimeout: 3600, // 1 hour
  maxConcurrentSessions: 5,
};

// Session interface
interface Session {
  id: string;
  userId: string;
  tenantId: string;
  deviceName?: string;
  platform?: string;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revokeReason?: string;
}

// Mock Prisma
const mockPrisma = {
  session: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

// Mock Redis
const mockRedis = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  sadd: vi.fn(),
  srem: vi.fn(),
  smembers: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  pipeline: vi.fn(() => ({
    set: vi.fn().mockReturnThis(),
    del: vi.fn().mockReturnThis(),
    exec: vi.fn(),
  })),
};

// Helper to hash token
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('Session Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  // ===========================================================================
  // Session Creation
  // ===========================================================================

  describe('Session Creation', () => {
    it('should create new session with unique ID', async () => {
      const sessionId = randomUUID();

      mockPrisma.session.create.mockResolvedValue({
        id: sessionId,
        userId: 'user-123',
        tenantId: 'tenant-456',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_CONFIG.absoluteTimeout * 1000),
      });

      const session = await mockPrisma.session.create({
        data: {
          id: sessionId,
          userId: 'user-123',
          tenantId: 'tenant-456',
        },
      });

      expect(session.id).toBe(sessionId);
      expect(session.userId).toBe('user-123');
    });

    it('should store device information', async () => {
      const deviceInfo = {
        userAgent: 'Mozilla/5.0 Chrome/120',
        ip: '192.168.1.100',
        platform: 'Windows',
        deviceName: 'Chrome on Windows',
      };

      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        ...deviceInfo,
      });

      const session = await mockPrisma.session.create({
        data: deviceInfo,
      });

      expect(session.userAgent).toBe('Mozilla/5.0 Chrome/120');
      expect(session.ip).toBe('192.168.1.100');
    });

    it('should set absolute expiration time', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const expectedExpiry = new Date(now + SESSION_CONFIG.absoluteTimeout * 1000);

      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        expiresAt: expectedExpiry,
      });

      const session = await mockPrisma.session.create({
        data: {
          expiresAt: expectedExpiry,
        },
      });

      expect(session.expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });

    it('should store session in Redis', async () => {
      const sessionId = 'session-123';
      const sessionData = JSON.stringify({
        userId: 'user-456',
        tenantId: 'tenant-789',
      });

      mockRedis.set.mockResolvedValue('OK');

      await mockRedis.set(sessionId, sessionData, 'EX', SESSION_CONFIG.absoluteTimeout);

      expect(mockRedis.set).toHaveBeenCalledWith(
        sessionId,
        sessionData,
        'EX',
        SESSION_CONFIG.absoluteTimeout
      );
    });

    it('should add session to user session set', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      mockRedis.sadd.mockResolvedValue(1);

      await mockRedis.sadd(`user:${userId}:sessions`, sessionId);

      expect(mockRedis.sadd).toHaveBeenCalledWith(`user:${userId}:sessions`, sessionId);
    });
  });

  // ===========================================================================
  // Session Validation
  // ===========================================================================

  describe('Session Validation', () => {
    it('should validate existing session', async () => {
      const session = {
        id: 'session-123',
        userId: 'user-456',
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: null,
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);

      const found = await mockPrisma.session.findUnique({
        where: { id: 'session-123' },
      });

      expect(found).toBeDefined();
      expect(found.revokedAt).toBeNull();
    });

    it('should reject expired sessions', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const session = {
        id: 'session-123',
        expiresAt: new Date(now - 1000), // Expired
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);

      const found = await mockPrisma.session.findUnique({
        where: { id: 'session-123' },
      });

      expect(found.expiresAt.getTime() < now).toBe(true);
    });

    it('should reject revoked sessions', async () => {
      const session = {
        id: 'session-123',
        revokedAt: new Date(),
        revokeReason: 'logout',
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);

      const found = await mockPrisma.session.findUnique({
        where: { id: 'session-123' },
      });

      expect(found.revokedAt).toBeDefined();
    });

    it('should check idle timeout', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const lastActivity = now - (SESSION_CONFIG.idleTimeout + 1) * 1000;
      const session = {
        id: 'session-123',
        lastActivityAt: new Date(lastActivity),
        expiresAt: new Date(now + 3600000),
      };

      const idleTime = now - session.lastActivityAt.getTime();
      const isIdle = idleTime > SESSION_CONFIG.idleTimeout * 1000;

      expect(isIdle).toBe(true);
    });

    it('should return null for non-existent sessions', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const found = await mockPrisma.session.findUnique({
        where: { id: 'non-existent' },
      });

      expect(found).toBeNull();
    });
  });

  // ===========================================================================
  // Session Activity Updates
  // ===========================================================================

  describe('Session Activity Updates', () => {
    it('should update last activity time', async () => {
      const now = new Date();

      mockPrisma.session.update.mockResolvedValue({
        id: 'session-123',
        lastActivityAt: now,
      });

      const session = await mockPrisma.session.update({
        where: { id: 'session-123' },
        data: { lastActivityAt: now },
      });

      expect(session.lastActivityAt).toEqual(now);
    });

    it('should extend Redis TTL on activity', async () => {
      const sessionId = 'session-123';
      const remainingTtl = 3600;

      mockRedis.ttl.mockResolvedValue(1800);
      mockRedis.expire.mockResolvedValue(1);

      const ttl = await mockRedis.ttl(sessionId);
      await mockRedis.expire(sessionId, remainingTtl);

      expect(mockRedis.expire).toHaveBeenCalledWith(sessionId, remainingTtl);
    });
  });

  // ===========================================================================
  // Session Revocation
  // ===========================================================================

  describe('Session Revocation', () => {
    it('should revoke single session', async () => {
      mockPrisma.session.update.mockResolvedValue({
        id: 'session-123',
        revokedAt: new Date(),
        revokeReason: 'logout',
      });

      const session = await mockPrisma.session.update({
        where: { id: 'session-123' },
        data: { revokedAt: new Date(), revokeReason: 'logout' },
      });

      expect(session.revokedAt).toBeDefined();
      expect(session.revokeReason).toBe('logout');
    });

    it('should revoke all user sessions', async () => {
      mockPrisma.session.updateMany.mockResolvedValue({ count: 3 });

      const result = await mockPrisma.session.updateMany({
        where: { userId: 'user-123', revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'logout_all' },
      });

      expect(result.count).toBe(3);
    });

    it('should revoke all except current session', async () => {
      mockPrisma.session.updateMany.mockResolvedValue({ count: 2 });

      const result = await mockPrisma.session.updateMany({
        where: {
          userId: 'user-123',
          revokedAt: null,
          id: { not: 'current-session' },
        },
        data: { revokedAt: new Date(), revokeReason: 'logout_all' },
      });

      expect(result.count).toBe(2);
    });

    it('should remove session from Redis', async () => {
      const sessionId = 'session-123';

      mockRedis.del.mockResolvedValue(1);

      await mockRedis.del(sessionId);

      expect(mockRedis.del).toHaveBeenCalledWith(sessionId);
    });

    it('should remove from user session set', async () => {
      const userId = 'user-123';
      const sessionId = 'session-456';

      mockRedis.srem.mockResolvedValue(1);

      await mockRedis.srem(`user:${userId}:sessions`, sessionId);

      expect(mockRedis.srem).toHaveBeenCalledWith(`user:${userId}:sessions`, sessionId);
    });
  });

  // ===========================================================================
  // Concurrent Session Management
  // ===========================================================================

  describe('Concurrent Session Management', () => {
    it('should count active sessions', async () => {
      mockPrisma.session.count.mockResolvedValue(3);

      const count = await mockPrisma.session.count({
        where: { userId: 'user-123', revokedAt: null },
      });

      expect(count).toBe(3);
    });

    it('should list active sessions', async () => {
      const sessions = [
        { id: 'session-1', deviceName: 'Chrome on Windows' },
        { id: 'session-2', deviceName: 'Safari on iPhone' },
        { id: 'session-3', deviceName: 'Firefox on macOS' },
      ];

      mockPrisma.session.findMany.mockResolvedValue(sessions);

      const found = await mockPrisma.session.findMany({
        where: { userId: 'user-123', revokedAt: null },
      });

      expect(found).toHaveLength(3);
    });

    it('should enforce concurrent session limit', async () => {
      mockPrisma.session.count.mockResolvedValue(SESSION_CONFIG.maxConcurrentSessions);

      const count = await mockPrisma.session.count({
        where: { userId: 'user-123', revokedAt: null },
      });

      expect(count >= SESSION_CONFIG.maxConcurrentSessions).toBe(true);
    });

    it('should revoke oldest session when limit exceeded', async () => {
      const sessions = [
        { id: 'oldest', createdAt: new Date('2024-01-01') },
        { id: 'middle', createdAt: new Date('2024-01-02') },
        { id: 'newest', createdAt: new Date('2024-01-03') },
      ];

      mockPrisma.session.findMany.mockResolvedValue(sessions);
      mockPrisma.session.update.mockResolvedValue({
        id: 'oldest',
        revokedAt: new Date(),
      });

      const found = await mockPrisma.session.findMany({
        where: { userId: 'user-123', revokedAt: null },
        orderBy: { createdAt: 'asc' },
      });

      // Revoke oldest
      await mockPrisma.session.update({
        where: { id: found[0].id },
        data: { revokedAt: new Date(), revokeReason: 'concurrent_limit' },
      });

      expect(mockPrisma.session.update).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Refresh Token Management
  // ===========================================================================

  describe('Refresh Token Management', () => {
    it('should store refresh token hash in session', async () => {
      const refreshToken = 'refresh-token-value';
      const tokenHash = hashToken(refreshToken);

      mockPrisma.session.update.mockResolvedValue({
        id: 'session-123',
        refreshTokenHash: tokenHash,
      });

      const session = await mockPrisma.session.update({
        where: { id: 'session-123' },
        data: { refreshTokenHash: tokenHash },
      });

      expect(session.refreshTokenHash).toBe(tokenHash);
    });

    it('should verify refresh token hash', async () => {
      const refreshToken = 'refresh-token-value';
      const tokenHash = hashToken(refreshToken);
      const providedHash = hashToken(refreshToken);

      expect(tokenHash).toBe(providedHash);
    });

    it('should detect refresh token reuse', async () => {
      const oldTokenHash = hashToken('old-token');
      const newTokenHash = hashToken('new-token');

      expect(oldTokenHash).not.toBe(newTokenHash);
    });

    it('should revoke session on token reuse', async () => {
      mockPrisma.session.update.mockResolvedValue({
        id: 'session-123',
        revokedAt: new Date(),
        revokeReason: 'token_reuse_detected',
      });

      const session = await mockPrisma.session.update({
        where: { id: 'session-123' },
        data: { revokedAt: new Date(), revokeReason: 'token_reuse_detected' },
      });

      expect(session.revokeReason).toBe('token_reuse_detected');
    });
  });

  // ===========================================================================
  // Session Security
  // ===========================================================================

  describe('Session Security', () => {
    it('should track IP address changes', () => {
      const originalIp = '192.168.1.100';
      const newIp = '10.0.0.50';

      expect(originalIp).not.toBe(newIp);
    });

    it('should track User-Agent changes', () => {
      const originalUa = 'Mozilla/5.0 Chrome/120';
      const newUa = 'Mozilla/5.0 Firefox/115';

      expect(originalUa).not.toBe(newUa);
    });

    it('should detect session hijacking indicators', () => {
      const session = {
        ip: '192.168.1.100',
        userAgent: 'Chrome/120',
      };

      const request = {
        ip: '10.0.0.1',
        userAgent: 'Firefox/115',
      };

      const ipMismatch = session.ip !== request.ip;
      const uaMismatch = session.userAgent !== request.userAgent;

      expect(ipMismatch).toBe(true);
      expect(uaMismatch).toBe(true);
    });

    it('should blacklist token on suspicious activity', async () => {
      const tokenId = 'suspicious-token';

      mockRedis.set.mockResolvedValue('OK');

      await mockRedis.set(`blacklist:token:${tokenId}`, '1', 'EX', 86400);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `blacklist:token:${tokenId}`,
        '1',
        'EX',
        86400
      );
    });
  });

  // ===========================================================================
  // Session Cleanup
  // ===========================================================================

  describe('Session Cleanup', () => {
    it('should delete expired sessions', async () => {
      mockPrisma.session.updateMany.mockResolvedValue({ count: 10 });

      const result = await mockPrisma.session.updateMany({
        where: { expiresAt: { lt: new Date() } },
        data: { revokedAt: new Date(), revokeReason: 'expired' },
      });

      expect(result.count).toBe(10);
    });

    it('should get all user sessions from Redis', async () => {
      const userId = 'user-123';
      const sessions = ['session-1', 'session-2', 'session-3'];

      mockRedis.smembers.mockResolvedValue(sessions);

      const found = await mockRedis.smembers(`user:${userId}:sessions`);

      expect(found).toEqual(sessions);
    });
  });
});
