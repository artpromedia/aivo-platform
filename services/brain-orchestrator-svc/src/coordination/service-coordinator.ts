import type {
  ServiceAction,
  ServiceResponse,
  ServiceRequest,
  AggregatedResponse,
  LearnerProfile,
} from '../types/index.js';
import { config } from '../config.js';
import { publishEvent } from '../events/publisher.js';

interface ServiceConfig {
  name: string;
  baseUrl: string;
  healthEndpoint: string;
  timeout: number;
}

const SERVICE_CONFIGS: Record<string, ServiceConfig> = {
  'learner-model-svc': {
    name: 'learner-model-svc',
    baseUrl: config.services.learnerModel,
    healthEndpoint: '/health',
    timeout: 5000,
  },
  'lesson-svc': {
    name: 'lesson-svc',
    baseUrl: config.services.lesson,
    healthEndpoint: '/health',
    timeout: 10000,
  },
  'assessment-svc': {
    name: 'assessment-svc',
    baseUrl: config.services.assessment,
    healthEndpoint: '/health',
    timeout: 10000,
  },
  'homework-helper-svc': {
    name: 'homework-helper-svc',
    baseUrl: config.services.homeworkHelper,
    healthEndpoint: '/health',
    timeout: 30000,
  },
  'focus-svc': {
    name: 'focus-svc',
    baseUrl: config.services.focus,
    healthEndpoint: '/health',
    timeout: 5000,
  },
  'virtual-brain-svc': {
    name: 'virtual-brain-svc',
    baseUrl: config.services.virtualBrain,
    healthEndpoint: '/health',
    timeout: 30000,
  },
  'ai-orchestrator': {
    name: 'ai-orchestrator',
    baseUrl: config.services.aiOrchestrator,
    healthEndpoint: '/health',
    timeout: 60000,
  },
  'collaboration-svc': {
    name: 'collaboration-svc',
    baseUrl: config.services.lesson, // Placeholder - would be its own URL
    healthEndpoint: '/health',
    timeout: 10000,
  },
};

interface CircuitBreakerState {
  failures: number;
  lastFailure: Date | null;
  isOpen: boolean;
}

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT_MS = 30000;

export class ServiceCoordinator {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private authToken?: string;

  constructor(authToken?: string) {
    this.authToken = authToken;

    // Initialize circuit breakers
    for (const serviceName of Object.keys(SERVICE_CONFIGS)) {
      this.circuitBreakers.set(serviceName, {
        failures: 0,
        lastFailure: null,
        isOpen: false,
      });
    }
  }

  /**
   * Set the authentication token for service calls
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Delegate an action to a specific service
   */
  async delegateToService(
    serviceName: string,
    action: ServiceAction,
    payload?: Record<string, unknown>
  ): Promise<ServiceResponse> {
    const startTime = Date.now();

    // Check circuit breaker
    if (this.isCircuitOpen(serviceName)) {
      return {
        success: false,
        error: `Service ${serviceName} circuit breaker is open`,
        latency: 0,
      };
    }

    const serviceConfig = SERVICE_CONFIGS[serviceName];
    if (!serviceConfig) {
      return {
        success: false,
        error: `Unknown service: ${serviceName}`,
        latency: 0,
      };
    }

    try {
      const url = `${serviceConfig.baseUrl}${action.path}`;
      const requestPayload = payload ?? action.payload;

      const response = await this.makeRequest(
        url,
        action.method,
        requestPayload,
        serviceConfig.timeout
      );

      const latency = Date.now() - startTime;

      // Reset circuit breaker on success
      this.resetCircuitBreaker(serviceName);

      return {
        success: true,
        data: response,
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      // Record failure for circuit breaker
      this.recordFailure(serviceName);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency,
      };
    }
  }

  /**
   * Aggregate responses from multiple services
   */
  async aggregateResponses(requests: ServiceRequest[]): Promise<AggregatedResponse> {
    const startTime = Date.now();
    const responses = new Map<string, ServiceResponse>();
    const failedServices: string[] = [];

    // Execute requests in parallel with individual timeouts
    const promises = requests.map(async (request) => {
      const response = await this.delegateToService(
        request.serviceName,
        request.action,
        request.action.payload
      );

      responses.set(request.serviceName, response);

      if (!response.success) {
        failedServices.push(request.serviceName);
      }

      return { serviceName: request.serviceName, response };
    });

    await Promise.all(promises);

    return {
      responses,
      totalLatency: Date.now() - startTime,
      failedServices,
    };
  }

