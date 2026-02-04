/**
 * Stripe Payment Gateway Implementation
 *
 * Production-ready Stripe integration supporting:
 * - Customer management
 * - One-time payments
 * - Subscriptions with trials
 * - Hosted checkout (Stripe Checkout)
 * - Refunds
 * - Webhook handling
 *
 * Regions: Global (190+ countries)
 * Currencies: 135+ currencies
 */

import Stripe from 'stripe';

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

interface StripeGatewayConfig {
  secretKey: string;
  webhookSecret: string;
  apiVersion?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// STRIPE GATEWAY IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

export class StripeGateway implements PaymentGateway {
  public readonly type = PaymentGatewayType.STRIPE;
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  // Stripe supports 135+ currencies
  public readonly supportedCurrencies = [
    'USD',
    'EUR',
    'GBP',
    'CAD',
    'AUD',
    'JPY',
    'CNY',
    'INR',
    'BRL',
    'MXN',
    'SGD',
    'HKD',
    'NZD',
    'SEK',
    'NOK',
    'DKK',
    'CHF',
    'ZAR',
    'KRW',
    'THB',
    'MYR',
    'PHP',
    'IDR',
    'VND',
    'AED',
    'SAR',
    'EGP',
    'NGN',
    'KES',
    'GHS',
  ];

  // Stripe supports 190+ countries
  public readonly supportedCountries = [
    'US',
    'GB',
    'CA',
    'AU',
    'DE',
    'FR',
    'ES',
    'IT',
    'NL',
    'BE',
    'AT',
    'IE',
    'PT',
    'FI',
    'SE',
    'NO',
    'DK',
    'CH',
    'JP',
    'SG',
    'HK',
    'NZ',
    'MY',
    'IN',
    'BR',
    'MX',
    'AR',
    'CL',
    'CO',
    'PE',
    'ZA',
    'AE',
    'SA',
    'EG',
    'NG',
    'KE',
    'GH',
  ];

