/**
 * Razorpay Payment Gateway Implementation
 *
 * Production-ready Razorpay integration for India:
 * - INR currency support
 * - UPI payments
 * - Card payments
 * - Net banking
 * - Wallet payments
 * - EMI options
 * - Subscriptions
 *
 * Regions: India (IN)
 * Currencies: INR (primary), USD (international)
 */

import crypto from 'crypto';

import type {
  CreateCheckoutInput,
  CreateCustomerInput,
  CreatePaymentInput,
  CreateRefundInput,
  CreateSubscriptionInput,
  GatewayCheckoutSession,
  GatewayCustomer,
  GatewayPayment,
  GatewayRefund,
  GatewaySubscription,
  PaymentGateway,
  PaymentVerificationResult,
  UpdateCustomerInput,
  UpdateSubscriptionInput,
  VerifyPaymentInput,
  WebhookVerificationResult,
} from './payment-gateway.interface.js';
import {
  PaymentGatewayType,
  PaymentStatus,
  RefundStatus,
  SubscriptionGatewayStatus,
  WebhookEventType,
} from './payment-gateway.interface.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  baseUrl?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// RAZORPAY API TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface RazorpayCustomer {
  id: string;
  entity: 'customer';
  name?: string;
  email: string;
  contact?: string;
  gstin?: string;
  notes: Record<string, string>;
  created_at: number;
}

interface RazorpayOrder {
  id: string;
  entity: 'order';
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  notes: Record<string, string>;
  created_at: number;
}

interface RazorpayPayment {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: string;
  order_id?: string;
  method: string;
  description?: string;
  card_id?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  email: string;
  contact: string;
  customer_id?: string;
  notes: Record<string, string>;
  fee?: number;
  tax?: number;
  error_code?: string;
  error_description?: string;
  created_at: number;
  captured?: boolean;
}

interface RazorpayPlan {
  id: string;
  entity: 'plan';
  interval: number;
  period: string;
  item: {
    id: string;
    active: boolean;
    amount: number;
    unit_amount: number;
    currency: string;
    name: string;
    description?: string;
  };
  notes: Record<string, string>;
  created_at: number;
}

interface RazorpaySubscription {
  id: string;
  entity: 'subscription';
  plan_id: string;
  customer_id: string;
  status: string;
  current_start?: number;
  current_end?: number;
  ended_at?: number;
  quantity: number;
  notes: Record<string, string>;
  charge_at: number;
  offer_id?: string;
  short_url: string;
  has_scheduled_changes: boolean;
  change_scheduled_at?: number;
  source: string;
  payment_method: string;
  created_at: number;
  expire_by?: number;
  customer_notify: number;
  total_count?: number;
  paid_count?: number;
  remaining_count?: number;
  start_at?: number;
}

interface RazorpayRefund {
  id: string;
  entity: 'refund';
  amount: number;
  currency: string;
  payment_id: string;
  notes: Record<string, string>;
  receipt?: string;
  acquirer_data?: {
    rrn?: string;
  };
  created_at: number;
  batch_id?: string;
  status: string;
  speed_processed: string;
  speed_requested: string;
}

interface RazorpayPaymentLink {
  id: string;
  amount: number;
  currency: string;
  status: string;
  short_url: string;
  reference_id: string;
  created_at: number;
  expire_by?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// RAZORPAY GATEWAY IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

export class RazorpayGateway implements PaymentGateway {
  public readonly type = PaymentGatewayType.RAZORPAY;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly baseUrl: string;

  public readonly supportedCurrencies = ['INR', 'USD'];

  public readonly supportedCountries = ['IN'];

  constructor(config: RazorpayConfig) {
    this.keyId = config.keyId;
    this.keySecret = config.keySecret;
    this.webhookSecret = config.webhookSecret;
    this.baseUrl = config.baseUrl ?? 'https://api.razorpay.com/v1';
  }

