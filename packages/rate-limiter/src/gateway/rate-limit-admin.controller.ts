/**
 * Rate Limit Admin Controller
 *
 * Provides admin endpoints for managing rate limits dynamically.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { RateLimiter } from '../rate-limiter';
import { RateLimitRule, RateLimitTier } from '../types';
import { GATEWAY_RATE_LIMITER } from './gateway-rate-limit.module';
import { SkipRateLimit } from '../decorators/rate-limit.decorator';

// You would typically create an AdminGuard in your application
// import { AdminGuard } from '../guards/admin.guard';

/**
 * Admin controller for rate limit management
 *
 * Mount this controller in your admin module:
 * ```typescript
 * @Module({
 *   controllers: [RateLimitAdminController],
 * })
 * export class AdminModule {}
 * ```
 */
@Controller('admin/rate-limits')
@SkipRateLimit() // Admin endpoints bypass rate limiting
// @UseGuards(AdminGuard) // Uncomment and implement your admin guard
export class RateLimitAdminController {
  constructor(
    @Inject(GATEWAY_RATE_LIMITER) private readonly rateLimiter: RateLimiter
  ) {}

  /**
   * Get all rate limit rules
   */
  @Get('rules')
  getRules(): RateLimitRule[] {
    return this.rateLimiter.getRules();
  }

  /**
   * Get a specific rule by ID
   */
  @Get('rules/:id')
  getRule(@Param('id') id: string): RateLimitRule | undefined {
    return this.rateLimiter.getRules().find((r) => r.id === id);
  }

  /**
   * Add a new rate limit rule
   */
  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  addRule(@Body() rule: RateLimitRule): { success: boolean; ruleId: string } {
    this.rateLimiter.addRule(rule);
    return { success: true, ruleId: rule.id };
  }

  /**
   * Update an existing rule
   */
  @Put('rules/:id')
  updateRule(
    @Param('id') id: string,
    @Body() rule: Partial<RateLimitRule>
  ): { success: boolean } {
    // Remove old rule and add updated one
    const existingRule = this.rateLimiter.getRules().find((r) => r.id === id);
    if (!existingRule) {
      return { success: false };
    }

    this.rateLimiter.removeRule(id);
    this.rateLimiter.addRule({ ...existingRule, ...rule, id });

    return { success: true };
  }

  /**
   * Delete a rate limit rule
   */
  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRule(@Param('id') id: string): void {
    this.rateLimiter.removeRule(id);
  }

  /**
   * Get all tiers
   */
  @Get('tiers')
  getTiers(): Record<string, RateLimitTier> {
    return this.rateLimiter.getTiers();
  }

  /**
   * Add a bypass IP
   */
  @Post('bypass/ip')
  @HttpCode(HttpStatus.CREATED)
  addBypassIP(@Body() body: { ip: string }): { success: boolean } {
    this.rateLimiter.addBypassIP(body.ip);
    return { success: true };
  }

  /**
   * Remove a bypass IP
   */
  @Delete('bypass/ip/:ip')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeBypassIP(@Param('ip') ip: string): void {
    this.rateLimiter.removeBypassIP(ip);
  }

  /**
   * Add a bypass API key
   */
  @Post('bypass/api-key')
  @HttpCode(HttpStatus.CREATED)
  addBypassApiKey(@Body() body: { apiKey: string }): { success: boolean } {
    this.rateLimiter.addBypassApiKey(body.apiKey);
    return { success: true };
  }

  /**
   * Remove a bypass API key
   */
  @Delete('bypass/api-key/:apiKey')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeBypassApiKey(@Param('apiKey') apiKey: string): void {
    this.rateLimiter.removeBypassApiKey(apiKey);
  }

  /**
   * Reset rate limit for a specific key
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetRateLimit(@Body() body: { key: string }): Promise<{ success: boolean }> {
    await this.rateLimiter.reset(body.key);
    return { success: true };
  }

  /**
   * Get rate limiter statistics
   */
  @Get('stats')
  async getStats(): Promise<{
    rulesCount: number;
    tiersCount: number;
    timestamp: string;
  }> {
    return {
      rulesCount: this.rateLimiter.getRules().length,
      tiersCount: Object.keys(this.rateLimiter.getTiers()).length,
      timestamp: new Date().toISOString(),
    };
  }
}
