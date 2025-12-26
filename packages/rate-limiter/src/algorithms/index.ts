/**
 * Rate Limiting Algorithms
 *
 * This module exports all available rate limiting algorithms.
 */

export { SlidingWindow } from './sliding-window';
export { TokenBucket, type TokenBucketState } from './token-bucket';
export { FixedWindow } from './fixed-window';
export { LeakyBucket, type LeakyBucketState } from './leaky-bucket';
export {
  AdaptiveRateLimiter,
  type AdaptiveOptions,
  type AdaptiveState,
} from './adaptive';

/**
 * Algorithm type identifier
 */
export type AlgorithmType =
  | 'sliding-window'
  | 'token-bucket'
  | 'fixed-window'
  | 'leaky-bucket'
  | 'adaptive';

/**
 * Algorithm factory for creating algorithm instances
 */
export { createAlgorithm } from './factory';