  constructor(config: StripeGatewayConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: (config.apiVersion ?? '2025-02-24.acacia') as Stripe.LatestApiVersion,
      typescript: true,
      maxNetworkRetries: 3,
      timeout: 30000,
    });
    this.webhookSecret = config.webhookSecret;
  }

  isAvailable(): boolean {
    return !!this.stripe;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CUSTOMER MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  async createCustomer(input: CreateCustomerInput): Promise<GatewayCustomer> {
    const params: Stripe.CustomerCreateParams = {
      email: input.email,
      name: input.name,
      phone: input.phone,
      metadata: {
        tenantId: input.metadata.tenantId,
        userId: input.metadata.userId ?? '',
        gatewayType: this.type,
      },
    };

    if (input.address) {
      params.address = {
        line1: input.address.line1,
        line2: input.address.line2,
        city: input.address.city,
        state: input.address.state,
        postal_code: input.address.postalCode,
        country: input.address.country,
      };
    }

    const customer = await this.stripe.customers.create(params, {
      idempotencyKey: `create-customer-${input.metadata.tenantId}-${input.metadata.userId}`,
    });

    return this.mapCustomer(customer);
  }

  async getCustomer(customerId: string): Promise<GatewayCustomer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if ((customer as Stripe.DeletedCustomer).deleted) {
        return null;
      }
      return this.mapCustomer(customer as Stripe.Customer);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async updateCustomer(customerId: string, input: UpdateCustomerInput): Promise<GatewayCustomer> {
    const params: Stripe.CustomerUpdateParams = {};

    if (input.email) params.email = input.email;
    if (input.name) params.name = input.name;
    if (input.phone) params.phone = input.phone;
    if (input.metadata) params.metadata = input.metadata;

    if (input.address) {
      params.address = {
        line1: input.address.line1,
        line2: input.address.line2,
        city: input.address.city,
        state: input.address.state,
        postal_code: input.address.postalCode,
        country: input.address.country,
      };
    }

    const customer = await this.stripe.customers.update(customerId, params);
    return this.mapCustomer(customer);
  }

  async deleteCustomer(customerId: string): Promise<boolean> {
    try {
      await this.stripe.customers.del(customerId);
      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAYMENT PROCESSING
  // ════════════════════════════════════════════════════════════════════════════

  async createPayment(input: CreatePaymentInput): Promise<GatewayPayment> {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: input.amountCents,
      currency: input.currency.toLowerCase(),
      customer: input.customerId,
      description: input.description,
      metadata: input.metadata as Record<string, string>,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always',
      },
    };

    if (input.paymentMethodId) {
      params.payment_method = input.paymentMethodId;
      params.confirm = true;
    }

    if (input.returnUrl) {
      params.return_url = input.returnUrl;
    }

    const options: Stripe.RequestOptions = {};
    if (input.idempotencyKey) {
      options.idempotencyKey = input.idempotencyKey;
    }

    const paymentIntent = await this.stripe.paymentIntents.create(params, options);

    return this.mapPaymentIntent(paymentIntent);
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(input.reference);
    const payment = this.mapPaymentIntent(paymentIntent);

    return {
      verified: paymentIntent.status === 'succeeded',
      status: payment.status,
      payment,
    };
  }

  async getPayment(paymentId: string): Promise<GatewayPayment | null> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);
      return this.mapPaymentIntent(paymentIntent);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  async createSubscription(input: CreateSubscriptionInput): Promise<GatewaySubscription> {
    // First, create or retrieve the price
    const price = await this.getOrCreatePrice(input);

    const params: Stripe.SubscriptionCreateParams = {
      customer: input.customerId,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        ...(input.metadata as Record<string, string>),
        planCode: input.planCode,
      },
    };

    if (input.trialDays && input.trialDays > 0) {
      params.trial_period_days = input.trialDays;
    }

    if (input.startDate) {
      params.billing_cycle_anchor = Math.floor(input.startDate.getTime() / 1000);
    }

    const options: Stripe.RequestOptions = {};
    if (input.idempotencyKey) {
      options.idempotencyKey = input.idempotencyKey;
    }

    const subscription = await this.stripe.subscriptions.create(params, options);
    return this.mapSubscription(subscription);
  }

  async getSubscription(subscriptionId: string): Promise<GatewaySubscription | null> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice'],
      });
      return this.mapSubscription(subscription);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async updateSubscription(
    subscriptionId: string,
    input: UpdateSubscriptionInput
  ): Promise<GatewaySubscription> {
    const params: Stripe.SubscriptionUpdateParams = {
      proration_behavior: 'create_prorations',
    };

    if (input.metadata) {
      params.metadata = input.metadata;
    }

    if (input.cancelAtPeriodEnd !== undefined) {
      params.cancel_at_period_end = input.cancelAtPeriodEnd;
    }

    if (input.quantity !== undefined) {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      const itemId = subscription.items.data[0]?.id;
      if (itemId) {
        params.items = [{ id: itemId, quantity: input.quantity }];
      }
    }

    const subscription = await this.stripe.subscriptions.update(subscriptionId, params);
    return this.mapSubscription(subscription);
  }

  async cancelSubscription(
    subscriptionId: string,
    options?: { immediate?: boolean }
  ): Promise<GatewaySubscription> {
    let subscription: Stripe.Subscription;

    if (options?.immediate) {
      subscription = await this.stripe.subscriptions.cancel(subscriptionId);
    } else {
      subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    return this.mapSubscription(subscription);
  }

  async resumeSubscription(subscriptionId: string): Promise<GatewaySubscription> {
    const subscription = await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
    return this.mapSubscription(subscription);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REFUNDS
  // ════════════════════════════════════════════════════════════════════════════

  async createRefund(input: CreateRefundInput): Promise<GatewayRefund> {
    const params: Stripe.RefundCreateParams = {
      payment_intent: input.paymentId,
      reason: this.mapRefundReason(input.reason),
      metadata: input.metadata as Record<string, string>,
    };

    if (input.amountCents) {
      params.amount = input.amountCents;
    }

    const options: Stripe.RequestOptions = {};
    if (input.idempotencyKey) {
      options.idempotencyKey = input.idempotencyKey;
    }

    const refund = await this.stripe.refunds.create(params, options);
    return this.mapRefund(refund);
  }

  async getRefund(refundId: string): Promise<GatewayRefund | null> {
    try {
      const refund = await this.stripe.refunds.retrieve(refundId);
      return this.mapRefund(refund);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHECKOUT
  // ════════════════════════════════════════════════════════════════════════════

  async createCheckoutSession(input: CreateCheckoutInput): Promise<GatewayCheckoutSession> {
    const intervalMap: Record<string, Stripe.Price.Recurring.Interval> = {
      monthly: 'month',
      yearly: 'year',
    };

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = input.items.map((item) => ({
      price_data: {
        currency: input.currency.toLowerCase(),
        product_data: {
          name: item.name,
          description: item.description,
        },
        unit_amount: item.amountCents,
        ...(input.mode === 'subscription' && input.subscriptionData
          ? {
              recurring: {
                interval: intervalMap[input.subscriptionData.interval] ?? 'month',
              },
            }
          : {}),
      },
      quantity: item.quantity,
    }));

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: input.mode,
      line_items: lineItems,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      allow_promotion_codes: input.allowPromotionCodes,
      metadata: input.metadata as Record<string, string>,
    };

    if (input.customerId) {
      params.customer = input.customerId;
    } else if (input.customerEmail) {
      params.customer_email = input.customerEmail;
    }

    if (input.mode === 'subscription' && input.subscriptionData?.trialDays) {
      params.subscription_data = {
        trial_period_days: input.subscriptionData.trialDays,
      };
    }

    const session = await this.stripe.checkout.sessions.create(params);

    return {
      id: session.id,
      gatewayType: this.type,
      url: session.url!,
      reference: session.id,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
      rawResponse: session,
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
      const signature = headers['stripe-signature'];
      if (!signature) {
        return { verified: false, error: 'Missing stripe-signature header' };
      }

      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);

      return {
        verified: true,
        event: {
          id: event.id,
          gatewayType: this.type,
          eventType: this.mapWebhookEventType(event.type),
          data: event.data.object,
          timestamp: new Date(event.created * 1000),
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

  private mapCustomer(customer: Stripe.Customer): GatewayCustomer {
    return {
      id: customer.id,
      gatewayType: this.type,
      email: customer.email ?? '',
      name: customer.name ?? undefined,
      phone: customer.phone ?? undefined,
      address: customer.address
        ? {
            line1: customer.address.line1 ?? undefined,
            line2: customer.address.line2 ?? undefined,
            city: customer.address.city ?? undefined,
            state: customer.address.state ?? undefined,
            postalCode: customer.address.postal_code ?? undefined,
            country: customer.address.country ?? 'US',
          }
        : undefined,
      metadata: (customer.metadata as Record<string, string>) ?? {},
      createdAt: new Date(customer.created * 1000),
      rawResponse: customer,
    };
  }

  private mapPaymentIntent(pi: Stripe.PaymentIntent): GatewayPayment {
    return {
      id: pi.id,
      gatewayType: this.type,
      customerId: typeof pi.customer === 'string' ? pi.customer : (pi.customer?.id ?? ''),
      amountCents: pi.amount,
      currency: pi.currency.toUpperCase(),
      status: this.mapPaymentStatus(pi.status),
      description: pi.description ?? undefined,
      metadata: (pi.metadata as Record<string, string>) ?? {},
      reference: pi.id,
      paidAt: pi.status === 'succeeded' ? new Date() : undefined,
      createdAt: new Date(pi.created * 1000),
      rawResponse: pi,
    };
  }

  private mapPaymentStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
    const statusMap: Record<Stripe.PaymentIntent.Status, PaymentStatus> = {
      requires_payment_method: PaymentStatus.REQUIRES_PAYMENT_METHOD,
      requires_confirmation: PaymentStatus.PENDING,
      requires_action: PaymentStatus.REQUIRES_ACTION,
      processing: PaymentStatus.PROCESSING,
      requires_capture: PaymentStatus.PENDING,
      canceled: PaymentStatus.CANCELED,
      succeeded: PaymentStatus.SUCCEEDED,
    };
    return statusMap[status] ?? PaymentStatus.PENDING;
  }

  private mapSubscription(sub: Stripe.Subscription): GatewaySubscription {
    const item = sub.items.data[0];
    return {
      id: sub.id,
      gatewayType: this.type,
      customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      planCode: sub.metadata?.planCode ?? item?.price.id ?? '',
      status: this.mapSubscriptionStatus(sub.status),
      amountCents: item?.price.unit_amount ?? 0,
      currency: sub.currency.toUpperCase(),
      interval: item?.price.recurring?.interval ?? 'month',
      quantity: item?.quantity ?? 1,
      trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : undefined,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : undefined,
      endedAt: sub.ended_at ? new Date(sub.ended_at * 1000) : undefined,
      metadata: (sub.metadata as Record<string, string>) ?? {},
      createdAt: new Date(sub.created * 1000),
      rawResponse: sub,
    };
  }

  private mapSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionGatewayStatus {
    const statusMap: Record<Stripe.Subscription.Status, SubscriptionGatewayStatus> = {
      active: SubscriptionGatewayStatus.ACTIVE,
      trialing: SubscriptionGatewayStatus.TRIALING,
      past_due: SubscriptionGatewayStatus.PAST_DUE,
      canceled: SubscriptionGatewayStatus.CANCELED,
      unpaid: SubscriptionGatewayStatus.UNPAID,
      incomplete: SubscriptionGatewayStatus.UNPAID,
      incomplete_expired: SubscriptionGatewayStatus.CANCELED,
      paused: SubscriptionGatewayStatus.PAUSED,
    };
    return statusMap[status] ?? SubscriptionGatewayStatus.ACTIVE;
  }

  private mapRefund(refund: Stripe.Refund): GatewayRefund {
    return {
      id: refund.id,
      gatewayType: this.type,
      paymentId:
        typeof refund.payment_intent === 'string'
          ? refund.payment_intent
          : (refund.payment_intent?.id ?? ''),
      amountCents: refund.amount,
      currency: refund.currency.toUpperCase(),
      status: this.mapRefundStatus(refund.status),
      reason: refund.reason ?? undefined,
      createdAt: new Date(refund.created * 1000),
      rawResponse: refund,
    };
  }

  private mapRefundStatus(status: string | null): RefundStatus {
    if (!status) return RefundStatus.PENDING;
    const statusMap: Record<string, RefundStatus> = {
      pending: RefundStatus.PENDING,
      succeeded: RefundStatus.SUCCEEDED,
      failed: RefundStatus.FAILED,
      canceled: RefundStatus.CANCELED,
      requires_action: RefundStatus.PENDING,
    };
    return statusMap[status] ?? RefundStatus.PENDING;
  }

  private mapRefundReason(
    reason?: string
  ): 'duplicate' | 'fraudulent' | 'requested_by_customer' | undefined {
    if (!reason) return undefined;
    const reasonMap: Record<string, 'duplicate' | 'fraudulent' | 'requested_by_customer'> = {
      duplicate: 'duplicate',
      fraudulent: 'fraudulent',
      requested_by_customer: 'requested_by_customer',
      customer_request: 'requested_by_customer',
    };
    return reasonMap[reason.toLowerCase()];
  }

  private mapWebhookEventType(type: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'payment_intent.succeeded': WebhookEventType.PAYMENT_SUCCESS,
      'payment_intent.payment_failed': WebhookEventType.PAYMENT_FAILED,
      'customer.subscription.created': WebhookEventType.SUBSCRIPTION_CREATED,
      'customer.subscription.updated': WebhookEventType.SUBSCRIPTION_UPDATED,
      'customer.subscription.deleted': WebhookEventType.SUBSCRIPTION_CANCELED,
      'invoice.paid': WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCESS,
      'invoice.payment_failed': WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED,
      'charge.refunded': WebhookEventType.REFUND_PROCESSED,
      'charge.dispute.created': WebhookEventType.CHARGE_DISPUTE,
      'customer.updated': WebhookEventType.CUSTOMER_UPDATED,
    };
    return eventMap[type] ?? WebhookEventType.UNKNOWN;
  }

  private async getOrCreatePrice(input: CreateSubscriptionInput): Promise<Stripe.Price> {
    // Try to find existing price by plan code
    const existingPrices = await this.stripe.prices.search({
      query: `metadata["planCode"]:"${input.planCode}" AND active:"true"`,
      limit: 1,
    });

    if (existingPrices.data.length > 0) {
      return existingPrices.data[0];
    }

    // Create a new price with a product
    const product = await this.stripe.products.create({
      name: input.planCode,
      metadata: { planCode: input.planCode },
    });

    const intervalMap: Record<string, Stripe.PriceCreateParams.Recurring.Interval> = {
      daily: 'day',
      weekly: 'week',
      monthly: 'month',
      quarterly: 'month',
      yearly: 'year',
    };

    const intervalCountMap: Record<string, number> = {
      quarterly: 3,
    };

    const price = await this.stripe.prices.create({
      product: product.id,
      unit_amount: input.amountCents,
      currency: input.currency.toLowerCase(),
      recurring: {
        interval: intervalMap[input.interval] ?? 'month',
        interval_count: intervalCountMap[input.interval] ?? 1,
      },
      metadata: { planCode: input.planCode },
    });

    return price;
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      error instanceof Stripe.errors.StripeInvalidRequestError && error.code === 'resource_missing'
    );
  }
}
