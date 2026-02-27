import { describe, it, expect } from 'vitest';

import { asPlugin, fastifyPlugin } from '../src/fastify-helpers.js';

describe('asPlugin', () => {
  it('casts an unknown value to FastifyPluginAsync', () => {
    const fakePkg = { name: 'fake-plugin' };
    const result = asPlugin(fakePkg);
    // Should return the exact same reference (identity cast)
    expect(result).toBe(fakePkg);
  });

  it('works with a function value', () => {
    const fn = async () => {};
    const result = asPlugin(fn);
    expect(result).toBe(fn);
    expect(typeof result).toBe('function');
  });
});

describe('fastifyPlugin', () => {
  it('is an alias for asPlugin', () => {
    expect(fastifyPlugin).toBe(asPlugin);
  });

  it('returns the same reference', () => {
    const fn = async () => {};
    expect(fastifyPlugin(fn)).toBe(fn);
  });
});
