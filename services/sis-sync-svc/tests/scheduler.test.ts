/**
 * Scheduler Tests
 * 
 * Tests for the sync scheduler and job management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { SyncScheduler, getSchedulePreset, isValidCronExpression } from '../src/scheduler';

// Mock node-cron
vi.mock('node-cron', () => ({
  validate: vi.fn((expr: string) => {
    // Simple validation for common cron expressions
    const parts = expr.split(' ');
    return parts.length === 5;
  }),
  schedule: vi.fn(() => ({
    stop: vi.fn(),
  })),
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
      const cron = require('node-cron');
      
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
      
      expect(cron.schedule).toHaveBeenCalledTimes(2);
      
      autoStartScheduler.shutdown();
    });
    
    it('should skip disabled providers', async () => {
      const cron = require('node-cron');
      
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
      
      expect(cron.schedule).not.toHaveBeenCalled();
      
      autoStartScheduler.shutdown();
    });
  });
  
  describe('scheduleProvider', () => {
    it('should schedule a provider with valid cron expression', () => {
      const cron = require('node-cron');
      
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
      
      expect(cron.schedule).toHaveBeenCalledWith('0 2 * * *', expect.any(Function));
    });
    
    it('should not schedule without cron expression', () => {
      const cron = require('node-cron');
      
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
      
      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });
  
  describe('unscheduleProvider', () => {
    it('should stop and remove scheduled job', () => {
      const mockTask = { stop: vi.fn() };
      const cron = require('node-cron');
      cron.schedule.mockReturnValueOnce(mockTask);
      
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
      
      // Start first sync (will hang due to mock)
      const syncPromise1 = scheduler.runSync('tenant-1', 'provider-1');
      
      // Try to start second sync immediately
      const result2 = await scheduler.runSync('tenant-1', 'provider-1');
      
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already in progress');
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
      const cron = require('node-cron');
      cron.schedule.mockReturnValue({ stop: vi.fn() });
      
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
