/**
 * Scheduler Tests
 * 
 * Tests for the sync scheduler and job management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { SyncScheduler, getSchedulePreset, isValidCronExpression } from '../src/scheduler';

// Create spies for node-cron using vi.hoisted() so they're available before module loads
const { mockCronSchedule, mockCronValidate } = vi.hoisted(() => ({
  mockCronSchedule: vi.fn(() => ({
    stop: vi.fn(),
  })),
  mockCronValidate: vi.fn((expr: string) => {
    // Simple validation for common cron expressions
    const parts = expr.split(' ');
    return parts.length === 5;
  }),
}));

// Mock node-cron
vi.mock('node-cron', () => ({
  validate: mockCronValidate,
  schedule: mockCronSchedule,
}));

// Mock Prisma
const mockPrismaClient = {
  sisProvider: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  sisSyncRun: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
  },
  sisRawSchool: {
    updateMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  sisRawClass: {
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  sisRawUser: {
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  sisRawEnrollment: {
    updateMany: vi.fn(),
    count: vi.fn(),
  },
} as unknown as PrismaClient;

describe('SyncScheduler', () => {
  let scheduler: SyncScheduler;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the cron mock to default behavior
    mockCronSchedule.mockImplementation(() => ({
      stop: vi.fn(),
    }));
    scheduler = new SyncScheduler(mockPrismaClient, { autoStart: false });

    mockPrismaClient.sisRawSchool.count = vi.fn().mockResolvedValue(0);
    mockPrismaClient.sisRawClass.count = vi.fn().mockResolvedValue(0);
    mockPrismaClient.sisRawUser.count = vi.fn().mockResolvedValue(0);
    mockPrismaClient.sisRawEnrollment.count = vi.fn().mockResolvedValue(0);
  });
  
  afterEach(() => {
    scheduler.shutdown();
  });
  
  describe('initialize', () => {
    it('should load and schedule enabled providers', async () => {
      mockPrismaClient.sisProvider.findMany = vi.fn().mockResolvedValue([
        {
          id: 'provider-1',
          tenantId: 'tenant-1',
          enabled: true,
          syncSchedule: '0 2 * * *',
          providerType: 'CLEVER',
        },
        {
          id: 'provider-2',
          tenantId: 'tenant-1',
          enabled: true,
          syncSchedule: '0 6 * * 1-5',
          providerType: 'CLASSLINK',
        },
      ]);

      const autoStartScheduler = new SyncScheduler(mockPrismaClient, { autoStart: true });
      await autoStartScheduler.initialize();

      expect(mockCronSchedule).toHaveBeenCalledTimes(2);

      autoStartScheduler.shutdown();
    });

    it('should skip disabled providers', async () => {
      mockPrismaClient.sisProvider.findMany = vi.fn().mockResolvedValue([
        {
          id: 'provider-1',
          tenantId: 'tenant-1',
          enabled: false,
          syncSchedule: '0 2 * * *',
          providerType: 'CLEVER',
        },
      ]);

      const autoStartScheduler = new SyncScheduler(mockPrismaClient, { autoStart: true });
      await autoStartScheduler.initialize();

      expect(mockCronSchedule).not.toHaveBeenCalled();

      autoStartScheduler.shutdown();
    });
  });
  
  describe('scheduleProvider', () => {
    it('should schedule a provider with valid cron expression', () => {
      scheduler.scheduleProvider({
        id: 'provider-1',
        tenantId: 'tenant-1',
        enabled: true,
        syncSchedule: '0 2 * * *',
        providerType: 'CLEVER',
        name: 'Test',
        configJson: '{}',
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(mockCronSchedule).toHaveBeenCalledWith('0 2 * * *', expect.any(Function));
    });

    it('should not schedule without cron expression', () => {
      scheduler.scheduleProvider({
        id: 'provider-1',
        tenantId: 'tenant-1',
        enabled: true,
        syncSchedule: null,
        providerType: 'CLEVER',
        name: 'Test',
        configJson: '{}',
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(mockCronSchedule).not.toHaveBeenCalled();
    });
  });
  
  describe('unscheduleProvider', () => {
    it('should stop and remove scheduled job', () => {
      const mockTask = { stop: vi.fn() };
      mockCronSchedule.mockReturnValueOnce(mockTask);

      scheduler.scheduleProvider({
        id: 'provider-1',
        tenantId: 'tenant-1',
        enabled: true,
        syncSchedule: '0 2 * * *',
        providerType: 'CLEVER',
        name: 'Test',
        configJson: '{}',
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      scheduler.unscheduleProvider('provider-1');

      expect(mockTask.stop).toHaveBeenCalled();
    });
  });
  
  describe('runSync', () => {
    it('should prevent concurrent syncs for same provider', async () => {
      mockPrismaClient.sisProvider.findUnique = vi.fn().mockResolvedValue({
        id: 'provider-1',
        tenantId: 'tenant-1',
        enabled: true,
        providerType: 'CLEVER',
        configJson: '{}',
      });

      // Mock sisSyncRun.create to return a valid sync run
      mockPrismaClient.sisSyncRun.create = vi.fn().mockResolvedValue({
        id: 'run-1',
        tenantId: 'tenant-1',
        providerId: 'provider-1',
        status: 'IN_PROGRESS',
      });

      // Start first sync (will run but we don't await it)
      const syncPromise1 = scheduler.runSync('tenant-1', 'provider-1');

      // Try to start second sync immediately - should detect first sync is in progress
      const result2 = await scheduler.runSync('tenant-1', 'provider-1');

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already in progress');

      // Wait for first sync to complete/fail to avoid unhandled rejection
      await syncPromise1.catch(() => {});
    });
  });
  
  describe('getSyncStatus', () => {
    it('should return running status when sync is active', async () => {
      mockPrismaClient.sisProvider.findUnique = vi.fn().mockResolvedValue({
        id: 'provider-1',
        lastSyncAt: new Date(),
        syncSchedule: '0 2 * * *',
      });
      
      mockPrismaClient.sisSyncRun.findFirst = vi.fn().mockResolvedValue({
        status: 'SUCCESS',
      });
      
      const status = await scheduler.getSyncStatus('provider-1');
      
      expect(status.isRunning).toBe(false);
      expect(status.lastStatus).toBe('SUCCESS');
    });
  });
  
  describe('getScheduledJobs', () => {
    it('should return list of scheduled jobs', () => {
      mockCronSchedule.mockReturnValue({ stop: vi.fn() });

      scheduler.scheduleProvider({
        id: 'provider-1',
        tenantId: 'tenant-1',
        enabled: true,
        syncSchedule: '0 2 * * *',
        providerType: 'CLEVER',
        name: 'Test',
        configJson: '{}',
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const jobs = scheduler.getScheduledJobs();

      expect(jobs).toHaveLength(1);
      expect(jobs[0].providerId).toBe('provider-1');
      expect(jobs[0].schedule).toBe('0 2 * * *');
    });
  });
});

describe('getSchedulePreset', () => {
  it('should return cron expression for known presets', () => {
    expect(getSchedulePreset('daily')).toBe('0 2 * * *');
    expect(getSchedulePreset('twice-daily')).toBe('0 2,14 * * *');
    expect(getSchedulePreset('every-6-hours')).toBe('0 */6 * * *');
    expect(getSchedulePreset('weekdays')).toBe('0 6 * * 1-5');
    expect(getSchedulePreset('hourly')).toBe('0 * * * *');
    expect(getSchedulePreset('weekly')).toBe('0 0 * * 0');
  });
  
  it('should return null for unknown presets', () => {
    expect(getSchedulePreset('unknown')).toBeNull();
    expect(getSchedulePreset('monthly')).toBeNull();
  });
});

describe('isValidCronExpression', () => {
  it('should validate correct cron expressions', () => {
    expect(isValidCronExpression('0 2 * * *')).toBe(true);
    expect(isValidCronExpression('*/5 * * * *')).toBe(true);
    expect(isValidCronExpression('0 0 1 * *')).toBe(true);
  });
  
  it('should reject invalid cron expressions', () => {
    expect(isValidCronExpression('invalid')).toBe(false);
    expect(isValidCronExpression('0 2 * *')).toBe(false); // Missing field
    expect(isValidCronExpression('')).toBe(false);
  });
});
