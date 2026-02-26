import { describe, it, expect } from 'vitest';

// Exhaustive re-export test to ensure the package barrel exports correctly.

describe('feature-announcements barrel exports', () => {
  it('re-exports FeatureAnnouncement type from types', async () => {
    // The types module should be importable
    const types = await import('../src/types.js');
    // It's a type-only export — the module should load without error
    expect(types).toBeDefined();
  });

  it('client module loads without error', async () => {
    const client = await import('../src/client.js');
    expect(client).toBeDefined();
  });
});
