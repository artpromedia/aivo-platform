/**
 * Integration Test Helpers
 *
 * Utility functions for common testing patterns:
 * - Async waiting and polling
 * - Webhook simulation
 * - Data factories
 * - Assertions helpers
 *
 * @module tests/integration/utils/helpers
 */

import { createHmac, randomUUID, randomBytes } from 'node:crypto';

// ============================================================================
// Timing Utilities
// ============================================================================

/**
 * Wait for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to become true
 *
 * @param condition - Function that returns boolean or Promise<boolean>
 * @param timeout - Maximum time to wait in milliseconds
 * @param interval - Polling interval in milliseconds
 * @param message - Error message if condition is not met
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100,
  message?: string
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) {
        return;
      }
    } catch {
      // Condition threw, keep polling
    }
    await wait(interval);
  }

  throw new Error(message ?? `Condition not met within ${timeout}ms`);
}

/**
 * Wait for an array to have at least n items
 */
export async function waitForArrayLength<T>(
  getArray: () => T[] | Promise<T[]>,
  minLength: number,
  timeout: number = 5000
): Promise<T[]> {
  let result: T[] = [];

  await waitFor(
    async () => {
      result = await getArray();
      return result.length >= minLength;
    },
    timeout,
    100,
    `Array did not reach length ${minLength} within ${timeout}ms`
  );

  return result;
}

/**
 * Retry a function until it succeeds or times out
 */
export async function retry<T>(
  fn: () => T | Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 1.5,
    shouldRetry = () => true,
  } = options;

  let lastError: Error | undefined;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        break;
      }

      await wait(currentDelay);
      currentDelay *= backoff;
    }
  }

  throw lastError ?? new Error('Retry failed');
}

// ============================================================================
// Webhook Simulation
// ============================================================================

export interface StripeWebhookPayload {
  payload: string;
  signature: string;
}

/**
 * Create a Stripe webhook payload with valid signature
 */
export function createStripeWebhookPayload(
  eventType: string,
  data: Record<string, unknown>,
  secret?: string
): StripeWebhookPayload {
  const webhookSecret = secret ?? process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_test_secret';

  const event = {
    id: `evt_${randomUUID().replaceAll('-', '')}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: eventType,
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: `req_${randomBytes(12).toString('hex')}`,
      idempotency_key: randomUUID(),
    },
    data: {
      object: data,
    },
  };

  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);

  const signaturePayload = `${timestamp}.${payload}`;
  const signature = createHmac('sha256', webhookSecret)
    .update(signaturePayload)
    .digest('hex');

  return {
    payload,
    signature: `t=${timestamp},v1=${signature}`,
  };
}

/**
 * Send a Stripe webhook to the application
 */
export async function sendStripeWebhook(
  webhook: StripeWebhookPayload,
  endpoint?: string
): Promise<{ status: number; data: unknown }> {
  const url = endpoint ?? `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/webhooks/stripe`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': webhook.signature,
      },
      body: webhook.payload,
    });

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    return {
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: (error as Error).message },
    };
  }
}

// ============================================================================
// Event Subscription Helpers
// ============================================================================

export interface EventSubscription {
  events: unknown[];
  unsubscribe: () => void;
  waitForEvent: (predicate: (event: unknown) => boolean, timeout?: number) => Promise<unknown>;
}

/**
 * Subscribe to events from an API endpoint (mock implementation)
 */
export async function subscribeToEvents(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _apiOrToken: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _pattern: string,
  handler: (event: unknown) => void
): Promise<EventSubscription> {
  const events: unknown[] = [];
  let unsubscribed = false;

  const subscription: EventSubscription = {
    events,
    unsubscribe: () => {
      unsubscribed = true;
    },
    waitForEvent: async (predicate, timeout = 5000) => {
      const existing = events.find(predicate);
      if (existing) return existing;

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Event not received within ${timeout}ms`));
        }, timeout);

        const checkInterval = setInterval(() => {
          const event = events.find(predicate);
          if (event) {
            clearTimeout(timeoutId);
            clearInterval(checkInterval);
            resolve(event);
          }
        }, 50);
      });
    },
  };

  // Simulate event handler (in real implementation, connect to NATS/WebSocket)
  const wrappedHandler = (event: unknown) => {
    if (!unsubscribed) {
      events.push(event);
      handler(event);
    }
  };

  // Store handler for simulation
  (subscription as unknown as Record<string, unknown>)._handler = wrappedHandler;

  return subscription;
}

