/**
 * Database Client for Payments Service
 *
 * Provides direct database access for billing-related tables.
 * Uses raw SQL queries since this service shares the billing database
 * but doesn't have its own Prisma client.
 */

import { config } from './config.js';
import {
  PaymentProvider,
  SubscriptionStatus,
  type BillingAccount,
  type BillingInstrument,
  type Invoice,
  type PaymentEvent,
  type Plan,
  type Subscription,
  type InvoiceStatus,
} from './types.js';

// Simple PostgreSQL client using fetch for simplicity
// In production, you'd use pg or share Prisma client from billing-svc

// For now, we'll define the interface and implement with in-memory store for testing
// Production would use actual database connection

interface DbClient {
  // Billing Accounts
  getBillingAccount(id: string): Promise<BillingAccount | null>;
  updateBillingAccountCustomerId(id: string, customerId: string): Promise<BillingAccount>;

  // Plans
  getPlanBySku(sku: string): Promise<Plan | null>;
  getPlanById(id: string): Promise<Plan | null>;

  // Subscriptions
  createSubscription(data: CreateSubscriptionData): Promise<Subscription>;
  getSubscription(id: string): Promise<Subscription | null>;
  getSubscriptionByProviderId(providerId: string): Promise<Subscription | null>;
  getActiveSubscriptionForAccountAndPlan(
    billingAccountId: string,
    planSku: string
  ): Promise<Subscription | null>;
  updateSubscription(id: string, data: UpdateSubscriptionData): Promise<Subscription>;

  // Billing Instruments
  createBillingInstrument(data: CreateBillingInstrumentData): Promise<BillingInstrument>;
  updateBillingInstrumentDefault(
    billingAccountId: string,
    instrumentId: string
  ): Promise<BillingInstrument>;

  // Invoices
  upsertInvoice(data: UpsertInvoiceData): Promise<Invoice>;
  getInvoiceByProviderId(providerId: string): Promise<Invoice | null>;

  // Payment Events
  createPaymentEvent(data: CreatePaymentEventData): Promise<PaymentEvent>;
  getPaymentEventByProviderId(providerEventId: string): Promise<PaymentEvent | null>;
}

interface CreateSubscriptionData {
  billingAccountId: string;
  planId: string;
  status: SubscriptionStatus;
  quantity: number;
  trialStartAt: Date | null;
  trialEndAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  providerSubscriptionId: string;
  metadataJson?: Record<string, unknown>;
}

interface UpdateSubscriptionData {
  status?: SubscriptionStatus;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
  endedAt?: Date | null;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  trialEndAt?: Date | null;
}

interface CreateBillingInstrumentData {
  billingAccountId: string;
  providerPaymentMethodId: string;
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
  instrumentType: string;
}

interface UpsertInvoiceData {
  billingAccountId: string;
  providerInvoiceId: string;
  amountDueCents: number;
  amountPaidCents: number;
  currency: string;
  status: InvoiceStatus;
  periodStart: Date;
  periodEnd: Date;
  issuedAt: Date | null;
  paidAt: Date | null;
  pdfUrl: string | null;
}

interface CreatePaymentEventData {
  eventType: string;
  providerEventId: string;
  billingAccountId: string;
  subscriptionId?: string | null;
  invoiceId?: string | null;
  payload: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// HTTP-BASED DATABASE CLIENT
// ══════════════════════════════════════════════════════════════════════════════
//
// This implementation calls the billing-svc API for database operations.
// In a production setup, you might want to:
// 1. Share Prisma client via a library
// 2. Use direct database connection
// 3. Use gRPC for internal service communication

class HttpDbClient implements DbClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(path: string, options?: globalThis.RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options?.headers) {
      const optHeaders = options.headers as Record<string, string>;
      Object.assign(headers, optHeaders);
    }
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Database request failed: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async getBillingAccount(id: string): Promise<BillingAccount | null> {
    try {
      return await this.fetch<BillingAccount>(`/internal/billing-accounts/${id}`);
    } catch {
      return null;
    }
  }

  async updateBillingAccountCustomerId(id: string, customerId: string): Promise<BillingAccount> {
    return this.fetch<BillingAccount>(`/internal/billing-accounts/${id}/customer-id`, {
      method: 'PATCH',
      body: JSON.stringify({ providerCustomerId: customerId }),
    });
  }

  async getPlanBySku(sku: string): Promise<Plan | null> {
    try {
      return await this.fetch<Plan>(`/internal/plans/by-sku/${sku}`);
    } catch {
      return null;
    }
  }

  async getPlanById(id: string): Promise<Plan | null> {
    try {
      return await this.fetch<Plan>(`/internal/plans/${id}`);
    } catch {
      return null;
    }
  }

  async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
    return this.fetch<Subscription>('/internal/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSubscription(id: string): Promise<Subscription | null> {
    try {
      return await this.fetch<Subscription>(`/internal/subscriptions/${id}`);
    } catch {
      return null;
    }
  }

