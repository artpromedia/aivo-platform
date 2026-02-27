import { describe, it, expect, afterEach, vi } from 'vitest';

import {
  getServiceUrl,
  getAllServiceUrls,
  getServiceConfig,
  isLocalhostUrl,
  ServiceUrls,
} from '../src/service-urls.js';

describe('getServiceUrl', () => {
  afterEach(() => {
    // Clean up env vars
    delete process.env.AUTH_SVC_URL;
    delete process.env.NEXT_PUBLIC_AUTH_SVC_URL;
  });

  it('returns localhost URL in test environment', () => {
    const url = getServiceUrl('auth');
    expect(url).toBe('http://localhost:3001');
  });

  it('respects environment variable override', () => {
    process.env.AUTH_SVC_URL = 'https://auth.custom.example.com';
    const url = getServiceUrl('auth');
    expect(url).toBe('https://auth.custom.example.com');
  });

  it('respects NEXT_PUBLIC_ env var', () => {
    process.env.NEXT_PUBLIC_AUTH_SVC_URL = 'https://auth.next.example.com';
    const url = getServiceUrl('auth');
    expect(url).toBe('https://auth.next.example.com');
  });

  it('returns correct ports for different services', () => {
    expect(getServiceUrl('profile')).toContain(':3002');
    expect(getServiceUrl('content')).toContain(':3010');
    expect(getServiceUrl('billing')).toContain(':4060');
    expect(getServiceUrl('analytics')).toContain(':4030');
    expect(getServiceUrl('aiOrchestrator')).toContain(':3060');
  });

  it('throws for unknown service', () => {
    expect(() => getServiceUrl('nonExistent' as any)).toThrow('Unknown service');
  });
});

describe('getAllServiceUrls', () => {
  it('returns URLs for all services', () => {
    const urls = getAllServiceUrls();
    expect(urls.auth).toBeDefined();
    expect(urls.billing).toBeDefined();
    expect(urls.tenant).toBeDefined();
    expect(urls.content).toBeDefined();
    expect(Object.keys(urls).length).toBeGreaterThan(20);
  });
});

describe('getServiceConfig', () => {
  it('returns config for known service', () => {
    const config = getServiceConfig('auth');
    expect(config.envVar).toBe('AUTH_SVC_URL');
    expect(config.devPort).toBe(3001);
    expect(config.prodUrl).toBe('/auth');
  });

  it('throws for unknown service', () => {
    expect(() => getServiceConfig('xxx' as any)).toThrow('Unknown service');
  });
});

describe('isLocalhostUrl', () => {
  it('detects localhost URLs', () => {
    expect(isLocalhostUrl('http://localhost:3000')).toBe(true);
    expect(isLocalhostUrl('http://127.0.0.1:8080')).toBe(true);
    expect(isLocalhostUrl('http://0.0.0.0:3001')).toBe(true);
  });

  it('returns false for production URLs', () => {
    expect(isLocalhostUrl('https://api.aivo.app/auth')).toBe(false);
    expect(isLocalhostUrl('https://auth.internal.prod')).toBe(false);
  });
});

describe('ServiceUrls convenience', () => {
  it('exports all helpers', () => {
    expect(ServiceUrls.get).toBe(getServiceUrl);
    expect(ServiceUrls.getAll).toBe(getAllServiceUrls);
    expect(ServiceUrls.getConfig).toBe(getServiceConfig);
    expect(ServiceUrls.isLocalhost).toBe(isLocalhostUrl);
    expect(ServiceUrls.services.length).toBeGreaterThan(20);
  });
});
