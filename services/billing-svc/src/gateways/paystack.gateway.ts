/**
 * Paystack Payment Gateway Implementation
 *
 * Production-ready Paystack integration for African markets:
 * - Nigeria (NGN)
 * - Ghana (GHS)
 * - Kenya (KES)
 * - South Africa (ZAR)
 *
 * Features:
 * - Card payments
 * - Bank transfers
 * - USSD payments
 * - Mobile money
 * - Recurring charges/subscriptions
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

interface PaystackConfig {
  secretKey: string;
  publicKey: string;
  baseUrl?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYSTACK API TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

interface PaystackCustomer {
  id: number;
  customer_code: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface PaystackTransaction {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  gateway_response: string;
  channel: string;
  authorization?: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
  };
  customer: PaystackCustomer;
  paid_at?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface PaystackPlan {
  id: number;
  name: string;
  plan_code: string;
  amount: number;
  currency: string;
  interval: string;
  created_at: string;
}

interface PaystackSubscription {
  id: number;
  subscription_code: string;
  email_token: string;
  status: string;
  amount: number;
  plan: PaystackPlan;
  customer: PaystackCustomer;
  next_payment_date?: string;
  created_at: string;
}

interface PaystackRefund {
  id: number;
  amount: number;
  currency: string;
  status: string;
  transaction: { reference: string };
  created_at: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYSTACK GATEWAY IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

export class PaystackGateway implements PaymentGateway {
  public readonly type = PaymentGatewayType.PAYSTACK;
  private readonly secretKey: string;
  private readonly publicKey: string;
  private readonly baseUrl: string;

  public readonly supportedCurrencies = ['NGN', 'GHS', 'KES', 'ZAR', 'USD'];

  public readonly supportedCountries = ['NG', 'GH', 'KE', 'ZA'];

  constructor(config: PaystackConfig) {
    this.secretKey = config.secretKey;
    this.publicKey = config.publicKey;
    this.baseUrl = config.baseUrl ?? 'https://api.paystack.co';
  }

  isAvailable(): boolean {
    return !!this.secretKey && !!this.publicKey;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HTTP CLIENT
  // ════════════════════════════════════════════════════════════════════════════

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await response.json()) as PaystackResponse<T>;

    if (!response.ok || !data.status) {
      throw new Error(data.message || `Paystack API error: ${response.status}`);
    }

    return data.data;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CUSTOMER MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  async createCustomer(input: CreateCustomerInput): Promise<GatewayCustomer> {
    const [firstName, ...lastNameParts] = (input.name ?? '').split(' ');
    const lastName = lastNameParts.join(' ');

    const customer = await this.request<PaystackCustomer>('POST', '/customer', {
      email: input.email,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      phone: input.phone,
      metadata: {
        tenantId: input.metadata.tenantId,
        userId: input.metadata.userId,
        gatewayType: this.type,
      },
    });

    return this.mapCustomer(customer);
  }

  async getCustomer(customerId: string): Promise<GatewayCustomer | null> {
    try {
      const customer = await this.request<PaystackCustomer>(
        'GET',
        `/customer/${customerId}`
      );
      return this.mapCustomer(customer);
    } catch {
      return null;
    }
  }

  async updateCustomer(
    customerId: string,
    input: UpdateCustomerInput
  ): Promise<GatewayCustomer> {
    const [firstName, ...lastNameParts] = (input.name ?? '').split(' ');
    const lastName = lastNameParts.join(' ');

    const customer = await this.request<PaystackCustomer>(
      'PUT',
      `/customer/${customerId}`,
      {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        phone: input.phone,
        metadata: input.metadata,
      }
    );

    return this.mapCustomer(customer);
  }

  async deleteCustomer(_customerId: string): Promise<boolean> {
    // Paystack doesn't support customer deletion via API
    // Instead, we mark as inactive in our system
    return true;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAYMENT PROCESSING
  // ════════════════════════════════════════════════════════════════════════════

  async createPayment(input: CreatePaymentInput): Promise<GatewayPayment> {
    const reference = input.idempotencyKey ?? this.generateReference();

    // Paystack amounts are in the smallest currency unit (kobo for NGN)
    const transaction = await this.request<PaystackInitializeResponse>(
      'POST',
      '/transaction/initialize',
      {
        email: input.metadata?.email ?? '',
        amount: input.amountCents, // Already in smallest unit
        currency: input.currency,
        reference,
        callback_url: input.returnUrl,
        metadata: {
          ...input.metadata,
          customerId: input.customerId,
        },
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      }
    );

    return {
      id: reference,
      gatewayType: this.type,
      customerId: input.customerId,
      amountCents: input.amountCents,
      currency: input.currency,
      status: PaymentStatus.PENDING,
      description: input.description,
      metadata: (input.metadata as Record<string, string>) ?? {},
      authorizationUrl: transaction.authorization_url,
      accessCode: transaction.access_code,
      reference: transaction.reference,
      createdAt: new Date(),
      rawResponse: transaction,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    const transaction = await this.request<PaystackTransaction>(
      'GET',
      `/transaction/verify/${input.reference}`
    );

    const payment = this.mapTransaction(transaction);

    return {
      verified: transaction.status === 'success',
      status: payment.status,
      payment,
    };
  }

  async getPayment(paymentId: string): Promise<GatewayPayment | null> {
    try {
      const transaction = await this.request<PaystackTransaction>(
        'GET',
        `/transaction/verify/${paymentId}`
      );
      return this.mapTransaction(transaction);
    } catch {
      return null;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  async createSubscription(input: CreateSubscriptionInput): Promise<GatewaySubscription> {
    // First, create or get the plan
    const plan = await this.getOrCreatePlan(input);

    // Create subscription
    const subscription = await this.request<PaystackSubscription>(
      'POST',
      '/subscription',
      {
        customer: input.customerId,
        plan: plan.plan_code,
        start_date: input.startDate?.toISOString(),
      }
    );

    return this.mapSubscription(subscription);
  }

  async getSubscription(subscriptionId: string): Promise<GatewaySubscription | null> {
    try {
      const subscription = await this.request<PaystackSubscription>(
        'GET',
        `/subscription/${subscriptionId}`
      );
      return this.mapSubscription(subscription);
    } catch {
      return null;
    }
  }

  async updateSubscription(
    _subscriptionId: string,
    _input: UpdateSubscriptionInput
  ): Promise<GatewaySubscription> {
    // Paystack doesn't support direct subscription updates
    // You need to cancel and create a new one
    throw new Error('Paystack does not support subscription updates. Cancel and create new.');
  }

  async cancelSubscription(
    subscriptionId: string,
    _options?: { immediate?: boolean }
  ): Promise<GatewaySubscription> {
    // Get the subscription first to get the email token
    const subscription = await this.request<PaystackSubscription>(
      'GET',
      `/subscription/${subscriptionId}`
    );

    // Disable the subscription
    await this.request<unknown>('POST', '/subscription/disable', {
      code: subscriptionId,
      token: subscription.email_token,
    });

    // Return updated subscription
    const updated = await this.request<PaystackSubscription>(
      'GET',
      `/subscription/${subscriptionId}`
    );
    return this.mapSubscription(updated);
  }

  async resumeSubscription(subscriptionId: string): Promise<GatewaySubscription> {
    const subscription = await this.request<PaystackSubscription>(
      'GET',
      `/subscription/${subscriptionId}`
    );

    await this.request<unknown>('POST', '/subscription/enable', {
      code: subscriptionId,
      token: subscription.email_token,
    });

    const updated = await this.request<PaystackSubscription>(
      'GET',
      `/subscription/${subscriptionId}`
    );
    return this.mapSubscription(updated);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REFUNDS
  // ════════════════════════════════════════════════════════════════════════════

  async createRefund(input: CreateRefundInput): Promise<GatewayRefund> {
    // Paystack uses transaction reference for refunds
    const refund = await this.request<PaystackRefund>('POST', '/refund', {
      transaction: input.paymentId,
      amount: input.amountCents,
      merchant_note: input.reason,
    });

    return this.mapRefund(refund, input.paymentId);
  }

  async getRefund(refundId: string): Promise<GatewayRefund | null> {
    try {
      const refund = await this.request<PaystackRefund>('GET', `/refund/${refundId}`);
      return this.mapRefund(refund, refund.transaction.reference);
    } catch {
      return null;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHECKOUT
  // ════════════════════════════════════════════════════════════════════════════

  async createCheckoutSession(input: CreateCheckoutInput): Promise<GatewayCheckoutSession> {
    const reference = this.generateReference();
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.amountCents * item.quantity,
      0
    );

    const transaction = await this.request<PaystackInitializeResponse>(
      'POST',
      '/transaction/initialize',
      {
        email: input.customerEmail,
        amount: totalAmount,
        currency: input.currency,
        reference,
        callback_url: input.successUrl,
        metadata: {
          ...input.metadata,
          items: input.items,
          customerId: input.customerId,
          cancel_url: input.cancelUrl,
        },
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      }
    );

    return {
      id: reference,
      gatewayType: this.type,
      url: transaction.authorization_url,
      accessCode: transaction.access_code,
      reference: transaction.reference,
      rawResponse: transaction,
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
      const signature = headers['x-paystack-signature'];
      if (!signature) {
        return { verified: false, error: 'Missing x-paystack-signature header' };
      }

      const payloadString = typeof payload === 'string' ? payload : payload.toString();
      const hash = crypto
        .createHmac('sha512', this.secretKey)
        .update(payloadString)
        .digest('hex');

      if (hash !== signature) {
        return { verified: false, error: 'Invalid signature' };
      }

      const event = JSON.parse(payloadString) as {
        event: string;
        data: unknown;
      };

      return {
        verified: true,
        event: {
          id: crypto.randomUUID(),
          gatewayType: this.type,
          eventType: this.mapWebhookEventType(event.event),
          data: event.data,
          timestamp: new Date(),
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

  private generateReference(): string {
    return `AIVO_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private mapCustomer(customer: PaystackCustomer): GatewayCustomer {
    return {
      id: customer.customer_code,
      gatewayType: this.type,
      email: customer.email,
      name:
        customer.first_name || customer.last_name
          ? `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim()
          : undefined,
      phone: customer.phone,
      metadata: (customer.metadata as Record<string, string>) ?? {},
      createdAt: new Date(customer.created_at),
      rawResponse: customer,
    };
  }

  private mapTransaction(transaction: PaystackTransaction): GatewayPayment {
    return {
      id: String(transaction.id),
      gatewayType: this.type,
      customerId: transaction.customer.customer_code,
      amountCents: transaction.amount,
      currency: transaction.currency,
      status: this.mapPaymentStatus(transaction.status),
      metadata: (transaction.metadata as Record<string, string>) ?? {},
      reference: transaction.reference,
      paidAt: transaction.paid_at ? new Date(transaction.paid_at) : undefined,
      createdAt: new Date(transaction.created_at),
      rawResponse: transaction,
    };
  }

  private mapPaymentStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      success: PaymentStatus.SUCCEEDED,
      failed: PaymentStatus.FAILED,
      abandoned: PaymentStatus.CANCELED,
      pending: PaymentStatus.PENDING,
      processing: PaymentStatus.PROCESSING,
      reversed: PaymentStatus.REFUNDED,
    };
    return statusMap[status] ?? PaymentStatus.PENDING;
  }

  private mapSubscription(subscription: PaystackSubscription): GatewaySubscription {
    return {
      id: subscription.subscription_code,
      gatewayType: this.type,
      customerId: subscription.customer.customer_code,
      planCode: subscription.plan.plan_code,
      status: this.mapSubscriptionStatus(subscription.status),
      amountCents: subscription.amount,
      currency: subscription.plan.currency,
      interval: subscription.plan.interval,
      quantity: 1,
      currentPeriodStart: new Date(subscription.created_at),
      currentPeriodEnd: subscription.next_payment_date
        ? new Date(subscription.next_payment_date)
        : new Date(),
      cancelAtPeriodEnd: false,
      metadata: {},
      createdAt: new Date(subscription.created_at),
      rawResponse: subscription,
    };
  }

  private mapSubscriptionStatus(status: string): SubscriptionGatewayStatus {
    const statusMap: Record<string, SubscriptionGatewayStatus> = {
      active: SubscriptionGatewayStatus.ACTIVE,
      'non-renewing': SubscriptionGatewayStatus.CANCELED,
      attention: SubscriptionGatewayStatus.PAST_DUE,
      completed: SubscriptionGatewayStatus.CANCELED,
      cancelled: SubscriptionGatewayStatus.CANCELED,
    };
    return statusMap[status] ?? SubscriptionGatewayStatus.ACTIVE;
  }

  private mapRefund(refund: PaystackRefund, paymentId: string): GatewayRefund {
    return {
      id: String(refund.id),
      gatewayType: this.type,
      paymentId,
      amountCents: refund.amount,
      currency: refund.currency,
      status: this.mapRefundStatus(refund.status),
      createdAt: new Date(refund.created_at),
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
      'charge.success': WebhookEventType.PAYMENT_SUCCESS,
      'charge.failed': WebhookEventType.PAYMENT_FAILED,
      'subscription.create': WebhookEventType.SUBSCRIPTION_CREATED,
      'subscription.disable': WebhookEventType.SUBSCRIPTION_CANCELED,
      'subscription.not_renew': WebhookEventType.SUBSCRIPTION_CANCELED,
      'invoice.payment_failed': WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED,
      'refund.processed': WebhookEventType.REFUND_PROCESSED,
      'transfer.success': WebhookEventType.PAYMENT_SUCCESS,
      'transfer.failed': WebhookEventType.PAYMENT_FAILED,
    };
    return eventMap[event] ?? WebhookEventType.UNKNOWN;
  }

  private async getOrCreatePlan(input: CreateSubscriptionInput): Promise<PaystackPlan> {
    // Try to find existing plan
    try {
      const plans = await this.request<PaystackPlan[]>('GET', '/plan');
      const existing = plans.find(
        (p) =>
          p.name === input.planCode &&
          p.amount === input.amountCents &&
          p.currency === input.currency
      );
      if (existing) return existing;
    } catch {
      // Continue to create
    }

    // Create new plan
    const intervalMap: Record<string, string> = {
      daily: 'daily',
      weekly: 'weekly',
      monthly: 'monthly',
      quarterly: 'quarterly',
      yearly: 'annually',
    };

    return this.request<PaystackPlan>('POST', '/plan', {
      name: input.planCode,
      interval: intervalMap[input.interval] ?? 'monthly',
      amount: input.amountCents,
      currency: input.currency,
    });
  }
}
