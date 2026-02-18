/**
 * Email Analytics Service
 *
 * Exposes OonruMail analytics (delivery rates, open rates, bounce breakdown,
 * realtime stats) via a thin caching layer. Data is cached for 5 minutes to
 * avoid excessive API calls against the OonruMail analytics endpoints.
 */

import { AivolearningEmail } from '@enterprise-email/aivolearning-email';
import { config } from '../../config.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface EmailOverviewStats {
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  [key: string]: unknown;
}

export interface TimeSeriesPoint {
  timestamp: string;
  [key: string]: unknown;
}

export interface BounceBreakdown {
  hard: number;
  soft: number;
  total: number;
  by_domain: Record<string, number>;
  [key: string]: unknown;
}

export interface RealtimeStats {
  active_sends: number;
  queued: number;
  delivered_last_hour: number;
  [key: string]: unknown;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

class EmailAnalyticsService {
  private client: AivolearningEmail | null = null;
  private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize the OonruMail client for analytics.
   * Safe to call multiple times — only creates the client once.
   */
  initialize(): void {
    if (this.client) return;

    if (config.email.oonrumail.enabled && config.email.oonrumail.apiKey) {
      this.client = new AivolearningEmail({ apiKey: config.email.oonrumail.apiKey });
    }
  }

  /** Whether the analytics service has a working client. */
  get isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * High-level overview: delivery_rate, open_rate, click_rate, bounce_rate.
   */
  async getOverview(): Promise<EmailOverviewStats | null> {
    if (!this.client) return null;
    return this.cached('overview', () =>
      this.client!.sdk.analytics.overview(),
    ) as Promise<EmailOverviewStats>;
  }

  /**
   * Time-series data points for a given date range and interval.
   */
  async getTimeSeries(
    startDate: string,
    endDate: string,
    interval: 'hour' | 'day' | 'week' | 'month',
  ): Promise<TimeSeriesPoint[] | null> {
    if (!this.client) return null;
    const key = `timeseries:${startDate}:${endDate}:${interval}`;
    return this.cached(key, () =>
      this.client!.sdk.analytics.timeSeries({
        start_date: startDate,
        end_date: endDate,
        interval,
      }),
    ) as Promise<TimeSeriesPoint[]>;
  }

  /**
   * Bounce breakdown: hard, soft, total, by_domain.
   */
  async getBounceBreakdown(): Promise<BounceBreakdown | null> {
    if (!this.client) return null;
    return this.cached('bounces', () =>
      this.client!.sdk.analytics.bounces(),
    ) as Promise<BounceBreakdown>;
  }

  /**
   * Realtime stats — NOT cached.
   */
  async getRealtime(): Promise<RealtimeStats | null> {
    if (!this.client) return null;
    return this.client.sdk.analytics.realtime() as Promise<RealtimeStats>;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL CACHE
  // ──────────────────────────────────────────────────────────────────────────

  /** Simple TTL cache wrapper. */
  private async cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data as T;
    }
    const data = await fetcher();
    this.cache.set(key, { data, expiresAt: Date.now() + this.CACHE_TTL });
    return data;
  }

  /** Clear the analytics cache (useful for testing). */
  clearCache(): void {
    this.cache.clear();
  }
}

export const emailAnalyticsService = new EmailAnalyticsService();