  isAvailable(): boolean {
    return !!this.keyId && !!this.keySecret;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HTTP CLIENT
  // ════════════════════════════════════════════════════════════════════════════

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as { error?: { description?: string } };
      throw new Error(error.error?.description ?? `Razorpay API error: ${response.status}`);
    }

    return data as T;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CUSTOMER MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  async createCustomer(input: CreateCustomerInput): Promise<GatewayCustomer> {
    const customer = await this.request<RazorpayCustomer>('POST', '/customers', {
      name: input.name,
      email: input.email,
      contact: input.phone,
      notes: {
        tenantId: input.metadata.tenantId,
        userId: input.metadata.userId ?? '',
        gatewayType: this.type,
      },
    });

    return this.mapCustomer(customer);
  }

  async getCustomer(customerId: string): Promise<GatewayCustomer | null> {
    try {
      const customer = await this.request<RazorpayCustomer>('GET', `/customers/${customerId}`);
      return this.mapCustomer(customer);
    } catch {
      return null;
    }
  }

  async updateCustomer(customerId: string, input: UpdateCustomerInput): Promise<GatewayCustomer> {
    const customer = await this.request<RazorpayCustomer>('PUT', `/customers/${customerId}`, {
      name: input.name,
      email: input.email,
      contact: input.phone,
      notes: input.metadata,
    });

    return this.mapCustomer(customer);
  }

