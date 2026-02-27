/**
 * Tests for compliance-evidence-svc configuration module.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';

describe('config', () => {
  it('has valid port number', () => {
    expect(typeof config.port).toBe('number');
    expect(config.port).toBeGreaterThan(0);
    expect(config.port).toBeLessThan(65536);
  });

  it('has default host', () => {
    expect(config.host).toBeDefined();
    expect(typeof config.host).toBe('string');
  });

  it('has S3 configuration', () => {
    expect(config.s3).toBeDefined();
    expect(config.s3.bucket).toBeTruthy();
    expect(config.s3.region).toBeTruthy();
  });

  it('has service URLs', () => {
    expect(config.authSvcUrl).toBeTruthy();
    expect(config.auditSvcUrl).toBeTruthy();
    expect(config.prometheusUrl).toBeTruthy();
  });

  it('has retention settings', () => {
    expect(config.retentionDays).toBeGreaterThan(0);
    expect(config.immutableLockDays).toBeGreaterThan(0);
  });

  it('has GitHub config', () => {
    expect(config.github).toBeDefined();
    expect(config.github.owner).toBeTruthy();
    expect(config.github.repo).toBeTruthy();
  });

  it('retention is at least 7 years', () => {
    expect(config.retentionDays).toBeGreaterThanOrEqual(365 * 7);
  });
});