// ============================================================================
// Data Factories
// ============================================================================

/**
 * Generate a random email address
 */
export function randomEmail(prefix = 'test'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@test.aivo.local`;
}

/**
 * Generate a random phone number
 */
export function randomPhone(): string {
  return `+1${Math.floor(2000000000 + Math.random() * 8000000000)}`;
}

/**
 * Generate a random string of specified length
 */
export function randomString(length: number = 10): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Generate test content metadata
 */
export function createTestContent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: randomUUID(),
    title: `Test Content ${randomString(6)}`,
    type: 'lesson',
    subject: 'math',
    gradeLevel: 5,
    duration: 15,
    difficulty: 'medium',
    standards: ['CCSS.MATH.CONTENT.5.NBT.B.5'],
    tags: ['multiplication', 'practice'],
    visibility: 'platform',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate test activity data
 */
export function createTestActivity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: randomUUID(),
    type: 'interactive',
    title: `Activity ${randomString(6)}`,
    questions: [
      { id: 'q1', type: 'multiple_choice', prompt: 'What is 7 × 8?' },
      { id: 'q2', type: 'multiple_choice', prompt: 'What is 6 × 9?' },
      { id: 'q3', type: 'multiple_choice', prompt: 'What is 12 × 5?' },
    ],
    estimatedTime: 5,
    ...overrides,
  };
}

/**
 * Generate test session data
 */
export function createTestSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: randomUUID(),
    sessionType: 'lesson',
    status: 'active',
    startedAt: new Date().toISOString(),
    activities: [],
    adaptations: [],
    metrics: {
      timeSpent: 0,
      activitiesCompleted: 0,
      correctAnswers: 0,
      totalAnswers: 0,
    },
    ...overrides,
  };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a response has an expected status code
 */
export function assertStatus(
  response: { status: number },
  expectedStatus: number,
  message?: string
): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      message ??
        `Expected status ${expectedStatus}, got ${response.status}`
    );
  }
}

/**
 * Assert that a response is successful (2xx)
 */
export function assertSuccess(response: { status: number }, message?: string): void {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(message ?? `Expected success status, got ${response.status}`);
  }
}

/**
 * Assert that a response is an error (4xx or 5xx)
 */
export function assertError(response: { status: number }, message?: string): void {
  if (response.status < 400) {
    throw new Error(message ?? `Expected error status, got ${response.status}`);
  }
}

/**
 * Assert that an array contains an item matching the predicate
 */
export function assertContains<T>(
  array: T[],
  predicate: (item: T) => boolean,
  message?: string
): T {
  const found = array.find(predicate);
  if (!found) {
    throw new Error(message ?? 'Array does not contain expected item');
  }
  return found;
}

/**
 * Assert that an array does not contain an item matching the predicate
 */
export function assertNotContains<T>(
  array: T[],
  predicate: (item: T) => boolean,
  message?: string
): void {
  const found = array.find(predicate);
  if (found) {
    throw new Error(message ?? 'Array contains unexpected item');
  }
}

// ============================================================================
// Date Helpers
// ============================================================================

/**
 * Get a date in the past
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Get a date in the future
 */
export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Format date as ISO string for API requests
 */
export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

// ============================================================================
// Debug Utilities
// ============================================================================

/**
 * Pretty print an object for debugging
 */
export function debug(label: string, data: unknown): void {
  if (process.env.DEBUG === 'true') {
    console.log(`\n🔍 ${label}:`);
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Create a test spy function
 */
export function createSpy<T extends (...args: unknown[]) => unknown>(): {
  fn: T;
  calls: unknown[][];
  reset: () => void;
} {
  const calls: unknown[][] = [];

  const fn = ((...args: unknown[]) => {
    calls.push(args);
  }) as T;

  return {
    fn,
    calls,
    reset: () => {
      calls.length = 0;
    },
  };
}
