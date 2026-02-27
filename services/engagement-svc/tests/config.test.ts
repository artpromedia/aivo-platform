/**
 * Tests for engagement-svc configuration.
 */
import { describe, it, expect } from 'vitest';

describe('engagement-svc config', () => {
  it('has expected config structure', async () => {
    const { config } = await import('../src/config.js');
    expect(config).toBeDefined();
    expect(typeof config.port).toBe('number');
    expect(config.nodeEnv).toBeDefined();
  });

  it('has NATS URL configured', async () => {
    const { config } = await import('../src/config.js');
    expect(typeof config.natsUrl).toBe('string');
    expect(config.natsUrl).toContain('nats://');
  });

  it('has JWT configuration', async () => {
    const { config } = await import('../src/config.js');
    expect(config.jwtPublicKey).toBeDefined();
    expect(config.jwtIssuer).toBeDefined();
    expect(config.jwtAudience).toBeDefined();
  });

  it('has engagement default values', async () => {
    const { config } = await import('../src/config.js');
    expect(config.defaults.maxDailyXp).toBeGreaterThan(0);
    expect(config.defaults.maxDailyCelebrations).toBeGreaterThan(0);
    expect(config.defaults.streakGracePeriodHours).toBeGreaterThan(0);
  });
});
