/**
 * Service-to-Service Authentication Client
 * @module @aivo/ts-shared/auth/service-auth
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { JWTService } from './jwt.js';

/**
 * Configuration for service client
 */
export interface ServiceClientConfig {
  /** Name of the calling service */
  serviceName: string;
  /** JWT service for token generation */
  jwtService: JWTService;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Max retry attempts (default: 3) */
  retries?: number;
}

/**
 * Service endpoint mapping
 */
export interface ServiceEndpoints {
  [serviceName: string]: string;
}

/**
 * Default service endpoints (can be overridden via environment variables)
 */
const DEFAULT_ENDPOINTS: ServiceEndpoints = {
  'auth-svc': process.env.AUTH_SVC_URL || 'http://auth-svc:3001',
  'tenant-svc': process.env.TENANT_SVC_URL || 'http://tenant-svc:3002',
  'profile-svc': process.env.PROFILE_SVC_URL || 'http://profile-svc:3003',
  'content-svc': process.env.CONTENT_SVC_URL || 'http://content-svc:3010',
  'content-authoring-svc':
    process.env.CONTENT_AUTHORING_SVC_URL || 'http://content-authoring-svc:3011',
  'assessment-svc': process.env.ASSESSMENT_SVC_URL || 'http://assessment-svc:3020',
  'session-svc': process.env.SESSION_SVC_URL || 'http://session-svc:3021',
  'engagement-svc': process.env.ENGAGEMENT_SVC_URL || 'http://engagement-svc:3030',
  'personalization-svc':
    process.env.PERSONALIZATION_SVC_URL || 'http://personalization-svc:3031',
  'learner-model-svc': process.env.LEARNER_MODEL_SVC_URL || 'http://learner-model-svc:3032',
  'goal-svc': process.env.GOAL_SVC_URL || 'http://goal-svc:3033',
  'homework-helper-svc':
    process.env.HOMEWORK_HELPER_SVC_URL || 'http://homework-helper-svc:3034',
  'ai-orchestrator': process.env.AI_ORCHESTRATOR_URL || 'http://ai-orchestrator:3200',
  'sandbox-svc': process.env.SANDBOX_SVC_URL || 'http://sandbox-svc:3201',
  'analytics-svc': process.env.ANALYTICS_SVC_URL || 'http://analytics-svc:3040',
  'baseline-svc': process.env.BASELINE_SVC_URL || 'http://baseline-svc:3041',
  'reports-svc': process.env.REPORTS_SVC_URL || 'http://reports-svc:3042',
  'research-svc': process.env.RESEARCH_SVC_URL || 'http://research-svc:3043',
  'notify-svc': process.env.NOTIFY_SVC_URL || 'http://notify-svc:3060',
  'messaging-svc': process.env.MESSAGING_SVC_URL || 'http://messaging-svc:3061',
  'billing-svc': process.env.BILLING_SVC_URL || 'http://billing-svc:3070',
  'payments-svc': process.env.PAYMENTS_SVC_URL || 'http://payments-svc:3071',
};

/**
 * Token cache entry
 */
interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

/**
 * Service client for inter-service communication with automatic authentication
 */
export class ServiceClient {
  private serviceName: string;
  private jwtService: JWTService;
  private clients: Map<string, AxiosInstance> = new Map();
  private tokenCache: Map<string, TokenCacheEntry> = new Map();
  private endpoints: ServiceEndpoints;
  private timeout: number;
  private maxRetries: number;

  constructor(config: ServiceClientConfig, endpoints?: ServiceEndpoints) {
    this.serviceName = config.serviceName;
    this.jwtService = config.jwtService;
    this.timeout = config.timeout ?? 30000;
    this.maxRetries = config.retries ?? 3;
    this.endpoints = { ...DEFAULT_ENDPOINTS, ...endpoints };
  }

  /**
   * Get or generate service token for target service
   */
  private async getServiceToken(targetService: string): Promise<string> {
    const cacheKey = `${this.serviceName}:${targetService}`;
    const cached = this.tokenCache.get(cacheKey);

    // Return cached token if valid (with 5 min buffer)
    if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
      return cached.token;
    }

    // Generate new token
    const token = await this.jwtService.generateServiceToken(this.serviceName, targetService);

    // Cache for 55 minutes (tokens expire in 1 hour)
    this.tokenCache.set(cacheKey, {
      token,
      expiresAt: Date.now() + 55 * 60 * 1000,
    });

    return token;
  }

  /**
   * Get or create Axios client for target service
   */
  private async getClient(targetService: string): Promise<AxiosInstance> {
    if (this.clients.has(targetService)) {
      return this.clients.get(targetService)!;
    }

    const baseURL = this.endpoints[targetService];
    if (!baseURL) {
      throw new Error(`Unknown service: ${targetService}`);
    }

    const client = axios.create({
      baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': this.serviceName,
      },
    });

    // Add auth interceptor
    client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      const token = await this.getServiceToken(targetService);
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Add retry interceptor
    client.interceptors.response.use(
      (response: any) => response,
      async (error: AxiosError) => {
        const config = error.config as AxiosRequestConfig & { _retry?: number };

        if (!config._retry) {
          config._retry = 0;
        }

        if (config._retry < this.maxRetries && this.isRetryable(error)) {
          config._retry++;
          await this.delay(Math.pow(2, config._retry) * 100);
          return client.request(config);
        }

        throw error;
      }
    );

    this.clients.set(targetService, client);
    return client;
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: AxiosError): boolean {
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return status === 429 || status >= 500;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generic call to any service
   */
  async call<T>(
    targetService: string,
    path: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const client = await this.getClient(targetService);
    const response = await client.request<T>({ url: path, ...config });
    return response.data;
  }

  // Convenience methods for specific services
  async callAuthService<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.call<T>('auth-svc', path, config);
  }

  async callTenantService<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.call<T>('tenant-svc', path, config);
  }

  async callProfileService<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.call<T>('profile-svc', path, config);
  }

  async callContentService<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.call<T>('content-svc', path, config);
  }

  async callSessionService<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.call<T>('session-svc', path, config);
  }

  async callAssessmentService<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.call<T>('assessment-svc', path, config);
  }

  async callEngagementService<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.call<T>('engagement-svc', path, config);
  }

  async callPersonalizationService<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.call<T>('personalization-svc', path, config);
  }

  async callAnalyticsService<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.call<T>('analytics-svc', path, config);
  }

  async callNotifyService<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.call<T>('notify-svc', path, config);
  }

  async callAIOrchestrator<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.call<T>('ai-orchestrator', path, config);
  }

  async callBillingService<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.call<T>('billing-svc', path, config);
  }
}

/**
 * Factory function for creating service client
 */
export function createServiceClient(
  serviceName: string,
  jwtService: JWTService,
  endpoints?: ServiceEndpoints
): ServiceClient {
  return new ServiceClient({ serviceName, jwtService }, endpoints);
}
