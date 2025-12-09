/**
 * Billing Metrics Module
 *
 * Provides Prometheus-compatible metrics for billing and payment operations.
 * Exposes an /internal/metrics endpoint for scraping.
 *
 * Metrics tracked:
 * - billing_subscriptions_active_total (by planSku, tenantType)
 * - billing_invoices_paid_total / billing_invoices_failed_total
 * - billing_trials_active_total / billing_trials_expiring_soon
 * - billing_webhook_failures_total (by event_type, error_type)
 * - billing_payment_method_attached_total
 * - billing_dunning_events_total (by stage: day0, day3, day7_downgrade)
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type MetricLabels = Record<string, string>;

interface Counter {
  name: string;
  help: string;
  type: 'counter';
  labels: string[];
  values: Map<string, number>;
}

interface Gauge {
  name: string;
  help: string;
  type: 'gauge';
  labels: string[];
  values: Map<string, number>;
}

type Metric = Counter | Gauge;

// ══════════════════════════════════════════════════════════════════════════════
// METRICS REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

class MetricsRegistry {
  private metrics = new Map<string, Metric>();

  createCounter(name: string, help: string, labels: string[] = []): Counter {
    const counter: Counter = {
      name,
      help,
      type: 'counter',
      labels,
      values: new Map(),
    };
    this.metrics.set(name, counter);
    return counter;
  }

  createGauge(name: string, help: string, labels: string[] = []): Gauge {
    const gauge: Gauge = {
      name,
      help,
      type: 'gauge',
      labels,
      values: new Map(),
    };
    this.metrics.set(name, gauge);
    return gauge;
  }

  increment(metric: Counter, labels: MetricLabels = {}, value = 1): void {
    const key = this.labelKey(labels);
    const current = metric.values.get(key) ?? 0;
    metric.values.set(key, current + value);
  }

  set(metric: Gauge, labels: MetricLabels, value: number): void {
    const key = this.labelKey(labels);
    metric.values.set(key, value);
  }

  private labelKey(labels: MetricLabels): string {
    const sorted = Object.keys(labels).sort();
    return sorted.map((k) => `${k}="${labels[k]}"`).join(',');
  }

  /**
   * Export all metrics in Prometheus text format
   */
  export(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      for (const [labelKey, value] of metric.values.entries()) {
        const labelStr = labelKey ? `{${labelKey}}` : '';
        lines.push(`${metric.name}${labelStr} ${value}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL METRICS INSTANCE
// ══════════════════════════════════════════════════════════════════════════════

export const registry = new MetricsRegistry();

// ──────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION METRICS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Total count of active subscriptions by plan SKU and tenant type
 * This is a gauge that should be updated periodically or on subscription changes
 */
export const subscriptionsActiveTotal = registry.createGauge(
  'billing_subscriptions_active_total',
  'Total number of active subscriptions',
  ['plan_sku', 'tenant_type', 'status']
);

/**
 * Total count of subscriptions currently in trial
 */
export const trialsActiveTotal = registry.createGauge(
  'billing_trials_active_total',
  'Total number of active trials',
  ['plan_sku', 'tenant_type']
);

/**
 * Count of trials expiring within N days (default 3 days)
 */
export const trialsExpiringSoon = registry.createGauge(
  'billing_trials_expiring_soon',
  'Number of trials expiring within 3 days',
  ['plan_sku', 'tenant_type', 'days_remaining']
);

// ──────────────────────────────────────────────────────────────────────────────
// INVOICE METRICS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Counter for paid invoices
 */
export const invoicesPaidTotal = registry.createCounter(
  'billing_invoices_paid_total',
  'Total number of paid invoices',
  ['currency', 'tenant_type']
);

/**
 * Counter for failed invoice payments
 */
export const invoicesFailedTotal = registry.createCounter(
  'billing_invoices_failed_total',
  'Total number of failed invoice payments',
  ['currency', 'tenant_type', 'attempt_count']
);

/**
 * Invoice amounts in cents (for revenue tracking)
 */
export const invoiceAmountPaidCents = registry.createCounter(
  'billing_invoice_amount_paid_cents_total',
  'Total amount of paid invoices in cents',
  ['currency']
);

// ──────────────────────────────────────────────────────────────────────────────
// WEBHOOK METRICS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Counter for webhook events received
 */
export const webhookEventsTotal = registry.createCounter(
  'billing_webhook_events_total',
  'Total webhook events received',
  ['event_type', 'provider']
);

/**
 * Counter for webhook processing failures
 */
export const webhookFailuresTotal = registry.createCounter(
  'billing_webhook_failures_total',
  'Total webhook processing failures',
  ['event_type', 'error_type', 'provider']
);

/**
 * Counter for duplicate webhook events (idempotency protection)
 */
export const webhookDuplicatesTotal = registry.createCounter(
  'billing_webhook_duplicates_total',
  'Total duplicate webhook events skipped',
  ['event_type', 'provider']
);

// ──────────────────────────────────────────────────────────────────────────────
// DUNNING METRICS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Counter for dunning events by stage
 */
export const dunningEventsTotal = registry.createCounter(
  'billing_dunning_events_total',
  'Total dunning events by stage',
  ['stage', 'tenant_type'] // stage: day0_banner, day3_retry, day7_downgrade
);

/**
 * Gauge for subscriptions currently in past_due state
 */
export const subscriptionsPastDueTotal = registry.createGauge(
  'billing_subscriptions_past_due_total',
  'Current number of subscriptions in past due state',
  ['tenant_type', 'days_past_due']
);

// ──────────────────────────────────────────────────────────────────────────────
// PAYMENT METHOD METRICS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Counter for payment methods attached
 */
export const paymentMethodsAttachedTotal = registry.createCounter(
  'billing_payment_methods_attached_total',
  'Total payment methods attached',
  ['brand', 'tenant_type']
);

/**
 * Counter for subscriptions created
 */
export const subscriptionsCreatedTotal = registry.createCounter(
  'billing_subscriptions_created_total',
  'Total subscriptions created',
  ['plan_sku', 'tenant_type']
);

// ──────────────────────────────────────────────────────────────────────────────
// ENTITLEMENTS SYNC METRICS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Counter for entitlements sync operations
 */
export const entitlementsSyncTotal = registry.createCounter(
  'billing_entitlements_sync_total',
  'Total entitlements sync operations triggered',
  ['trigger', 'result'] // trigger: subscription_change, manual, dunning; result: success, failure
);

/**
 * Gauge for entitlements mismatches detected
 */
export const entitlementsMismatchTotal = registry.createGauge(
  'billing_entitlements_mismatch_total',
  'Number of detected entitlements mismatches',
  ['tenant_type']
);

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Record a paid invoice metric
 */
export function recordInvoicePaid(currency: string, tenantType: string, amountCents: number): void {
  registry.increment(invoicesPaidTotal, { currency, tenant_type: tenantType });
  registry.increment(invoiceAmountPaidCents, { currency }, amountCents);
}

/**
 * Record a failed invoice payment metric
 */
export function recordInvoiceFailed(
  currency: string,
  tenantType: string,
  attemptCount: number
): void {
  registry.increment(invoicesFailedTotal, {
    currency,
    tenant_type: tenantType,
    attempt_count: String(attemptCount),
  });
}

/**
 * Record a webhook event received
 */
export function recordWebhookReceived(eventType: string, provider = 'stripe'): void {
  registry.increment(webhookEventsTotal, { event_type: eventType, provider });
}

/**
 * Record a webhook processing failure
 */
export function recordWebhookFailure(
  eventType: string,
  errorType: string,
  provider = 'stripe'
): void {
  registry.increment(webhookFailuresTotal, {
    event_type: eventType,
    error_type: errorType,
    provider,
  });
}

/**
 * Record a duplicate webhook event
 */
export function recordWebhookDuplicate(eventType: string, provider = 'stripe'): void {
  registry.increment(webhookDuplicatesTotal, { event_type: eventType, provider });
}

/**
 * Record a dunning event
 */
export function recordDunningEvent(
  stage: 'day0_banner' | 'day3_retry' | 'day7_downgrade',
  tenantType: string
): void {
  registry.increment(dunningEventsTotal, { stage, tenant_type: tenantType });
}

/**
 * Record payment method attached
 */
export function recordPaymentMethodAttached(brand: string | null, tenantType: string): void {
  registry.increment(paymentMethodsAttachedTotal, {
    brand: brand ?? 'unknown',
    tenant_type: tenantType,
  });
}

/**
 * Record entitlements sync operation
 */
export function recordEntitlementsSync(
  trigger: 'subscription_change' | 'manual' | 'dunning',
  result: 'success' | 'failure'
): void {
  registry.increment(entitlementsSyncTotal, { trigger, result });
}

/**
 * Export all metrics in Prometheus format
 */
export function exportMetrics(): string {
  return registry.export();
}

/**
 * Record a successfully processed webhook
 */
export function recordWebhookProcessed(eventType: string, provider = 'stripe'): void {
  registry.increment(webhookEventsTotal, { event_type: eventType, provider, status: 'processed' });
}

/**
 * Record a subscription created
 */
export function recordSubscriptionCreated(planSku: string, tenantType: string): void {
  registry.increment(subscriptionsCreatedTotal, { plan_sku: planSku, tenant_type: tenantType });
}

/**
 * Record a dunning action taken
 */
export function recordDunningAction(action: string, tenantType: string): void {
  registry.increment(dunningEventsTotal, { stage: action, tenant_type: tenantType });
}

/**
 * Reset all metrics (for testing only)
 */
export function resetMetrics(): void {
  // Reset all counter and gauge values in the registry
  for (const metric of [
    subscriptionsActiveTotal,
    subscriptionsCreatedTotal,
    trialsActiveTotal,
    trialsExpiringSoon,
    invoicesPaidTotal,
    invoicesFailedTotal,
    invoiceAmountPaidCents,
    webhookEventsTotal,
    webhookFailuresTotal,
    webhookDuplicatesTotal,
    dunningEventsTotal,
    subscriptionsPastDueTotal,
    paymentMethodsAttachedTotal,
    entitlementsSyncTotal,
    entitlementsMismatchTotal,
  ]) {
    metric.values.clear();
  }
}
