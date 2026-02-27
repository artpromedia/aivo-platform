/**
 * Tests for retention-svc configuration.
 */
import { describe, it, expect } from 'vitest';

describe('retention-svc config', () => {
  it('loads config module', async () => {
    const mod = await import('../src/config.js');
    expect(mod.config).toBeDefined();
  });

  it('has database configuration', async () => {
    const { config } = await import('../src/config.js');
    expect(typeof config.databaseUrl).toBe('string');
  });
});

describe('retention-svc types', () => {
  it('exports ResourceType union', async () => {
    // Type-level check: ensure type module loads
    const mod = await import('../src/types.js');
    expect(mod).toBeDefined();
  });
});
