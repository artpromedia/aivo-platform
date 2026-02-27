import { describe, it, expect, vi } from 'vitest';

import {
  createAuditLogger,
  buildAuditQueryFilter,
  AuditLog,
  type AuditLogInput,
  type AuditLogEntry,
} from '../src/audit.js';

describe('createAuditLogger', () => {
  const baseInput: AuditLogInput = {
    action: 'USER_CREATED',
    actorId: 'admin-1',
    actorRole: 'DISTRICT_ADMIN',
    tenantId: 'tenant-1',
    resourceType: 'USER',
    resourceId: 'user-1',
  };

  it('creates entries with auto-generated id and timestamp', async () => {
    const logger = createAuditLogger({ serviceName: 'test-svc' });
    const entry = await logger.log(baseInput);

    expect(entry.id).toMatch(/^audit_/);
    expect(entry.timestamp).toBeTruthy();
    expect(entry.serviceName).toBe('test-svc');
    expect(entry.action).toBe('USER_CREATED');
    expect(entry.actorId).toBe('admin-1');
  });

  it('determines severity automatically', async () => {
    const logger = createAuditLogger({ serviceName: 'svc' });

    const infoEntry = await logger.log({ ...baseInput, action: 'USER_CREATED' });
    expect(infoEntry.severity).toBe('INFO');

    const warningEntry = await logger.log({ ...baseInput, action: 'USER_DELETED' });
    expect(warningEntry.severity).toBe('CRITICAL'); // USER_DELETED is in CRITICAL_ACTIONS

    const deletedEntry = await logger.log({ ...baseInput, action: 'CONTENT_DELETED' });
    expect(deletedEntry.severity).toBe('WARNING'); // contains 'DELETED' but not in critical list
  });

  it('allows explicit severity override', async () => {
    const logger = createAuditLogger({ serviceName: 'svc' });
    const entry = await logger.log({ ...baseInput, severity: 'CRITICAL' });
    expect(entry.severity).toBe('CRITICAL');
  });

  it('calls transport with entry', async () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    const logger = createAuditLogger({ serviceName: 'svc', transport });

    await logger.log(baseInput);

    expect(transport).toHaveBeenCalledOnce();
    expect(transport.mock.calls[0][0]).toMatchObject({
      action: 'USER_CREATED',
      serviceName: 'svc',
    });
  });

  it('redacts sensitive fields in details', async () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    const logger = createAuditLogger({ serviceName: 'svc', transport });

    await logger.log({
      ...baseInput,
      details: { password: 'secret', name: 'test' },
    });

    const entry = transport.mock.calls[0][0] as AuditLogEntry;
    expect(entry.details!.password).toBe('[REDACTED]');
    expect(entry.details!.name).toBe('test');
  });

  it('redacts previousState and newState', async () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    const logger = createAuditLogger({ serviceName: 'svc', transport });

    await logger.log({
      ...baseInput,
      previousState: { apiKey: 'old-key' },
      newState: { apiKey: 'new-key' },
    });

    const entry = transport.mock.calls[0][0] as AuditLogEntry;
    expect(entry.previousState!.apiKey).toBe('[REDACTED]');
    expect(entry.newState!.apiKey).toBe('[REDACTED]');
  });

  it('uses custom redact fields', async () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    const logger = createAuditLogger({
      serviceName: 'svc',
      transport,
      redactFields: ['email'],
    });

    await logger.log({
      ...baseInput,
      details: { email: 'user@test.com', name: 'test' },
    });

    const entry = transport.mock.calls[0][0] as AuditLogEntry;
    expect(entry.details!.email).toBe('[REDACTED]');
    expect(entry.details!.name).toBe('test');
  });

  it('merges defaultTags with per-entry tags', async () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    const logger = createAuditLogger({
      serviceName: 'svc',
      transport,
      defaultTags: ['env:test'],
    });

    await logger.log({ ...baseInput, tags: ['user-management'] });

    const entry = transport.mock.calls[0][0] as AuditLogEntry;
    expect(entry.tags).toContain('env:test');
    expect(entry.tags).toContain('user-management');
  });

  it('logUserAction sets resourceType to USER', async () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    const logger = createAuditLogger({ serviceName: 'svc', transport });

    await logger.logUserAction('USER_CREATED', {
      actorId: 'a1',
      actorRole: 'ADMIN',
      tenantId: 't1',
      resourceId: 'u1',
    });

    expect(transport.mock.calls[0][0].resourceType).toBe('USER');
    expect(transport.mock.calls[0][0].action).toBe('USER_CREATED');
  });

  it('logAuthAction sets proper severity for LOGIN_FAILED', async () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    const logger = createAuditLogger({ serviceName: 'svc', transport });

    await logger.logAuthAction('LOGIN_FAILED', {
      actorId: 'a1',
      actorRole: 'USER',
      tenantId: 't1',
      resourceId: 'u1',
    });

    expect(transport.mock.calls[0][0].severity).toBe('WARNING');
  });

  it('logDataAction sets CRITICAL severity for DATA_DELETED', async () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    const logger = createAuditLogger({ serviceName: 'svc', transport });

    await logger.logDataAction('DATA_DELETED', {
      actorId: 'a1',
      actorRole: 'ADMIN',
      tenantId: 't1',
      resourceType: 'USER',
      resourceId: 'u1',
    });

    expect(transport.mock.calls[0][0].severity).toBe('CRITICAL');
  });

  it('logPermissionChange sets CRITICAL severity', async () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    const logger = createAuditLogger({ serviceName: 'svc', transport });

    await logger.logPermissionChange('PERMISSION_GRANTED', {
      actorId: 'a1',
      actorRole: 'ADMIN',
      tenantId: 't1',
      resourceId: 'perm-1',
    });

    expect(transport.mock.calls[0][0].severity).toBe('CRITICAL');
    expect(transport.mock.calls[0][0].resourceType).toBe('PERMISSION');
  });

  it('exposes serviceName', () => {
    const logger = createAuditLogger({ serviceName: 'my-svc' });
    expect(logger.serviceName).toBe('my-svc');
  });
});