  async deleteCustomer(_customerId: string): Promise<boolean> {
    // Razorpay doesn't support customer deletion
    return true;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAYMENT PROCESSING
  // ════════════════════════════════════════════════════════════════════════════

  async createPayment(input: CreatePaymentInput): Promise<GatewayPayment> {
    // Razorpay uses Orders for payment initiation
    const receipt = input.idempotencyKey ?? this.generateReceipt();

    const order = await this.request<RazorpayOrder>('POST', '/orders', {
      amount: input.amountCents,
      currency: input.currency,
      receipt,
      notes: {
        ...input.metadata,
        customerId: input.customerId,
        description: input.description ?? '',
      },
    });

    return {
      id: order.id,
      gatewayType: this.type,
      customerId: input.customerId,
      amountCents: order.amount,
      currency: order.currency,
      status: this.mapOrderStatus(order.status),
      description: input.description,
      metadata: order.notes,
      reference: order.id,
      createdAt: new Date(order.created_at * 1000),
      rawResponse: order,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    // For Razorpay, we verify the payment signature
    // The reference should be payment_id
    const payment = await this.request<RazorpayPayment>('GET', `/payments/${input.reference}`);

    const gatewayPayment = this.mapPayment(payment);

    return {
      verified: payment.status === 'captured',
      status: gatewayPayment.status,
      payment: gatewayPayment,
    };
  }

  async getPayment(paymentId: string): Promise<GatewayPayment | null> {
    try {
      const payment = await this.request<RazorpayPayment>('GET', `/payments/${paymentId}`);
      return this.mapPayment(payment);
    } catch {
      return null;
    }
  }

  /**
   * Capture a payment (for 2-step payments)
   */
  async capturePayment(paymentId: string, amount: number): Promise<GatewayPayment> {
    const payment = await this.request<RazorpayPayment>('POST', `/payments/${paymentId}/capture`, {
      amount,
    });
    return this.mapPayment(payment);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  async createSubscription(input: CreateSubscriptionInput): Promise<GatewaySubscription> {
    // First, create or get the plan
    const plan = await this.getOrCreatePlan(input);

    // Create subscription
    const subscriptionParams: Record<string, unknown> = {
      plan_id: plan.id,
      customer_id: input.customerId,
      total_count: 120, // Max billing cycles (10 years monthly)
      quantity: 1,
      customer_notify: 1,
      notes: {
        ...(input.metadata as Record<string, string>),
        planCode: input.planCode,
      },
    };

    if (input.startDate) {
      subscriptionParams.start_at = Math.floor(input.startDate.getTime() / 1000);
    }

    const subscription = await this.request<RazorpaySubscription>(
      'POST',
      '/subscriptions',
      subscriptionParams
    );

    return this.mapSubscription(subscription, plan);
  }

  async getSubscription(subscriptionId: string): Promise<GatewaySubscription | null> {
    try {
      const subscription = await this.request<RazorpaySubscription>(
        'GET',
        `/subscriptions/${subscriptionId}`
      );
      const plan = await this.request<RazorpayPlan>('GET', `/plans/${subscription.plan_id}`);
      return this.mapSubscription(subscription, plan);
    } catch {
      return null;
    }
  }

  async updateSubscription(
    subscriptionId: string,
    input: UpdateSubscriptionInput
  ): Promise<GatewaySubscription> {
    const params: Record<string, unknown> = {};

    if (input.planCode) {
      // Create new plan and update subscription
      const newPlan = await this.getOrCreatePlan({
        planCode: input.planCode,
        amountCents: input.amountCents ?? 0,
        currency: 'INR',
        interval: 'monthly',
      });
      params.plan_id = newPlan.id;
    }

    if (input.quantity !== undefined) {
      params.quantity = input.quantity;
    }

    if (input.metadata) {
      params.notes = input.metadata;
    }

    const subscription = await this.request<RazorpaySubscription>(
      'PATCH',
      `/subscriptions/${subscriptionId}`,
      params
    );

    const plan = await this.request<RazorpayPlan>('GET', `/plans/${subscription.plan_id}`);

    return this.mapSubscription(subscription, plan);
  }

  async cancelSubscription(
    subscriptionId: string,
    options?: { immediate?: boolean }
  ): Promise<GatewaySubscription> {
    const subscription = await this.request<RazorpaySubscription>(
      'POST',
      `/subscriptions/${subscriptionId}/cancel`,
      {
        cancel_at_cycle_end: !options?.immediate,
      }
    );

    const plan = await this.request<RazorpayPlan>('GET', `/plans/${subscription.plan_id}`);

    return this.mapSubscription(subscription, plan);
  }

  async resumeSubscription(subscriptionId: string): Promise<GatewaySubscription> {
    const subscription = await this.request<RazorpaySubscription>(
      'POST',
      `/subscriptions/${subscriptionId}/resume`
    );

    const plan = await this.request<RazorpayPlan>('GET', `/plans/${subscription.plan_id}`);

    return this.mapSubscription(subscription, plan);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REFUNDS
  // ════════════════════════════════════════════════════════════════════════════

  async createRefund(input: CreateRefundInput): Promise<GatewayRefund> {
    const params: Record<string, unknown> = {
      speed: 'normal',
      notes: input.metadata,
    };

    if (input.amountCents) {
      params.amount = input.amountCents;
    }

    const refund = await this.request<RazorpayRefund>(
      'POST',
      `/payments/${input.paymentId}/refund`,
      params
    );

    return this.mapRefund(refund);
  }

  async getRefund(refundId: string): Promise<GatewayRefund | null> {
    try {
      const refund = await this.request<RazorpayRefund>('GET', `/refunds/${refundId}`);
      return this.mapRefund(refund);
    } catch {
      return null;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHECKOUT (Payment Links)
  // ════════════════════════════════════════════════════════════════════════════

  async createCheckoutSession(input: CreateCheckoutInput): Promise<GatewayCheckoutSession> {
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.amountCents * item.quantity,
      0
    );

    const referenceId = this.generateReceipt();

    const paymentLink = await this.request<RazorpayPaymentLink>('POST', '/payment_links', {
      amount: totalAmount,
      currency: input.currency,
      accept_partial: false,
      reference_id: referenceId,
      description: input.items.map((i) => i.name).join(', '),
      customer: {
        email: input.customerEmail,
      },
      notify: {
        sms: true,
        email: true,
      },
      reminder_enable: true,
      notes: {
        ...input.metadata,
        customerId: input.customerId ?? '',
        items: JSON.stringify(input.items),
      },
      callback_url: input.successUrl,
      callback_method: 'get',
    });

    return {
      id: paymentLink.id,
      gatewayType: this.type,
      url: paymentLink.short_url,
      reference: paymentLink.reference_id,
      expiresAt: paymentLink.expire_by ? new Date(paymentLink.expire_by * 1000) : undefined,
      rawResponse: paymentLink,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // WEBHOOKS
  // ════════════════════════════════════════════════════════════════════════════

  async verifyWebhook(
    payload: string | Buffer,
    headers: Record<string, string>
  ): Promise<WebhookVerificationResult> {
    try {
      const signature = headers['x-razorpay-signature'];
      if (!signature) {
        return { verified: false, error: 'Missing x-razorpay-signature header' };
      }

      const payloadString = typeof payload === 'string' ? payload : payload.toString();

      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payloadString)
        .digest('hex');

      if (expectedSignature !== signature) {
        return { verified: false, error: 'Invalid signature' };
      }

      const event = JSON.parse(payloadString) as {
        event: string;
        payload: { payment?: { entity: unknown }; subscription?: { entity: unknown } };
        created_at: number;
      };

      return {
        verified: true,
        event: {
          id: crypto.randomUUID(),
          gatewayType: this.type,
          eventType: this.mapWebhookEventType(event.event),
          data: event.payload.payment?.entity ?? event.payload.subscription?.entity,
          timestamp: new Date(event.created_at * 1000),
          rawEvent: event,
        },
      };
    } catch (error) {
      return {
        verified: false,
        error: error instanceof Error ? error.message : 'Webhook verification failed',
      };
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ════════════════════════════════════════════════════════════════════════════

  private generateReceipt(): string {
    return `AIVO_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private mapCustomer(customer: RazorpayCustomer): GatewayCustomer {
    return {
      id: customer.id,
      gatewayType: this.type,
      email: customer.email,
      name: customer.name,
      phone: customer.contact,
      metadata: customer.notes,
      createdAt: new Date(customer.created_at * 1000),
      rawResponse: customer,
    };
  }

  private mapPayment(payment: RazorpayPayment): GatewayPayment {
    return {
      id: payment.id,
      gatewayType: this.type,
      customerId: payment.customer_id ?? '',
      amountCents: payment.amount,
      currency: payment.currency,
      status: this.mapPaymentStatus(payment.status),
      description: payment.description,
      metadata: payment.notes,
      reference: payment.id,
      paidAt: payment.captured ? new Date(payment.created_at * 1000) : undefined,
      createdAt: new Date(payment.created_at * 1000),
      rawResponse: payment,
    };
  }

  private mapOrderStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      created: PaymentStatus.PENDING,
      attempted: PaymentStatus.PROCESSING,
      paid: PaymentStatus.SUCCEEDED,
    };
    return statusMap[status] ?? PaymentStatus.PENDING;
  }

  private mapPaymentStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      created: PaymentStatus.PENDING,
      authorized: PaymentStatus.REQUIRES_ACTION,
      captured: PaymentStatus.SUCCEEDED,
      refunded: PaymentStatus.REFUNDED,
      failed: PaymentStatus.FAILED,
    };
    return statusMap[status] ?? PaymentStatus.PENDING;
  }

  private mapSubscription(
    subscription: RazorpaySubscription,
    plan: RazorpayPlan
  ): GatewaySubscription {
    return {
      id: subscription.id,
      gatewayType: this.type,
      customerId: subscription.customer_id,
      planCode: subscription.notes?.planCode ?? plan.item.name,
      status: this.mapSubscriptionStatus(subscription.status),
      amountCents: plan.item.amount,
      currency: plan.item.currency,
      interval: plan.period,
      quantity: subscription.quantity,
      currentPeriodStart: subscription.current_start
        ? new Date(subscription.current_start * 1000)
        : new Date(subscription.created_at * 1000),
      currentPeriodEnd: subscription.current_end
        ? new Date(subscription.current_end * 1000)
        : new Date(),
      cancelAtPeriodEnd: subscription.status === 'pending' && !!subscription.ended_at,
      endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : undefined,
      metadata: subscription.notes,
      createdAt: new Date(subscription.created_at * 1000),
      rawResponse: subscription,
    };
  }

  private mapSubscriptionStatus(status: string): SubscriptionGatewayStatus {
    const statusMap: Record<string, SubscriptionGatewayStatus> = {
      created: SubscriptionGatewayStatus.TRIALING,
      authenticated: SubscriptionGatewayStatus.ACTIVE,
      active: SubscriptionGatewayStatus.ACTIVE,
      pending: SubscriptionGatewayStatus.PAST_DUE,
      halted: SubscriptionGatewayStatus.PAUSED,
      cancelled: SubscriptionGatewayStatus.CANCELED,
      completed: SubscriptionGatewayStatus.CANCELED,
      expired: SubscriptionGatewayStatus.CANCELED,
    };
    return statusMap[status] ?? SubscriptionGatewayStatus.ACTIVE;
  }

  private mapRefund(refund: RazorpayRefund): GatewayRefund {
    return {
      id: refund.id,
      gatewayType: this.type,
      paymentId: refund.payment_id,
      amountCents: refund.amount,
      currency: refund.currency,
      status: this.mapRefundStatus(refund.status),
      createdAt: new Date(refund.created_at * 1000),
      rawResponse: refund,
    };
  }

  private mapRefundStatus(status: string): RefundStatus {
    const statusMap: Record<string, RefundStatus> = {
      pending: RefundStatus.PENDING,
      processed: RefundStatus.SUCCEEDED,
      failed: RefundStatus.FAILED,
    };
    return statusMap[status] ?? RefundStatus.PENDING;
  }

  private mapWebhookEventType(event: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'payment.captured': WebhookEventType.PAYMENT_SUCCESS,
      'payment.failed': WebhookEventType.PAYMENT_FAILED,
      'payment.authorized': WebhookEventType.PAYMENT_SUCCESS,
      'subscription.activated': WebhookEventType.SUBSCRIPTION_ACTIVATED,
      'subscription.charged': WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCESS,
      'subscription.pending': WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED,
      'subscription.halted': WebhookEventType.SUBSCRIPTION_CANCELED,
      'subscription.cancelled': WebhookEventType.SUBSCRIPTION_CANCELED,
      'subscription.completed': WebhookEventType.SUBSCRIPTION_CANCELED,
      'refund.created': WebhookEventType.REFUND_PROCESSED,
      'refund.processed': WebhookEventType.REFUND_PROCESSED,
    };
    return eventMap[event] ?? WebhookEventType.UNKNOWN;
  }

  private async getOrCreatePlan(
    input: Pick<CreateSubscriptionInput, 'planCode' | 'amountCents' | 'currency' | 'interval'>
  ): Promise<RazorpayPlan> {
    // Try to list plans and find matching one
    try {
      const plans = await this.request<{ items: RazorpayPlan[] }>('GET', '/plans');
      const existing = plans.items.find(
        (p) =>
          p.item.name === input.planCode &&
          p.item.amount === input.amountCents &&
          p.item.currency === input.currency
      );
      if (existing) return existing;
    } catch {
      // Continue to create
    }

    // Map interval to Razorpay format
    const periodMap: Record<string, string> = {
      daily: 'daily',
      weekly: 'weekly',
      monthly: 'monthly',
      quarterly: 'monthly',
      yearly: 'yearly',
    };

    const intervalMap: Record<string, number> = {
      quarterly: 3,
    };

    return this.request<RazorpayPlan>('POST', '/plans', {
      period: periodMap[input.interval] ?? 'monthly',
      interval: intervalMap[input.interval] ?? 1,
      item: {
        name: input.planCode,
        amount: input.amountCents,
        currency: input.currency,
      },
      notes: {
        planCode: input.planCode,
      },
    });
  }
}
