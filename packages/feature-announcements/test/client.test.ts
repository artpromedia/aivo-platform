import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test that useFeatureSeen can be imported.
// Full React component rendering is tested in integration/E2E tests,
// but we can verify the module shape and basic hook contract here.

describe('feature-announcements client module', () => {
  it('exports useFeatureSeen function', async () => {
    const mod = await import('../src/client.js');
    expect(typeof mod.useFeatureSeen).toBe('function');
  });

  it('exports FeatureHighlight component', async () => {
    const mod = await import('../src/client.js');
    expect(typeof mod.FeatureHighlight).toBe('function');
  });
});