  /**
   * Get learner profile from learner-model-svc
   */
  async getLearnerProfile(learnerId: string, tenantId: string): Promise<LearnerProfile> {
    const response = await this.delegateToService('learner-model-svc', {
      name: 'getLearnerProfile',
      method: 'GET',
      path: `/api/v1/learners/${learnerId}/profile`,
    });

    if (!response.success || !response.data) {
      // Return default profile if service unavailable
      return {
        id: learnerId,
        tenantId,
        skillLevels: new Map(),
        learningRate: 1.0,
        averageAccuracy: 0.75,
        averageResponseTime: 3000,
        preferredPace: 'normal',
        strengths: [],
        weaknesses: [],
      };
    }

    const data = response.data as Record<string, unknown>;

    return {
      id: learnerId,
      tenantId,
      skillLevels: new Map(Object.entries(data.skillLevels as Record<string, number> ?? {})),
      learningRate: (data.learningRate as number) ?? 1.0,
      averageAccuracy: (data.averageAccuracy as number) ?? 0.75,
      averageResponseTime: (data.averageResponseTime as number) ?? 3000,
      preferredPace: (data.preferredPace as 'slow' | 'normal' | 'fast') ?? 'normal',
      strengths: (data.strengths as string[]) ?? [],
      weaknesses: (data.weaknesses as string[]) ?? [],
    };
  }

  /**
   * Update mastery in learner-model-svc
   */
  async updateMastery(
    learnerId: string,
    skillId: string,
    masteryChange: number
  ): Promise<boolean> {
    const response = await this.delegateToService('learner-model-svc', {
      name: 'updateMastery',
      method: 'POST',
      path: `/api/v1/learners/${learnerId}/mastery`,
      payload: {
        skillId,
        masteryChange,
      },
    });

    return response.success;
  }

  /**
   * Get focus data from focus-svc
   */
  async getFocusData(learnerId: string, sessionId: string): Promise<Record<string, unknown> | null> {
    const response = await this.delegateToService('focus-svc', {
      name: 'getFocusData',
      method: 'GET',
      path: `/api/v1/focus/learners/${learnerId}/sessions/${sessionId}`,
    });

    return response.success ? response.data ?? null : null;
  }

  /**
   * Trigger AI reasoning via ai-orchestrator
   */
  async triggerAIReasoning(
    context: string,
    prompt: string,
    options?: Record<string, unknown>
  ): Promise<string | null> {
    const response = await this.delegateToService('ai-orchestrator', {
      name: 'reason',
      method: 'POST',
      path: '/api/v1/reason',
      payload: {
        context,
        prompt,
        ...options,
      },
    });

    if (!response.success || !response.data) {
      return null;
    }

    return (response.data as Record<string, unknown>).response as string;
  }

  /**
   * Publish an event via NATS
   */
  async publishEvent(
    eventType: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await publishEvent(eventType as any, data);
  }

  /**
   * Check health of all services
   */
  async checkServicesHealth(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();

    const checks = Object.entries(SERVICE_CONFIGS).map(async ([name, config]) => {
      try {
        const response = await this.makeRequest(
          `${config.baseUrl}${config.healthEndpoint}`,
          'GET',
          undefined,
          3000
        );
        healthStatus.set(name, true);
      } catch {
        healthStatus.set(name, false);
      }
    });

    await Promise.all(checks);

    return healthStatus;
  }

  /**
   * Get service availability status
   */
  getServiceStatus(serviceName: string): {
    available: boolean;
    circuitBreakerOpen: boolean;
    failures: number;
  } {
    const circuitBreaker = this.circuitBreakers.get(serviceName);

    return {
      available: !this.isCircuitOpen(serviceName),
      circuitBreakerOpen: circuitBreaker?.isOpen ?? false,
      failures: circuitBreaker?.failures ?? 0,
    };
  }

  // ========== Private Helper Methods ==========

  private async makeRequest(
    url: string,
    method: string,
    payload?: Record<string, unknown>,
    timeout?: number
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout ?? 10000);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const options: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(payload);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private isCircuitOpen(serviceName: string): boolean {
    const state = this.circuitBreakers.get(serviceName);
    if (!state) return false;

    if (state.isOpen && state.lastFailure) {
      // Check if timeout has passed
      const timeSinceFailure = Date.now() - state.lastFailure.getTime();
      if (timeSinceFailure >= CIRCUIT_BREAKER_TIMEOUT_MS) {
        // Allow retry (half-open state)
        state.isOpen = false;
        return false;
      }
    }

    return state.isOpen;
  }

  private recordFailure(serviceName: string): void {
    const state = this.circuitBreakers.get(serviceName);
    if (!state) return;

    state.failures++;
    state.lastFailure = new Date();

    if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      state.isOpen = true;
      console.warn(`Circuit breaker opened for service: ${serviceName}`);
    }
  }

  private resetCircuitBreaker(serviceName: string): void {
    const state = this.circuitBreakers.get(serviceName);
    if (!state) return;

    state.failures = 0;
    state.isOpen = false;
    state.lastFailure = null;
  }
}
