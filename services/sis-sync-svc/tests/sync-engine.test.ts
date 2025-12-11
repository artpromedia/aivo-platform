/**
 * SIS Sync Engine Integration Tests
 * 
 * Tests for idempotency, upsert logic, and soft deletes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient, SisProviderType, SyncStatus } from '@prisma/client';
import { SyncEngine } from '../src/sync/engine';
import { ISisProvider, SisSchool, SisClass, SisUser, SisEnrollment, SyncEntityResult } from '../src/providers/types';

// Mock Prisma Client
const mockPrismaClient = {
  sisProvider: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  sisSyncRun: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
  },
  sisRawSchool: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  sisRawClass: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  sisRawUser: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  sisRawEnrollment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
} as unknown as PrismaClient;

// Mock Provider
class MockProvider implements ISisProvider {
  readonly providerType = 'CLEVER' as const;
  
  private schools: SisSchool[] = [];
  private classes: SisClass[] = [];
  private users: SisUser[] = [];
  private enrollments: SisEnrollment[] = [];
  
  setData(data: { schools?: SisSchool[]; classes?: SisClass[]; users?: SisUser[]; enrollments?: SisEnrollment[] }) {
    if (data.schools) this.schools = data.schools;
    if (data.classes) this.classes = data.classes;
    if (data.users) this.users = data.users;
    if (data.enrollments) this.enrollments = data.enrollments;
  }
  
  async initialize(): Promise<void> {}
  
  async testConnection(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Mock connection successful' };
  }
  
  async fetchSchools(): Promise<SyncEntityResult<SisSchool>> {
    return { entities: this.schools, count: this.schools.length, hasMore: false, warnings: [] };
  }
  
  async fetchClasses(): Promise<SyncEntityResult<SisClass>> {
    return { entities: this.classes, count: this.classes.length, hasMore: false, warnings: [] };
  }
  
  async fetchUsers(): Promise<SyncEntityResult<SisUser>> {
    return { entities: this.users, count: this.users.length, hasMore: false, warnings: [] };
  }
  
  async fetchEnrollments(): Promise<SyncEntityResult<SisEnrollment>> {
    return { entities: this.enrollments, count: this.enrollments.length, hasMore: false, warnings: [] };
  }
  
  async cleanup(): Promise<void> {}
}

// Mock the provider factory
vi.mock('../src/providers', () => ({
  createAndInitializeProvider: vi.fn(),
  validateProviderConfig: vi.fn().mockReturnValue({ valid: true, errors: [] }),
}));

describe('SyncEngine', () => {
  let engine: SyncEngine;
  let mockProvider: MockProvider;
  
  beforeEach(() => {
    vi.clearAllMocks();
    engine = new SyncEngine(mockPrismaClient);
    mockProvider = new MockProvider();
    
    // Setup default mock returns
    mockPrismaClient.sisProvider.findUnique = vi.fn().mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-1',
      providerType: 'CLEVER',
      configJson: '{}',
      enabled: true,
    });
    
    mockPrismaClient.sisSyncRun.create = vi.fn().mockResolvedValue({
      id: 'run-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      status: 'IN_PROGRESS',
    });
    
    mockPrismaClient.sisRawSchool.updateMany = vi.fn().mockResolvedValue({ count: 0 });
    mockPrismaClient.sisRawClass.updateMany = vi.fn().mockResolvedValue({ count: 0 });
    mockPrismaClient.sisRawUser.updateMany = vi.fn().mockResolvedValue({ count: 0 });
    mockPrismaClient.sisRawEnrollment.updateMany = vi.fn().mockResolvedValue({ count: 0 });
    
    mockPrismaClient.sisRawSchool.count = vi.fn().mockResolvedValue(0);
    mockPrismaClient.sisRawClass.count = vi.fn().mockResolvedValue(0);
    mockPrismaClient.sisRawUser.count = vi.fn().mockResolvedValue(0);
    mockPrismaClient.sisRawEnrollment.count = vi.fn().mockResolvedValue(0);
    
    // Mock provider creation
    const { createAndInitializeProvider } = require('../src/providers');
    createAndInitializeProvider.mockResolvedValue(mockProvider);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('executeSync', () => {
    it('should create a sync run record', async () => {
      mockProvider.setData({ schools: [], classes: [], users: [], enrollments: [] });
      
      await engine.executeSync('tenant-1', 'provider-1');
      
      expect(mockPrismaClient.sisSyncRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          providerId: 'provider-1',
          status: 'IN_PROGRESS',
        }),
      });
    });
    
    it('should update sync run status to SUCCESS when no errors', async () => {
      mockProvider.setData({ schools: [], classes: [], users: [], enrollments: [] });
      
      await engine.executeSync('tenant-1', 'provider-1');
      
      expect(mockPrismaClient.sisSyncRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SUCCESS',
          }),
        })
      );
    });
    
    it('should fail if provider is disabled', async () => {
      mockPrismaClient.sisProvider.findUnique = vi.fn().mockResolvedValue({
        id: 'provider-1',
        tenantId: 'tenant-1',
        providerType: 'CLEVER',
        configJson: '{}',
        enabled: false,
      });
      
      const result = await engine.executeSync('tenant-1', 'provider-1');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Provider provider-1 is disabled');
    });
    
    it('should fail if provider not found', async () => {
      mockPrismaClient.sisProvider.findUnique = vi.fn().mockResolvedValue(null);
      
      const result = await engine.executeSync('tenant-1', 'provider-1');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Provider provider-1 not found');
    });
  });
  
  describe('Idempotency', () => {
    it('should produce same results when run twice with same data', async () => {
      const schools: SisSchool[] = [
        {
          externalId: 'school-1',
          name: 'Test School',
          isActive: true,
          rawData: { id: 'school-1', name: 'Test School' },
        },
      ];
      
      mockProvider.setData({ schools, classes: [], users: [], enrollments: [] });
      
      // First run - create
      mockPrismaClient.sisRawSchool.findUnique = vi.fn().mockResolvedValue(null);
      mockPrismaClient.sisRawSchool.create = vi.fn().mockResolvedValue({ id: 'raw-1' });
      
      const result1 = await engine.executeSync('tenant-1', 'provider-1');
      
      expect(result1.stats.schools.created).toBe(1);
      expect(result1.stats.schools.updated).toBe(0);
      
      // Second run - update (same data exists)
      mockPrismaClient.sisRawSchool.findUnique = vi.fn().mockResolvedValue({
        id: 'raw-1',
        externalId: 'school-1',
        name: 'Test School',
      });
      mockPrismaClient.sisRawSchool.update = vi.fn().mockResolvedValue({ id: 'raw-1' });
      
      // Need to create a new engine instance since the first one cleaned up the provider
      const engine2 = new SyncEngine(mockPrismaClient);
      const result2 = await engine2.executeSync('tenant-1', 'provider-1');
      
      expect(result2.stats.schools.created).toBe(0);
      expect(result2.stats.schools.updated).toBe(1);
    });
    
    it('should handle duplicate external IDs correctly', async () => {
      const users: SisUser[] = [
        {
          externalId: 'user-1',
          role: 'student',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          schoolExternalIds: ['school-1'],
          isActive: true,
          rawData: {},
        },
        // Duplicate - should be handled gracefully
        {
          externalId: 'user-1',
          role: 'student',
          firstName: 'John',
          lastName: 'Doe Updated',
          email: 'john@example.com',
          schoolExternalIds: ['school-1'],
          isActive: true,
          rawData: {},
        },
      ];
      
      mockProvider.setData({ schools: [], classes: [], users, enrollments: [] });
      
      // First call returns null (create), second returns existing (update)
      let callCount = 0;
      mockPrismaClient.sisRawUser.findUnique = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(null);
        return Promise.resolve({ id: 'raw-1', externalId: 'user-1' });
      });
      
      mockPrismaClient.sisRawUser.create = vi.fn().mockResolvedValue({ id: 'raw-1' });
      mockPrismaClient.sisRawUser.update = vi.fn().mockResolvedValue({ id: 'raw-1' });
      
      const result = await engine.executeSync('tenant-1', 'provider-1');
      
      // Should have 1 created and 1 updated (the duplicate)
      expect(result.stats.users.created).toBe(1);
      expect(result.stats.users.updated).toBe(1);
    });
  });
  
  describe('Soft Deletes', () => {
    it('should track deactivated records', async () => {
      // Start with 3 schools in raw table, but only 2 in current sync
      mockPrismaClient.sisRawSchool.count = vi.fn().mockResolvedValue(1); // 1 not processed
      mockPrismaClient.sisRawClass.count = vi.fn().mockResolvedValue(0);
      mockPrismaClient.sisRawUser.count = vi.fn().mockResolvedValue(2); // 2 not processed
      mockPrismaClient.sisRawEnrollment.count = vi.fn().mockResolvedValue(0);
      
      mockProvider.setData({ schools: [], classes: [], users: [], enrollments: [] });
      
      const result = await engine.executeSync('tenant-1', 'provider-1');
      
      expect(result.stats.schools.deactivated).toBe(1);
      expect(result.stats.users.deactivated).toBe(2);
    });
  });
  
  describe('Error Handling', () => {
    it('should continue on individual entity errors when configured', async () => {
      const schools: SisSchool[] = [
        { externalId: 'school-1', name: 'School 1', isActive: true, rawData: {} },
        { externalId: 'school-2', name: 'School 2', isActive: true, rawData: {} },
        { externalId: 'school-3', name: 'School 3', isActive: true, rawData: {} },
      ];
      
      mockProvider.setData({ schools, classes: [], users: [], enrollments: [] });
      
      let createCount = 0;
      mockPrismaClient.sisRawSchool.findUnique = vi.fn().mockResolvedValue(null);
      mockPrismaClient.sisRawSchool.create = vi.fn().mockImplementation(() => {
        createCount++;
        if (createCount === 2) {
          return Promise.reject(new Error('Database error'));
        }
        return Promise.resolve({ id: `raw-${createCount}` });
      });
      
      const result = await engine.executeSync('tenant-1', 'provider-1', undefined, false, {
        continueOnError: true,
      });
      
      expect(result.stats.schools.created).toBe(2);
      expect(result.stats.schools.errors).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should mark sync as PARTIAL when there are errors but sync completes', async () => {
      const schools: SisSchool[] = [
        { externalId: 'school-1', name: 'School 1', isActive: true, rawData: {} },
      ];
      
      mockProvider.setData({ schools, classes: [], users: [], enrollments: [] });
      
      mockPrismaClient.sisRawSchool.findUnique = vi.fn().mockResolvedValue(null);
      mockPrismaClient.sisRawSchool.create = vi.fn().mockRejectedValue(new Error('DB error'));
      
      const result = await engine.executeSync('tenant-1', 'provider-1', undefined, false, {
        continueOnError: true,
      });
      
      expect(mockPrismaClient.sisSyncRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PARTIAL',
          }),
        })
      );
    });
  });
});

describe('Provider Types', () => {
  describe('SisSchool', () => {
    it('should have required fields', () => {
      const school: SisSchool = {
        externalId: 'ext-123',
        name: 'Test School',
        isActive: true,
        rawData: { source: 'test' },
      };
      
      expect(school.externalId).toBeDefined();
      expect(school.name).toBeDefined();
      expect(school.isActive).toBeDefined();
      expect(school.rawData).toBeDefined();
    });
  });
  
  describe('SisUser', () => {
    it('should support all role types', () => {
      const roles: SisUser['role'][] = ['teacher', 'student', 'administrator', 'aide', 'parent', 'guardian'];
      
      roles.forEach((role) => {
        const user: SisUser = {
          externalId: 'user-1',
          role,
          firstName: 'Test',
          lastName: 'User',
          schoolExternalIds: [],
          isActive: true,
          rawData: {},
        };
        expect(user.role).toBe(role);
      });
    });
  });
});