describe('buildAuditQueryFilter', () => {
  it('builds basic filter with tenantId', () => {
    const result = buildAuditQueryFilter({ tenantId: 'tenant-1' });
    expect(result.sql).toBe('tenant_id = $1');
    expect(result.params).toEqual(['tenant-1']);
  });

  it('builds filter with all optional params', () => {
    const result = buildAuditQueryFilter({
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      resourceType: 'USER',
      resourceId: 'res-1',
      action: 'USER_CREATED',
      severity: 'INFO',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      tags: ['tag1', 'tag2'],
    });

    expect(result.sql).toContain('tenant_id = $1');
    expect(result.sql).toContain('actor_id = $2');
    expect(result.sql).toContain('resource_type = $3');
    expect(result.sql).toContain('resource_id = $4');
    expect(result.sql).toContain('action = $5');
    expect(result.sql).toContain('severity = $6');
    expect(result.sql).toContain('timestamp >= $7');
    expect(result.sql).toContain('timestamp <= $8');
    expect(result.sql).toContain('tags && $9');
    expect(result.params).toHaveLength(9);
  });

  it('parameterizes incrementally', () => {
    const result = buildAuditQueryFilter({
      tenantId: 'T',
      actorId: 'A',
    });
    expect(result.params).toEqual(['T', 'A']);
  });
});

describe('AuditLog convenience exports', () => {
  it('exports create and buildQueryFilter', () => {
    expect(AuditLog.create).toBe(createAuditLogger);
    expect(AuditLog.buildQueryFilter).toBe(buildAuditQueryFilter);
    expect(AuditLog.criticalActions).toContain('USER_DELETED');
    expect(AuditLog.criticalActions).toContain('TENANT_DELETED');
  });
});
