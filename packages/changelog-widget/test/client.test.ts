import { describe, it, expect } from 'vitest';

describe('changelog-widget client module', () => {
  it('exports ChangelogButton component', async () => {
    const mod = await import('../src/client.js');
    expect(typeof mod.ChangelogButton).toBe('function');
  });

  it('exports ChangelogDrawer component', async () => {
    const mod = await import('../src/client.js');
    expect(typeof mod.ChangelogDrawer).toBe('function');
  });
});
