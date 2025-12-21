/**
 * Email Provider Factory
 *
 * Manages email provider lifecycle with automatic failover.
 * Primary provider: SendGrid
 * Fallback provider: AWS SES
 *
 * Features:
 * - Automatic health monitoring
 * - Seamless provider failover
 * - Provider warm-up and initialization
 * - Centralized logging and metrics
 */

import { config } from '../../config.js';

import { sendGridProvider } from './sendgrid.js';
import { sesProvider } from './ses.js';
import type {
  EmailProvider,
  EmailResult,
  BatchEmailResult,
  SendEmailOptions,
  TemplateEmailOptions,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const HEALTH_CHECK_INTERVAL_MS = 30_000; // 30 seconds
const PROVIDER_RECOVERY_DELAY_MS = 60_000; // 1 minute before retrying failed provider

type ProviderName = 'sendgrid' | 'ses';

interface ProviderState {
  provider: EmailProvider;
  failureCount: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL PROVIDER MANAGER
// ══════════════════════════════════════════════════════════════════════════════

class EmailProviderManager {
  private readonly providers = new Map<ProviderName, ProviderState>();
  private primaryProvider: ProviderName = 'sendgrid';
  private currentProvider: ProviderName = 'sendgrid';
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private _isInitialized = false;

  /**
   * Initialize all configured providers
   */
  async initialize(): Promise<boolean> {
    if (this._isInitialized) {
      return true;
    }

    console.log('[EmailProviderManager] Initializing providers...');

    // Determine primary provider from config
    const configuredProvider = config.email.primaryProvider;
    this.primaryProvider = (configuredProvider === 'ses' ? 'ses' : 'sendgrid');

    // Initialize SendGrid
    try {
      const sgInitialized = await sendGridProvider.initialize();
      this.providers.set('sendgrid', {
        provider: sendGridProvider,
        failureCount: 0,
        lastFailure: null,
        lastSuccess: null,
      });
      console.log('[EmailProviderManager] SendGrid:', sgInitialized ? 'ready' : 'unavailable');
    } catch (error) {
      console.error('[EmailProviderManager] SendGrid init error:', error);
    }

    // Initialize SES
    try {
      const sesInitialized = await sesProvider.initialize();
      this.providers.set('ses', {
        provider: sesProvider,
        failureCount: 0,
        lastFailure: null,
        lastSuccess: null,
      });
      console.log('[EmailProviderManager] SES:', sesInitialized ? 'ready' : 'unavailable');
    } catch (error) {
      console.error('[EmailProviderManager] SES init error:', error);
    }

    // Set current provider to primary if healthy, otherwise fallback
    const primaryState = this.providers.get(this.primaryProvider);
    if (primaryState?.provider.isHealthy) {
      this.currentProvider = this.primaryProvider;
    } else {
      const fallback = this.getFallbackProvider();
      if (fallback) {
        this.currentProvider = fallback;
        console.warn('[EmailProviderManager] Primary unavailable, using fallback:', fallback);
      }
    }

    // Start health monitoring
    this.startHealthMonitoring();

    this._isInitialized = true;
    console.log('[EmailProviderManager] Initialized with provider:', this.currentProvider);
    
    return this.providers.size > 0;
  }

  /**
   * Shutdown all providers
   */
  async shutdown(): Promise<void> {
    console.log('[EmailProviderManager] Shutting down...');
    
    this.stopHealthMonitoring();

    for (const [name, state] of this.providers) {
      try {
        await state.provider.shutdown();
        console.log(`[EmailProviderManager] ${name} shut down`);
      } catch (error) {
        console.error(`[EmailProviderManager] Error shutting down ${name}:`, error);
      }
    }

    this.providers.clear();
    this._isInitialized = false;
  }

  /**
   * Get currently active provider
   */
  getActiveProvider(): EmailProvider | null {
    const state = this.providers.get(this.currentProvider);
    return state?.provider || null;
  }

  /**
   * Get provider by name
   */
  getProvider(name: ProviderName): EmailProvider | null {
    const state = this.providers.get(name);
    return state?.provider || null;
  }

  /**
   * Send email with automatic failover
   */
  async send(options: SendEmailOptions): Promise<EmailResult> {
    const provider = this.getActiveProvider();
    if (!provider) {
      return {
        success: false,
        provider: 'none',
        errorCode: 'NO_PROVIDER',
        errorMessage: 'No email provider available',
        timestamp: new Date(),
      };
    }

    let result = await provider.send(options);

    // If failed, try failover
    if (!result.success && this.shouldFailover(result.errorCode)) {
      const fallback = this.getFallbackProvider();
      if (fallback) {
        console.warn('[EmailProviderManager] Failing over to:', fallback);
        this.recordFailure(this.currentProvider);
        this.currentProvider = fallback;

        const fallbackProvider = this.getActiveProvider();
        if (fallbackProvider) {
          result = await fallbackProvider.send(options);
          if (result.success) {
            this.recordSuccess(fallback);
          }
        }
      }
    } else if (result.success) {
      this.recordSuccess(this.currentProvider);
    }

    return result;
  }

  /**
   * Send batch emails with automatic failover
   */
  async sendBatch(emails: SendEmailOptions[]): Promise<BatchEmailResult> {
    const provider = this.getActiveProvider();
    if (!provider) {
      return {
        provider: 'none',
        totalSent: 0,
        totalFailed: emails.length,
        results: emails.map((e) => ({
          to: Array.isArray(e.to) ? (e.to[0] ?? '') : e.to,
          success: false as const,
          errorCode: 'NO_PROVIDER',
          errorMessage: 'No email provider available',
        })),
      };
    }

    const result = await provider.sendBatch(emails);

    // Track success/failure for health monitoring
    if (result.totalFailed > result.totalSent) {
      this.recordFailure(this.currentProvider);
    } else {
      this.recordSuccess(this.currentProvider);
    }

    return result;
  }

  /**
   * Send template email with automatic failover
   */
  async sendTemplate(options: TemplateEmailOptions): Promise<EmailResult> {
    const provider = this.getActiveProvider();
    if (!provider) {
      return {
        success: false,
        provider: 'none',
        errorCode: 'NO_PROVIDER',
        errorMessage: 'No email provider available',
        timestamp: new Date(),
      };
    }

    let result = await provider.sendTemplate(options);

    // If failed, try failover
    if (!result.success && this.shouldFailover(result.errorCode)) {
      const fallback = this.getFallbackProvider();
      if (fallback) {
        console.warn('[EmailProviderManager] Template failover to:', fallback);
        this.recordFailure(this.currentProvider);
        this.currentProvider = fallback;

        const fallbackProvider = this.getActiveProvider();
        if (fallbackProvider) {
          result = await fallbackProvider.sendTemplate(options);
          if (result.success) {
            this.recordSuccess(fallback);
          }
        }
      }
    } else if (result.success) {
      this.recordSuccess(this.currentProvider);
    }

    return result;
  }

  /**
   * Get provider health status
   */
  getHealthStatus(): Record<string, { healthy: boolean; failureCount: number; lastFailure: Date | null }> {
    const status: Record<string, { healthy: boolean; failureCount: number; lastFailure: Date | null }> = {};
    
    for (const [name, state] of this.providers) {
      status[name] = {
        healthy: state.provider.isHealthy,
        failureCount: state.failureCount,
        lastFailure: state.lastFailure,
      };
    }

    return status;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  private getFallbackProvider(): ProviderName | null {
    for (const [name, state] of this.providers) {
      if (name !== this.currentProvider && state.provider.isHealthy) {
        return name;
      }
    }
    return null;
  }

  private shouldFailover(errorCode?: string): boolean {
    // Failover for connection/auth errors, not for recipient errors
    const failoverCodes = [
      'NOT_INITIALIZED',
      'CONNECTION_ERROR',
      'TIMEOUT',
      'AUTH_ERROR',
      'RATE_LIMITED',
      'SERVICE_UNAVAILABLE',
    ];
    return errorCode ? failoverCodes.includes(errorCode) : false;
  }

  private recordSuccess(provider: ProviderName): void {
    const state = this.providers.get(provider);
    if (state) {
      state.lastSuccess = new Date();
      state.failureCount = 0;
    }
  }

  private recordFailure(provider: ProviderName): void {
    const state = this.providers.get(provider);
    if (state) {
      state.failureCount++;
      state.lastFailure = new Date();
    }
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      return;
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private async performHealthChecks(): Promise<void> {
    for (const [name, state] of this.providers) {
      try {
        await state.provider.healthCheck();
      } catch (error) {
        console.error(`[EmailProviderManager] Health check failed for ${name}:`, error);
      }
    }

    // Try to recover to primary if we're on fallback
    if (this.currentProvider !== this.primaryProvider) {
      const primaryState = this.providers.get(this.primaryProvider);
      if (primaryState?.provider.isHealthy) {
        // Check if enough time has passed since last failure
        const canRecover =
          !primaryState.lastFailure ||
          Date.now() - primaryState.lastFailure.getTime() > PROVIDER_RECOVERY_DELAY_MS;

        if (canRecover) {
          console.log('[EmailProviderManager] Recovering to primary provider:', this.primaryProvider);
          this.currentProvider = this.primaryProvider;
        }
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ══════════════════════════════════════════════════════════════════════════════

export const emailProviderManager = new EmailProviderManager();

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export async function initializeEmailProviders(): Promise<boolean> {
  return emailProviderManager.initialize();
}

export async function shutdownEmailProviders(): Promise<void> {
  await emailProviderManager.shutdown();
}

export function getEmailProvider(name?: ProviderName): EmailProvider | null {
  if (name) {
    return emailProviderManager.getProvider(name);
  }
  return emailProviderManager.getActiveProvider();
}
