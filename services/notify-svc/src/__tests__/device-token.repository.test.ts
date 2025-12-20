/**
 * Device Token Repository Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  deviceToken: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
};

vi.mock('../prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import after mocking
import * as deviceTokenRepo from '../repositories/device-token.repository.js';

describe('Device Token Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerDeviceToken', () => {
    it('should create a new token when it does not exist', async () => {
      const input = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        token: 'device-token-abc',
        platform: 'ios' as const,
        deviceId: 'device-id',
        appVersion: '1.0.0',
      };

      const createdToken = {
        id: 'token-id-1',
        ...input,
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(null);
      mockPrisma.deviceToken.create.mockResolvedValue(createdToken);
      mockPrisma.deviceToken.findMany.mockResolvedValue([createdToken]);

      const result = await deviceTokenRepo.registerDeviceToken(input);

      expect(result.id).toBe('token-id-1');
      expect(result.token).toBe(input.token);
      expect(mockPrisma.deviceToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: input.tenantId,
          userId: input.userId,
          token: input.token,
          platform: input.platform,
        }),
      });
    });

    it('should update existing token when it already exists', async () => {
      const existingToken = {
        id: 'token-id-1',
        tenantId: 'tenant-123',
        userId: 'user-old',
        token: 'device-token-abc',
        platform: 'ios',
        isActive: false,
        lastUsedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const updatedToken = {
        ...existingToken,
        userId: 'user-456',
        isActive: true,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.deviceToken.findUnique.mockResolvedValue(existingToken);
      mockPrisma.deviceToken.update.mockResolvedValue(updatedToken);

      const result = await deviceTokenRepo.registerDeviceToken({
        tenantId: 'tenant-123',
        userId: 'user-456',
        token: 'device-token-abc',
        platform: 'ios',
      });

      expect(result.userId).toBe('user-456');
      expect(result.isActive).toBe(true);
      expect(mockPrisma.deviceToken.update).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should update old token with new token value', async () => {
      const existingToken = {
        id: 'token-id-1',
        tenantId: 'tenant-123',
        userId: 'user-456',
        token: 'old-token',
        platform: 'ios',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedToken = {
        ...existingToken,
        token: 'new-token',
        updatedAt: new Date(),
      };

      mockPrisma.deviceToken.findFirst.mockResolvedValue(existingToken);
      mockPrisma.deviceToken.update.mockResolvedValue(updatedToken);

      const result = await deviceTokenRepo.refreshToken({
        oldToken: 'old-token',
        newToken: 'new-token',
        userId: 'user-456',
        tenantId: 'tenant-123',
      });

      expect(result?.token).toBe('new-token');
      expect(mockPrisma.deviceToken.update).toHaveBeenCalledWith({
        where: { id: existingToken.id },
        data: expect.objectContaining({
          token: 'new-token',
          isActive: true,
        }),
      });
    });

    it('should return null when old token not found', async () => {
      mockPrisma.deviceToken.findFirst.mockResolvedValue(null);

      const result = await deviceTokenRepo.refreshToken({
        oldToken: 'non-existent-token',
        newToken: 'new-token',
        userId: 'user-456',
        tenantId: 'tenant-123',
      });

      expect(result).toBeNull();
    });
  });

  describe('getActiveTokensForUser', () => {
    it('should return active tokens ordered by lastUsedAt', async () => {
      const tokens = [
        { id: '1', token: 'token-1', lastUsedAt: new Date('2024-02-01') },
        { id: '2', token: 'token-2', lastUsedAt: new Date('2024-01-01') },
      ];

      mockPrisma.deviceToken.findMany.mockResolvedValue(tokens);

      const result = await deviceTokenRepo.getActiveTokensForUser('user-123', 'tenant-123');

      expect(result).toHaveLength(2);
      expect(mockPrisma.deviceToken.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          tenantId: 'tenant-123',
          isActive: true,
        },
        orderBy: { lastUsedAt: 'desc' },
      });
    });
  });

  describe('deactivateToken', () => {
    it('should mark token as inactive', async () => {
      mockPrisma.deviceToken.update.mockResolvedValue({
        id: 'token-1',
        isActive: false,
      });

      const result = await deviceTokenRepo.deactivateToken('device-token-abc');

      expect(result).toBe(true);
      expect(mockPrisma.deviceToken.update).toHaveBeenCalledWith({
        where: { token: 'device-token-abc' },
        data: { isActive: false },
      });
    });
  });

  describe('pruneStaleTokens', () => {
    it('should delete tokens not used in 60 days', async () => {
      mockPrisma.deviceToken.deleteMany.mockResolvedValue({ count: 5 });

      const result = await deviceTokenRepo.pruneStaleTokens();

      expect(result).toBe(5);
      expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: expect.arrayContaining([
            expect.objectContaining({ lastUsedAt: expect.any(Object) }),
          ]),
        },
      });
    });
  });
});
