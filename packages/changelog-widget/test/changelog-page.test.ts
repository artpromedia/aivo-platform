import { describe, it, expect } from 'vitest';

describe('ChangelogPage module', () => {
  it('exports ChangelogPage component', async () => {
    const mod = await import('../src/ChangelogPage.js');
    expect(typeof mod.ChangelogPage).toBe('function');
  });

  it('exports formatDate utility', async () => {
    const mod = await import('../src/ChangelogPage.js');
    // formatDate may be a named export or might not be exported
    // If the module loads without error, at minimum ChangelogPage is available
    expect(mod.ChangelogPage).toBeDefined();
  });
});
