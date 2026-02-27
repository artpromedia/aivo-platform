import { describe, it, expect } from 'vitest';

import {
  randomId,
  randomShortId,
  randomHex,
  randomInt,
  randomFloat,
  randomBool,
  randomChoice,
  randomSample,
  shuffle,
  weightedChoice,
  randomString,
  randomNumericCode,
  randomSlug,
  Random,
} from '../src/random.js';

describe('randomId', () => {
  it('returns a valid UUID v4 string', () => {
    const id = randomId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => randomId()));
    expect(ids.size).toBe(100);
  });
});

describe('randomShortId', () => {
  it('returns a base64url string', () => {
    const id = randomShortId();
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('produces ~16 char string for default 12 bytes', () => {
    const id = randomShortId();
    expect(id.length).toBe(16);
  });

  it('accepts custom length', () => {
    const id = randomShortId(6);
    expect(id.length).toBe(8); // 6 bytes → 8 base64 chars
  });
});

describe('randomHex', () => {
  it('returns hex string of correct length', () => {
    const hex = randomHex(8);
    expect(hex.length).toBe(16); // 8 bytes = 16 hex chars
    expect(hex).toMatch(/^[0-9a-f]+$/);
  });

  it('defaults to 16 bytes (32 hex chars)', () => {
    const hex = randomHex();
    expect(hex.length).toBe(32);
  });
});

describe('randomInt', () => {
  it('returns integer within range', () => {
    for (let i = 0; i < 100; i++) {
      const n = randomInt(1, 10);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(10);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('throws when min >= max', () => {
    expect(() => randomInt(5, 5)).toThrow('min must be less than max');
    expect(() => randomInt(10, 5)).toThrow('min must be less than max');
  });

  it('handles large ranges', () => {
    const n = randomInt(0, 100000);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThanOrEqual(100000);
  });
});

describe('randomFloat', () => {
  it('returns float in [0, 1) by default', () => {
    for (let i = 0; i < 50; i++) {
      const f = randomFloat();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('returns float within custom range', () => {
    for (let i = 0; i < 50; i++) {
      const f = randomFloat(10, 20);
      expect(f).toBeGreaterThanOrEqual(10);
      expect(f).toBeLessThan(20);
    }
  });
});

describe('randomBool', () => {
  it('returns a boolean', () => {
    const b = randomBool();
    expect(typeof b).toBe('boolean');
  });

  it('respects probability 0 → always false', () => {
    for (let i = 0; i < 20; i++) {
      expect(randomBool(0)).toBe(false);
    }
  });

  it('respects probability 1 → always true', () => {
    for (let i = 0; i < 20; i++) {
      expect(randomBool(1)).toBe(true);
    }
  });
});

describe('randomChoice', () => {
  it('selects an item from the array', () => {
    const arr = ['a', 'b', 'c'];
    const item = randomChoice(arr);
    expect(arr).toContain(item);
  });

  it('throws on empty array', () => {
    expect(() => randomChoice([])).toThrow('Cannot select from empty array');
  });
});

describe('randomSample', () => {
  it('returns correct number of items', () => {
    const result = randomSample([1, 2, 3, 4, 5], 3);
    expect(result).toHaveLength(3);
  });

  it('returns items without replacement', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = randomSample(arr, 5);
    expect(new Set(result).size).toBe(5);
  });

  it('throws when count > length', () => {
    expect(() => randomSample([1, 2], 3)).toThrow('Sample size cannot exceed array length');
  });

  it('returns empty array for count 0', () => {
    expect(randomSample([1, 2, 3], 0)).toEqual([]);
  });
});

describe('shuffle', () => {
  it('returns same array reference (mutates in place)', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result).toBe(arr);
  });

  it('contains all original elements', () => {
    const arr = [1, 2, 3, 4, 5];
    shuffle(arr);
    expect(arr.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('weightedChoice', () => {
  it('selects from weighted items', () => {
    const items = [
      { item: 'a', weight: 1 },
      { item: 'b', weight: 1 },
    ];
    const result = weightedChoice(items);
    expect(['a', 'b']).toContain(result);
  });

  it('throws on empty array', () => {
    expect(() => weightedChoice([])).toThrow('Cannot select from empty array');
  });

  it('throws when total weight is 0', () => {
    expect(() => weightedChoice([{ item: 'a', weight: 0 }])).toThrow('Total weight must be positive');
  });

  it('respects weights (high weight item selected more often)', () => {
    const items = [
      { item: 'common', weight: 1000 },
      { item: 'rare', weight: 1 },
    ];
    const results = Array.from({ length: 100 }, () => weightedChoice(items));
    const commonCount = results.filter((r) => r === 'common').length;
    expect(commonCount).toBeGreaterThan(80);
  });
});

describe('randomString', () => {
  it('generates string of correct length', () => {
    const s = randomString(10);
    expect(s.length).toBe(10);
  });

  it('uses alphanumeric charset by default', () => {
    const s = randomString(100);
    expect(s).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('uses custom charset', () => {
    const s = randomString(20, 'abc');
    expect(s).toMatch(/^[abc]+$/);
  });

  it('returns empty string for length 0', () => {
    expect(randomString(0)).toBe('');
  });
});

describe('randomNumericCode', () => {
  it('generates numeric-only string', () => {
    const code = randomNumericCode(6);
    expect(code.length).toBe(6);
    expect(code).toMatch(/^[0-9]+$/);
  });
});

describe('randomSlug', () => {
  it('generates lowercase alphanumeric string', () => {
    const slug = randomSlug(12);
    expect(slug.length).toBe(12);
    expect(slug).toMatch(/^[a-z0-9]+$/);
  });
});

describe('Random namespace', () => {
  it('exports all functions', () => {
    expect(Random.id).toBe(randomId);
    expect(Random.shortId).toBe(randomShortId);
    expect(Random.hex).toBe(randomHex);
    expect(Random.int).toBe(randomInt);
    expect(Random.float).toBe(randomFloat);
    expect(Random.bool).toBe(randomBool);
    expect(Random.choice).toBe(randomChoice);
    expect(Random.sample).toBe(randomSample);
    expect(Random.shuffle).toBe(shuffle);
    expect(Random.weightedChoice).toBe(weightedChoice);
    expect(Random.string).toBe(randomString);
    expect(Random.numericCode).toBe(randomNumericCode);
    expect(Random.slug).toBe(randomSlug);
  });
});
