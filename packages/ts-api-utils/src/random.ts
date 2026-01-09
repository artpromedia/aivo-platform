/**
 * Crypto-Safe Random Utilities
 *
 * Provides cryptographically secure random functions to replace Math.random().
 * Math.random() is not suitable for production use as it's:
 * - Not cryptographically secure
 * - Produces non-reproducible behavior
 * - Has predictable patterns that can be exploited
 *
 * CRITICAL: Addresses HIGH-007 - Replace Math.random() in production code
 *
 * Usage:
 * ```typescript
 * import { randomInt, randomFloat, randomChoice, randomId } from '@aivo/ts-api-utils/random';
 *
 * const id = randomId();               // 'a1b2c3d4-e5f6-...'
 * const num = randomInt(1, 100);       // 42
 * const item = randomChoice([1,2,3]);  // 2
 * const pct = randomFloat(0, 1);       // 0.7342...
 * ```
 */

import { randomBytes, randomUUID } from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// RANDOM ID GENERATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a cryptographically secure UUID v4.
 * Use this instead of any Math.random()-based ID generation.
 */
export function randomId(): string {
  return randomUUID();
}

/**
 * Generate a short random ID (URL-safe base64).
 * Useful when a full UUID is too long but security is still needed.
 *
 * @param length - Number of bytes (default 12, produces ~16 char string)
 */
export function randomShortId(length = 12): string {
  return randomBytes(length).toString('base64url');
}

/**
 * Generate a random hex string.
 *
 * @param length - Number of bytes (each byte = 2 hex chars)
 */
export function randomHex(length = 16): string {
  return randomBytes(length).toString('hex');
}

// ══════════════════════════════════════════════════════════════════════════════
// RANDOM NUMBERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a cryptographically secure random integer in range [min, max].
 * Both min and max are inclusive.
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 */
export function randomInt(min: number, max: number): number {
  if (min >= max) {
    throw new Error('min must be less than max');
  }

  const range = max - min + 1;

  // For small ranges, use simple approach
  if (range <= 256) {
    const bytes = randomBytes(1);
    return min + (bytes[0]! % range);
  }

  // For larger ranges, use more bytes to reduce bias
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValid = Math.pow(256, bytesNeeded) - (Math.pow(256, bytesNeeded) % range);

  let result: number;
  do {
    const bytes = randomBytes(bytesNeeded);
    result = bytes.reduce((acc, byte, i) => acc + byte * Math.pow(256, i), 0);
  } while (result >= maxValid);

  return min + (result % range);
}

/**
 * Generate a cryptographically secure random float in range [min, max).
 * Min is inclusive, max is exclusive.
 *
 * @param min - Minimum value (inclusive, default 0)
 * @param max - Maximum value (exclusive, default 1)
 */
export function randomFloat(min = 0, max = 1): number {
  // Use 8 bytes for high precision
  const bytes = randomBytes(8);
  const value = bytes.readBigUInt64BE() / BigInt(2 ** 64);
  return min + Number(value) * (max - min);
}

/**
 * Generate a cryptographically secure random boolean.
 *
 * @param probability - Probability of true (0-1, default 0.5)
 */
export function randomBool(probability = 0.5): boolean {
  return randomFloat() < probability;
}

// ══════════════════════════════════════════════════════════════════════════════
// RANDOM SELECTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Select a random item from an array.
 *
 * @param array - Array to select from
 * @throws Error if array is empty
 */
export function randomChoice<T>(array: readonly T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot select from empty array');
  }
  const index = randomInt(0, array.length - 1);
  return array[index]!;
}

/**
 * Select multiple random items from an array (without replacement).
 *
 * @param array - Array to select from
 * @param count - Number of items to select
 * @throws Error if count > array.length
 */
export function randomSample<T>(array: readonly T[], count: number): T[] {
  if (count > array.length) {
    throw new Error('Sample size cannot exceed array length');
  }
  if (count <= 0) {
    return [];
  }

  // Fisher-Yates shuffle on a copy, then take first n elements
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  return shuffled.slice(0, count);
}

/**
 * Shuffle an array in place using Fisher-Yates algorithm.
 *
 * @param array - Array to shuffle (mutated in place)
 * @returns The same array, shuffled
 */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [array[i], array[j]] = [array[j]!, array[i]!];
  }
  return array;
}

/**
 * Select a random item based on weighted probabilities.
 *
 * @param items - Array of items with weights
 * @returns The selected item
 */
export function weightedChoice<T>(items: Array<{ item: T; weight: number }>): T {
  if (items.length === 0) {
    throw new Error('Cannot select from empty array');
  }

  const totalWeight = items.reduce((sum, { weight }) => sum + weight, 0);
  if (totalWeight <= 0) {
    throw new Error('Total weight must be positive');
  }

  let random = randomFloat(0, totalWeight);

  for (const { item, weight } of items) {
    random -= weight;
    if (random <= 0) {
      return item;
    }
  }

  // Fallback (shouldn't happen due to floating point precision)
  return items[items.length - 1]!.item;
}

// ══════════════════════════════════════════════════════════════════════════════
// RANDOM STRINGS
// ══════════════════════════════════════════════════════════════════════════════

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const LOWERCASE_ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789';
const NUMERIC = '0123456789';

/**
 * Generate a random string from a character set.
 *
 * @param length - Length of string to generate
 * @param charset - Character set to use (default alphanumeric)
 */
export function randomString(length: number, charset = ALPHANUMERIC): string {
  if (length <= 0) return '';

  const result: string[] = [];
  for (let i = 0; i < length; i++) {
    const index = randomInt(0, charset.length - 1);
    result.push(charset[index]!);
  }
  return result.join('');
}

/**
 * Generate a random numeric code (e.g., for verification codes).
 *
 * @param length - Number of digits
 */
export function randomNumericCode(length: number): string {
  return randomString(length, NUMERIC);
}

/**
 * Generate a random lowercase alphanumeric string (URL-friendly).
 *
 * @param length - Length of string to generate
 */
export function randomSlug(length: number): string {
  return randomString(length, LOWERCASE_ALPHANUMERIC);
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const Random = {
  id: randomId,
  shortId: randomShortId,
  hex: randomHex,
  int: randomInt,
  float: randomFloat,
  bool: randomBool,
  choice: randomChoice,
  sample: randomSample,
  shuffle,
  weightedChoice,
  string: randomString,
  numericCode: randomNumericCode,
  slug: randomSlug,
};
