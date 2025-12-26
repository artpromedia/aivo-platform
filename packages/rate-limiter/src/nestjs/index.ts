/**
 * NestJS exports
 */

export {
  RateLimitModule,
  RATE_LIMITER,
  RATE_LIMIT_OPTIONS,
  type RateLimitModuleOptions,
  type RateLimitModuleAsyncOptions,
} from './rate-limit.module';

export { RateLimitGuard, RateLimitExceededException } from './rate-limit.guard';