  async getSubscriptionByProviderId(providerId: string): Promise<Subscription | null> {
    try {
      return await this.fetch<Subscription>(`/internal/subscriptions/by-provider/${providerId}`);
    } catch {
      return null;
    }
  }

  async getActiveSubscriptionForAccountAndPlan(
    billingAccountId: string,
    planSku: string
  ): Promise<Subscription | null> {
    try {
      return await this.fetch<Subscription>(
        `/internal/subscriptions/active?billingAccountId=${billingAccountId}&planSku=${planSku}`
      );
    } catch {
      return null;
    }
  }

  async updateSubscription(id: string, data: UpdateSubscriptionData): Promise<Subscription> {
    return this.fetch<Subscription>(`/internal/subscriptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async createBillingInstrument(data: CreateBillingInstrumentData): Promise<BillingInstrument> {
    return this.fetch<BillingInstrument>('/internal/billing-instruments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBillingInstrumentDefault(
    billingAccountId: string,
    instrumentId: string
  ): Promise<BillingInstrument> {
    return this.fetch<BillingInstrument>(
      `/internal/billing-instruments/${instrumentId}/set-default`,
      {
        method: 'PATCH',
        body: JSON.stringify({ billingAccountId }),
      }
    );
  }

  async upsertInvoice(data: UpsertInvoiceData): Promise<Invoice> {
    return this.fetch<Invoice>('/internal/invoices/upsert', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInvoiceByProviderId(providerId: string): Promise<Invoice | null> {
    try {
      return await this.fetch<Invoice>(`/internal/invoices/by-provider/${providerId}`);
    } catch {
      return null;
    }
  }

  async createPaymentEvent(data: CreatePaymentEventData): Promise<PaymentEvent> {
    return this.fetch<PaymentEvent>('/internal/payment-events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPaymentEventByProviderId(providerEventId: string): Promise<PaymentEvent | null> {
    try {
      return await this.fetch<PaymentEvent>(
        `/internal/payment-events/by-provider/${providerEventId}`
      );
    } catch {
      return null;
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY DATABASE CLIENT (for testing)
// ══════════════════════════════════════════════════════════════════════════════

class InMemoryDbClient implements DbClient {
  private billingAccounts = new Map<string, BillingAccount>();
  private plans = new Map<string, Plan>();
  private plansBySku = new Map<string, Plan>();
  private subscriptions = new Map<string, Subscription>();
  private subscriptionsByProviderId = new Map<string, Subscription>();
  private billingInstruments = new Map<string, BillingInstrument>();
  private invoices = new Map<string, Invoice>();
  private invoicesByProviderId = new Map<string, Invoice>();
  private paymentEvents = new Map<string, PaymentEvent>();
  private paymentEventsByProviderId = new Map<string, PaymentEvent>();

  // Seed methods for testing
  seedBillingAccount(account: BillingAccount): void {
    this.billingAccounts.set(account.id, account);
  }

  seedPlan(plan: Plan): void {
    this.plans.set(plan.id, plan);
    this.plansBySku.set(plan.sku, plan);
  }

  async getBillingAccount(id: string): Promise<BillingAccount | null> {
    return this.billingAccounts.get(id) ?? null;
  }

  async updateBillingAccountCustomerId(id: string, customerId: string): Promise<BillingAccount> {
    const account = this.billingAccounts.get(id);
    if (!account) throw new Error(`Billing account not found: ${id}`);
    account.providerCustomerId = customerId;
    account.updatedAt = new Date();
    return account;
  }

  async getPlanBySku(sku: string): Promise<Plan | null> {
    return this.plansBySku.get(sku) ?? null;
  }

  async getPlanById(id: string): Promise<Plan | null> {
    return this.plans.get(id) ?? null;
  }

  async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
    const id = crypto.randomUUID();
    const subscription: Subscription = {
      id,
      billingAccountId: data.billingAccountId,
      planId: data.planId,
      status: data.status,
      quantity: data.quantity,
      trialStartAt: data.trialStartAt,
      trialEndAt: data.trialEndAt,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
      providerSubscriptionId: data.providerSubscriptionId,
      metadataJson: data.metadataJson ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.subscriptions.set(id, subscription);
    if (data.providerSubscriptionId) {
      this.subscriptionsByProviderId.set(data.providerSubscriptionId, subscription);
    }
    return subscription;
  }

  async getSubscription(id: string): Promise<Subscription | null> {
    return this.subscriptions.get(id) ?? null;
  }

  async getSubscriptionByProviderId(providerId: string): Promise<Subscription | null> {
    return this.subscriptionsByProviderId.get(providerId) ?? null;
  }

  async getActiveSubscriptionForAccountAndPlan(
    billingAccountId: string,
    planSku: string
  ): Promise<Subscription | null> {
    // Find the plan by SKU first
    const plan = this.plansBySku.get(planSku);
    if (!plan) return null;

    // Find active subscription for this account and plan
    for (const subscription of this.subscriptions.values()) {
      if (
        subscription.billingAccountId === billingAccountId &&
        subscription.planId === plan.id &&
        (subscription.status === SubscriptionStatus.ACTIVE ||
          subscription.status === SubscriptionStatus.IN_TRIAL)
      ) {
        return subscription;
      }
    }
    return null;
  }

  async updateSubscription(id: string, data: UpdateSubscriptionData): Promise<Subscription> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) throw new Error(`Subscription not found: ${id}`);

    if (data.status !== undefined) subscription.status = data.status;
    if (data.cancelAtPeriodEnd !== undefined)
      subscription.cancelAtPeriodEnd = data.cancelAtPeriodEnd;
    if (data.canceledAt !== undefined) subscription.canceledAt = data.canceledAt;
    if (data.endedAt !== undefined) subscription.endedAt = data.endedAt;
    if (data.currentPeriodStart !== undefined)
      subscription.currentPeriodStart = data.currentPeriodStart;
    if (data.currentPeriodEnd !== undefined) subscription.currentPeriodEnd = data.currentPeriodEnd;
    if (data.trialEndAt !== undefined) subscription.trialEndAt = data.trialEndAt;
    subscription.updatedAt = new Date();

    return subscription;
  }

  async createBillingInstrument(data: CreateBillingInstrumentData): Promise<BillingInstrument> {
    const id = crypto.randomUUID();
    const instrument: BillingInstrument = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.billingInstruments.set(id, instrument);
    return instrument;
  }

  async updateBillingInstrumentDefault(
    billingAccountId: string,
    instrumentId: string
  ): Promise<BillingInstrument> {
    // Clear default on all instruments for this account
    for (const instrument of this.billingInstruments.values()) {
      if (instrument.billingAccountId === billingAccountId) {
        instrument.isDefault = instrument.id === instrumentId;
        instrument.updatedAt = new Date();
      }
    }
    const instrument = this.billingInstruments.get(instrumentId);
    if (!instrument) throw new Error(`Billing instrument not found: ${instrumentId}`);
    return instrument;
  }

  async upsertInvoice(data: UpsertInvoiceData): Promise<Invoice> {
    let invoice = this.invoicesByProviderId.get(data.providerInvoiceId);
    if (invoice) {
      // Update existing
      invoice.amountDueCents = data.amountDueCents;
      invoice.amountPaidCents = data.amountPaidCents;
      invoice.status = data.status;
      invoice.paidAt = data.paidAt;
      invoice.pdfUrl = data.pdfUrl;
      invoice.updatedAt = new Date();
    } else {
      // Create new
      const id = crypto.randomUUID();
      invoice = {
        id,
        billingAccountId: data.billingAccountId,
        providerInvoiceId: data.providerInvoiceId,
        invoiceNumber: null,
        amountDueCents: data.amountDueCents,
        amountPaidCents: data.amountPaidCents,
        currency: data.currency,
        status: data.status,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        issuedAt: data.issuedAt,
        dueAt: null,
        paidAt: data.paidAt,
        pdfUrl: data.pdfUrl,
        metadataJson: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.invoices.set(id, invoice);
      this.invoicesByProviderId.set(data.providerInvoiceId, invoice);
    }
    return invoice;
  }

  async getInvoiceByProviderId(providerId: string): Promise<Invoice | null> {
    return this.invoicesByProviderId.get(providerId) ?? null;
  }

  async createPaymentEvent(data: CreatePaymentEventData): Promise<PaymentEvent> {
    const id = crypto.randomUUID();
    const event: PaymentEvent = {
      id,
      provider: PaymentProvider.STRIPE,
      eventType: data.eventType,
      providerEventId: data.providerEventId,
      billingAccountId: data.billingAccountId,
      subscriptionId: data.subscriptionId ?? null,
      invoiceId: data.invoiceId ?? null,
      payload: data.payload,
      processedAt: new Date(),
      error: null,
      createdAt: new Date(),
    };
    this.paymentEvents.set(id, event);
    this.paymentEventsByProviderId.set(data.providerEventId, event);
    return event;
  }

  async getPaymentEventByProviderId(providerEventId: string): Promise<PaymentEvent | null> {
    return this.paymentEventsByProviderId.get(providerEventId) ?? null;
  }

  // Helper method for tests to get all payment events for a billing account
  getPaymentEvents(billingAccountId: string): PaymentEvent[] {
    return Array.from(this.paymentEvents.values()).filter(
      (e) => e.billingAccountId === billingAccountId
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export type { DbClient };
export { HttpDbClient, InMemoryDbClient };

// Default client instance
let dbClient: DbClient | null = null;

export function getDbClient(): DbClient {
  if (dbClient === null) {
    if (config.nodeEnv === 'test') {
      dbClient = new InMemoryDbClient();
    } else {
      dbClient = new HttpDbClient(config.billingServiceUrl);
    }
  }
  return dbClient;
}

export function setDbClient(client: DbClient): void {
  dbClient = client;
}
