/**
 * Webhook Channel Types
 */

export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  secret?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export interface WebhookPayload {
  id: string;
  timestamp: string;
  type: string;
  version: string;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  responseTime?: number;
  error?: string;
  attemptNumber: number;
  deliveredAt?: Date;
}

export interface WebhookSubscription {
  id: string;
  tenantId: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  headers?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendWebhookOptions {
  subscriptionId?: string;
  url: string;
  type: string;
  data: Record<string, unknown>;
  headers?: Record<string, string>;
  secret?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}
