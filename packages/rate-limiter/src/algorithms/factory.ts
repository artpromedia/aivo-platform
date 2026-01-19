/**
 * Algorithm Factory
 *
 * Factory for creating rate limiting algorithm instances.
 */

import type { RateLimitStore } from '../stores/types';

import { AdaptiveRateLimiter } from './adaptive';
import { FixedWindow } from './fixed-window';
import { LeakyBucket } from './leaky-bucket';
import { SlidingWindow } from './sliding-window';
import { TokenBucket } from './token-bucket';

import type { AlgorithmType } from './index';

export type Algorithm =
  | SlidingWindow
  | TokenBucket
  | FixedWindow
  | LeakyBucket
  | AdaptiveRateLimiter;

/**
 * Create an algorithm instance by type
 */
export function createAlgorithm(
  type: AlgorithmType,
  store: RateLimitStore
): Algorithm {
  switch (type) {
    case 'sliding-window':
      return new SlidingWindow(store);
    case 'token-bucket':
      return new TokenBucket(store);
    case 'fixed-window':
      return new FixedWindow(store);
    case 'leaky-bucket':
      return new LeakyBucket(store);
    case 'adaptive':
      return new AdaptiveRateLimiter(store);
    default:
      throw new Error(`Unknown algorithm type: ${type}`);
  }
}
