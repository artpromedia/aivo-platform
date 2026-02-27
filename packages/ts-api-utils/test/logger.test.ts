import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createLogger, overrideConsoleInProduction, disableConsoleLogInProduction, Logger } from '../src/logger.js';

describe('createLogger', () => {
  it('creates a logger with string config', () => {
    const logger = createLogger('test-service');
    expect(logger).toBeDefined();
    expect(logger.level).toBe('warn'); // test env defaults to warn
  });

  it('creates a logger with object config', () => {
    const logger = createLogger({ service: 'test-svc', level: 'debug' });
    expect(logger.level).toBe('debug');
  });

  it('logs at appropriate levels via custom transport', () => {
    const entries: any[] = [];
    const logger = createLogger({
      service: 'test-svc',
      level: 'debug',
      transport: (entry) => entries.push(entry),
    });

    logger.debug('debug msg', { key: 'val' });
    logger.info('info msg');
    logger.warn('warn msg');
    logger.error('error msg');

    expect(entries).toHaveLength(4);
    expect(entries[0].level).toBe('debug');
    expect(entries[0].service).toBe('test-svc');
    expect(entries[0].message).toBe('debug msg');
    expect(entries[1].level).toBe('info');
    expect(entries[2].level).toBe('warn');
    expect(entries[3].level).toBe('error');
  });

  it('respects minimum log level', () => {
    const entries: any[] = [];
    const logger = createLogger({
      service: 'svc',
      level: 'warn',
      transport: (entry) => entries.push(entry),
    });

    logger.debug('skip');
    logger.info('skip');
    logger.warn('keep');
    logger.error('keep');

    expect(entries).toHaveLength(2);
    expect(entries[0].level).toBe('warn');
    expect(entries[1].level).toBe('error');
  });

  it('redacts sensitive fields', () => {
    const entries: any[] = [];
    const logger = createLogger({
      service: 'svc',
      level: 'debug',
      transport: (entry) => entries.push(entry),
    });

    logger.info('login', { password: 'secret123', username: 'user' });

    expect(entries[0].context.password).toBe('[REDACTED]');
    expect(entries[0].context.username).toBe('user');
  });

  it('redacts nested sensitive fields', () => {
    const entries: any[] = [];
    const logger = createLogger({
      service: 'svc',
      level: 'debug',
      transport: (entry) => entries.push(entry),
    });

    logger.info('data', { user: { apiKey: '12345', name: 'test' } });

    expect(entries[0].context.user.apiKey).toBe('[REDACTED]');
    expect(entries[0].context.user.name).toBe('test');
  });

  it('redacts custom fields', () => {
    const entries: any[] = [];
    const logger = createLogger({
      service: 'svc',
      level: 'debug',
      redactFields: ['mySecret'],
      transport: (entry) => entries.push(entry),
    });

    logger.info('test', { mySecret: 'hidden', normal: 'visible' });

    expect(entries[0].context.mySecret).toBe('[REDACTED]');
    expect(entries[0].context.normal).toBe('visible');
  });

  it('includes timestamps by default', () => {
    const entries: any[] = [];
    const logger = createLogger({
      service: 'svc',
      level: 'debug',
      transport: (entry) => entries.push(entry),
    });

    logger.info('msg');
    expect(entries[0].timestamp).toBeTruthy();
    expect(() => new Date(entries[0].timestamp)).not.toThrow();
  });

  it('can disable timestamps', () => {
    const entries: any[] = [];
    const logger = createLogger({
      service: 'svc',
      level: 'debug',
      timestamps: false,
      transport: (entry) => entries.push(entry),
    });

    logger.info('msg');
    expect(entries[0].timestamp).toBe('');
  });

  it('sets correlationId, tenantId, userId', () => {
    const entries: any[] = [];
    const logger = createLogger({
      service: 'svc',
      level: 'debug',
      transport: (entry) => entries.push(entry),
    });

    logger.setCorrelationId('corr-123');
    logger.setTenantId('tenant-456');
    logger.setUserId('user-789');
    logger.info('contextualized');

    expect(entries[0].correlationId).toBe('corr-123');
    expect(entries[0].tenantId).toBe('tenant-456');
    expect(entries[0].userId).toBe('user-789');
  });

  it('creates child logger with inherited context', () => {
    const entries: any[] = [];
    const logger = createLogger({
      service: 'svc',
      level: 'debug',
      transport: (entry) => entries.push(entry),
    });

    const child = logger.child({ module: 'auth' });
    child.info('child msg', { extra: 'data' });

    expect(entries).toHaveLength(1);
    expect(entries[0].context.module).toBe('auth');
    expect(entries[0].context.extra).toBe('data');
  });

  it('isLevelEnabled returns correct values', () => {
    const logger = createLogger({ service: 'svc', level: 'warn' });

    expect(logger.isLevelEnabled('debug')).toBe(false);
    expect(logger.isLevelEnabled('info')).toBe(false);
    expect(logger.isLevelEnabled('warn')).toBe(true);
    expect(logger.isLevelEnabled('error')).toBe(true);
  });

  it('handles null and undefined context gracefully', () => {
    const entries: any[] = [];
    const logger = createLogger({
      service: 'svc',
      level: 'debug',
      transport: (entry) => entries.push(entry),
    });

    logger.info('no context');
    logger.info('with ctx', { nested: null, undef: undefined });

    expect(entries).toHaveLength(2);
    expect(entries[0].context).toBeUndefined();
  });

  it('handles arrays in context', () => {
    const entries: any[] = [];
    const logger = createLogger({
      service: 'svc',
      level: 'debug',
      transport: (entry) => entries.push(entry),
    });

    logger.info('arrays', { items: [{ password: 'hidden' }, { name: 'ok' }] });

    const items = entries[0].context.items as any[];
    expect(items[0].password).toBe('[REDACTED]');
    expect(items[1].name).toBe('ok');
  });
});

describe('Logger convenience exports', () => {
  it('exports Logger object with create and levels', () => {
    expect(Logger.create).toBe(createLogger);
    expect(Logger.levels).toHaveProperty('debug', 0);
    expect(Logger.levels).toHaveProperty('error', 3);
    expect(Logger.default).toBeDefined();
  });
});
