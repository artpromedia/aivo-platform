/**
 * Service-to-Service Authentication Client
 * @module @aivo/ts-shared/auth/service-auth
 */
import { AxiosRequestConfig } from 'axios';
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
 * Service client for inter-service communication with automatic authentication
 */
export declare class ServiceClient {
    private serviceName;
    private jwtService;
    private clients;
    private tokenCache;
    private endpoints;
    private timeout;
    private maxRetries;
    constructor(config: ServiceClientConfig, endpoints?: ServiceEndpoints);
    /**
     * Get or generate service token for target service
     */
    private getServiceToken;
    /**
     * Get or create Axios client for target service
     */
    private getClient;
    /**
     * Check if error is retryable
     */
    private isRetryable;
    /**
     * Delay helper
     */
    private delay;
    /**
     * Generic call to any service
     */
    call<T>(targetService: string, path: string, config?: AxiosRequestConfig): Promise<T>;
    callAuthService<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
    callTenantService<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
    callProfileService<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
    callContentService<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
    callSessionService<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
    callAssessmentService<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
    callEngagementService<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
    callPersonalizationService<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
    callAnalyticsService<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
    callNotifyService<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
    callAIOrchestrator<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
    callBillingService<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
}
/**
 * Factory function for creating service client
 */
export declare function createServiceClient(serviceName: string, jwtService: JWTService, endpoints?: ServiceEndpoints): ServiceClient;
//# sourceMappingURL=service-auth.d.ts.map