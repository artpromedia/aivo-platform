/**
 * Mercado Pago Payment Gateway Implementation
 *
 * Production-ready Mercado Pago integration for Latin America:
 * - Argentina (ARS)
 * - Brazil (BRL)
 * - Chile (CLP)
 * - Colombia (COP)
 * - Mexico (MXN)
 * - Peru (PEN)
 * - Uruguay (UYU)
 *
 * Features:
 * - Credit/debit cards
 * - Pix (Brazil instant payments)
 * - Boleto (Brazil bank slips)
 * - OXXO (Mexico cash payments)
 * - Bank transfers
 * - Mercado Pago wallet
 * - Subscriptions
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

interface MercadoPagoConfig {
  accessToken: string;
  publicKey: string;
  webhookSecret?: string;
  baseUrl?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MERCADO PAGO API TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface MPCustomer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: {
    area_code?: string;
    number?: string;
  };
  address?: {
    id?: string;
    zip_code?: string;
    street_name?: string;
    street_number?: number;
    city?: {
      name?: string;
    };
  };
  identification?: {
    type?: string;
    number?: string;
  };
  date_registered?: string;
  metadata?: Record<string, unknown>;
}

interface MPPayment {
  id: number;
  date_created: string;
  date_approved?: string;
  date_last_updated: string;
  money_release_date?: string;
  operation_type: string;
  payment_method_id: string;
  payment_type_id: string;
  status: string;
  status_detail: string;
  currency_id: string;
  description?: string;
  collector_id: number;
  payer: {
    id?: number;
    email?: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type?: string;
      number?: string;
    };
  };
  metadata?: Record<string, unknown>;
  additional_info?: {
    items?: Array<{
      id?: string;
      title?: string;
      quantity?: number;
      unit_price?: number;
    }>;
  };
  transaction_amount: number;
  transaction_amount_refunded?: number;
  coupon_amount?: number;
  transaction_details?: {
    net_received_amount?: number;
    total_paid_amount?: number;
    overpaid_amount?: number;
    installment_amount?: number;
  };
  fee_details?: Array<{
    type?: string;
    amount?: number;
    fee_payer?: string;
  }>;
  captured?: boolean;
  binary_mode?: boolean;
  external_reference?: string;
  notification_url?: string;
  callback_url?: string;
  point_of_interaction?: {
    type?: string;
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

interface MPPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  date_created: string;
  collector_id: number;
  external_reference?: string;
  items: Array<{
    id?: string;
    title: string;
    description?: string;
    quantity: number;
    currency_id: string;
    unit_price: number;
  }>;
  payer?: {
    name?: string;
    email?: string;
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  notification_url?: string;
  auto_return?: string;
  expires?: boolean;
  expiration_date_from?: string;
  expiration_date_to?: string;
  metadata?: Record<string, unknown>;
}

interface MPPlan {
  id: string;
  status: string;
  reason: string;
  frequency: number;
  frequency_type: string;
  repetitions?: number;
  billing_day?: number;
  billing_day_proportional?: boolean;
  free_trial?: {
    frequency: number;
    frequency_type: string;
  };
  transaction_amount: number;
  currency_id: string;
  date_created: string;
  last_modified: string;
}

interface MPSubscription {
  id: string;
  status: string;
  reason: string;
  payer_id: number;
  preapproval_plan_id: string;
  external_reference?: string;
  date_created: string;
  last_modified: string;
  auto_recurring: {
    frequency: number;
    frequency_type: string;
    transaction_amount: number;
    currency_id: string;
    start_date?: string;
    end_date?: string;
    free_trial?: {
      frequency: number;
      frequency_type: string;
    };
  };
  summarized?: {
    quotas?: number;
    charged_quantity?: number;
    pending_charge_quantity?: number;
    charged_amount?: number;
    pending_charge_amount?: number;
    semaphore?: string;
    last_charged_date?: string;
    last_charged_amount?: number;
  };
  next_payment_date?: string;
}

interface MPRefund {
  id: number;
  payment_id: number;
  amount: number;
  metadata?: Record<string, unknown>;
  source?: {
    id?: string;
    name?: string;
    type?: string;
  };
  date_created: string;
  status: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MERCADO PAGO GATEWAY IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

export class MercadoPagoGateway implements PaymentGateway {
  public readonly type = PaymentGatewayType.MERCADO_PAGO;
  private readonly accessToken: string;
  private readonly publicKey: string;
  private readonly webhookSecret?: string;
  private readonly baseUrl: string;

  public readonly supportedCurrencies = [
    'ARS', // Argentina
    'BRL', // Brazil
    'CLP', // Chile
    'COP', // Colombia
    'MXN', // Mexico
    'PEN', // Peru
    'UYU', // Uruguay
    'USD', // International
  ];

  public readonly supportedCountries = ['AR', 'BR', 'CL', 'CO', 'MX', 'PE', 'UY'];

  constructor(config: MercadoPagoConfig) {
    this.accessToken = config.accessToken;
    this.publicKey = config.publicKey;
    this.webhookSecret = config.webhookSecret;
    this.baseUrl = config.baseUrl ?? 'https://api.mercadopago.com';
  }

  isAvailable(): boolean {
    return !!this.accessToken && !!this.publicKey;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HTTP CLIENT
  // ════════════════════════════════════════════════════════════════════════════

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    idempotencyKey?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as { message?: string; cause?: Array<{ description?: string }> };
      const message =
        error.message ?? error.cause?.[0]?.description ?? `MP API error: ${response.status}`;
      throw new Error(message);
    }

    return data as T;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CUSTOMER MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  async createCustomer(input: CreateCustomerInput): Promise<GatewayCustomer> {
    const [firstName, ...lastNameParts] = (input.name ?? '').split(' ');
    const lastName = lastNameParts.join(' ');

    const customer = await this.request<MPCustomer>('POST', '/v1/customers', {
      email: input.email,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      phone: input.phone
        ? {
            area_code: '',
            number: input.phone,
          }
        : undefined,
      address: input.address
        ? {
            zip_code: input.address.postalCode,
            street_name: input.address.line1,
            city: {
              name: input.address.city,
            },
          }
        : undefined,
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
      const customer = await this.request<MPCustomer>(
        'GET',
        `/v1/customers/${customerId}`
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

    const customer = await this.request<MPCustomer>(
      'PUT',
      `/v1/customers/${customerId}`,
      {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        phone: input.phone
          ? {
              area_code: '',
              number: input.phone,
            }
          : undefined,
        address: input.address
          ? {
              zip_code: input.address.postalCode,
              street_name: input.address.line1,
              city: {
                name: input.address.city,
              },
            }
          : undefined,
        metadata: input.metadata,
      }
    );

    return this.mapCustomer(customer);
  }

  async deleteCustomer(_customerId: string): Promise<boolean> {
    // Mercado Pago doesn't support customer deletion
    return true;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAYMENT PROCESSING
  // ════════════════════════════════════════════════════════════════════════════

  async createPayment(input: CreatePaymentInput): Promise<GatewayPayment> {
    const externalReference = input.idempotencyKey ?? this.generateReference();

    const payment = await this.request<MPPayment>(
      'POST',
      '/v1/payments',
      {
        transaction_amount: input.amountCents / 100, // MP uses decimal amounts
        currency_id: input.currency,
        description: input.description,
        payer: {
          email: input.metadata?.email ?? 'unknown@example.com',
        },
        external_reference: externalReference,
        notification_url: input.callbackUrl,
        callback_url: input.returnUrl,
        metadata: {
          ...input.metadata,
          customerId: input.customerId,
        },
        binary_mode: false, // Allow pending state
      },
      input.idempotencyKey
    );

    return this.mapPayment(payment);
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    const payment = await this.request<MPPayment>('GET', `/v1/payments/${input.reference}`);
    const gatewayPayment = this.mapPayment(payment);

    return {
      verified: payment.status === 'approved',
      status: gatewayPayment.status,
      payment: gatewayPayment,
    };
  }

  async getPayment(paymentId: string): Promise<GatewayPayment | null> {
    try {
      const payment = await this.request<MPPayment>('GET', `/v1/payments/${paymentId}`);
      return this.mapPayment(payment);
    } catch {
      return null;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  async createSubscription(input: CreateSubscriptionInput): Promise<GatewaySubscription> {
    // First create or get the plan
    const plan = await this.getOrCreatePlan(input);

    // Create subscription (preapproval)
    const subscription = await this.request<MPSubscription>('POST', '/preapproval', {
      preapproval_plan_id: plan.id,
      payer_email: input.metadata?.email ?? 'unknown@example.com',
      card_token_id: undefined, // Card will be collected during checkout
      external_reference: input.planCode,
      reason: input.planCode,
      auto_recurring: {
        frequency: this.getFrequency(input.interval),
        frequency_type: this.getFrequencyType(input.interval),
        transaction_amount: input.amountCents / 100,
        currency_id: input.currency,
        start_date: input.startDate?.toISOString(),
        free_trial: input.trialDays
          ? {
              frequency: input.trialDays,
              frequency_type: 'days',
            }
          : undefined,
      },
    });

    return this.mapSubscription(subscription, plan);
  }

  async getSubscription(subscriptionId: string): Promise<GatewaySubscription | null> {
    try {
      const subscription = await this.request<MPSubscription>(
        'GET',
        `/preapproval/${subscriptionId}`
      );

      // Get the plan
      let plan: MPPlan | undefined;
      if (subscription.preapproval_plan_id) {
        try {
          plan = await this.request<MPPlan>(
            'GET',
            `/preapproval_plan/${subscription.preapproval_plan_id}`
          );
        } catch {
          // Plan may not exist
        }
      }

      return this.mapSubscription(subscription, plan);
    } catch {
      return null;
    }
  }

  async updateSubscription(
    subscriptionId: string,
    input: UpdateSubscriptionInput
  ): Promise<GatewaySubscription> {
    const updateData: Record<string, unknown> = {};

    if (input.amountCents !== undefined) {
      updateData.auto_recurring = {
        transaction_amount: input.amountCents / 100,
      };
    }

    if (input.metadata) {
      updateData.external_reference = JSON.stringify(input.metadata);
    }

    const subscription = await this.request<MPSubscription>(
      'PUT',
      `/preapproval/${subscriptionId}`,
      updateData
    );

    return this.mapSubscription(subscription);
  }

  async cancelSubscription(
    subscriptionId: string,
    _options?: { immediate?: boolean }
  ): Promise<GatewaySubscription> {
    const subscription = await this.request<MPSubscription>(
      'PUT',
      `/preapproval/${subscriptionId}`,
      {
        status: 'cancelled',
      }
    );

    return this.mapSubscription(subscription);
  }

  async resumeSubscription(subscriptionId: string): Promise<GatewaySubscription> {
    const subscription = await this.request<MPSubscription>(
      'PUT',
      `/preapproval/${subscriptionId}`,
      {
        status: 'authorized',
      }
    );

    return this.mapSubscription(subscription);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REFUNDS
  // ════════════════════════════════════════════════════════════════════════════

  async createRefund(input: CreateRefundInput): Promise<GatewayRefund> {
    const refund = await this.request<MPRefund>(
      'POST',
      `/v1/payments/${input.paymentId}/refunds`,
      {
        amount: input.amountCents ? input.amountCents / 100 : undefined,
        metadata: input.metadata,
      },
      input.idempotencyKey
    );

    return this.mapRefund(refund);
  }

  async getRefund(refundId: string): Promise<GatewayRefund | null> {
    try {
      // Mercado Pago requires payment ID to fetch refund
      // For simplicity, we search across recent payments
      const refund = await this.request<MPRefund>('GET', `/v1/refunds/${refundId}`);
      return this.mapRefund(refund);
    } catch {
      return null;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHECKOUT (Preferences)
  // ════════════════════════════════════════════════════════════════════════════

  async createCheckoutSession(input: CreateCheckoutInput): Promise<GatewayCheckoutSession> {
    const externalReference = this.generateReference();

    const items = input.items.map((item, index) => ({
      id: `item_${index}`,
      title: item.name,
      description: item.description,
      quantity: item.quantity,
      currency_id: input.currency,
      unit_price: item.amountCents / 100, // MP uses decimal amounts
    }));

    const preference = await this.request<MPPreference>('POST', '/checkout/preferences', {
      items,
      payer: input.customerEmail
        ? {
            email: input.customerEmail,
          }
        : undefined,
      back_urls: {
        success: input.successUrl,
        failure: input.cancelUrl,
        pending: input.successUrl,
      },
      notification_url: input.callbackUrl,
      auto_return: 'approved',
      external_reference: externalReference,
      metadata: {
        ...input.metadata,
        customerId: input.customerId,
      },
    });

    return {
      id: preference.id,
      gatewayType: this.type,
      url: preference.init_point,
      reference: preference.external_reference ?? externalReference,
      rawResponse: preference,
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
      // Mercado Pago webhook verification
      const signature = headers['x-signature'];
      const requestId = headers['x-request-id'];

      const payloadString = typeof payload === 'string' ? payload : payload.toString();

      // If webhook secret is configured, verify signature
      if (this.webhookSecret && signature) {
        // MP signature format: ts=xxx,v1=xxx
        const [tsHeader, signatureHeader] = signature.split(',');
        const ts = tsHeader?.split('=')?.[1];
        const v1 = signatureHeader?.split('=')?.[1];

        if (ts && v1) {
          // Parse the notification to get data.id
          const notification = JSON.parse(payloadString) as {
            data?: { id?: string };
          };
          const dataId = notification.data?.id ?? '';

          // Build the string to sign
          const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

          const expectedSignature = crypto
            .createHmac('sha256', this.webhookSecret)
            .update(manifest)
            .digest('hex');

          if (expectedSignature !== v1) {
            return { verified: false, error: 'Invalid signature' };
          }
        }
      }

      const event = JSON.parse(payloadString) as {
        id: number;
        type: string;
        data: { id: string };
        action: string;
        date_created: string;
      };

      // Fetch the actual payment/subscription data
      let data: unknown = event.data;
      if (event.type === 'payment' && event.data.id) {
        try {
          data = await this.request<MPPayment>('GET', `/v1/payments/${event.data.id}`);
        } catch {
          // Use original data
        }
      }

      return {
        verified: true,
        event: {
          id: String(event.id),
          gatewayType: this.type,
          eventType: this.mapWebhookEventType(event.type, event.action),
          data,
          timestamp: new Date(event.date_created),
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

  private getFrequency(interval: string): number {
    const map: Record<string, number> = {
      daily: 1,
      weekly: 1,
      monthly: 1,
      quarterly: 3,
      yearly: 12,
    };
    return map[interval] ?? 1;
  }

  private getFrequencyType(interval: string): string {
    const map: Record<string, string> = {
      daily: 'days',
      weekly: 'days',
      monthly: 'months',
      quarterly: 'months',
      yearly: 'months',
    };
    return map[interval] ?? 'months';
  }

  private mapCustomer(customer: MPCustomer): GatewayCustomer {
    return {
      id: customer.id,
      gatewayType: this.type,
      email: customer.email,
      name:
        customer.first_name || customer.last_name
          ? `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim()
          : undefined,
      phone: customer.phone?.number,
      address: customer.address
        ? {
            line1: customer.address.street_name,
            city: customer.address.city?.name,
            postalCode: customer.address.zip_code,
            country: 'BR', // Default, adjust based on account
          }
        : undefined,
      metadata: (customer.metadata as Record<string, string>) ?? {},
      createdAt: customer.date_registered
        ? new Date(customer.date_registered)
        : new Date(),
      rawResponse: customer,
    };
  }

  private mapPayment(payment: MPPayment): GatewayPayment {
    return {
      id: String(payment.id),
      gatewayType: this.type,
      customerId: String(payment.payer.id ?? ''),
      amountCents: Math.round(payment.transaction_amount * 100),
      currency: payment.currency_id,
      status: this.mapPaymentStatus(payment.status),
      description: payment.description,
      metadata: (payment.metadata as Record<string, string>) ?? {},
      reference: payment.external_reference ?? String(payment.id),
      authorizationUrl: payment.point_of_interaction?.transaction_data?.ticket_url,
      paidAt: payment.date_approved ? new Date(payment.date_approved) : undefined,
      createdAt: new Date(payment.date_created),
      rawResponse: payment,
    };
  }

  private mapPaymentStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      pending: PaymentStatus.PENDING,
      approved: PaymentStatus.SUCCEEDED,
      authorized: PaymentStatus.REQUIRES_ACTION,
      in_process: PaymentStatus.PROCESSING,
      in_mediation: PaymentStatus.PROCESSING,
      rejected: PaymentStatus.FAILED,
      cancelled: PaymentStatus.CANCELED,
      refunded: PaymentStatus.REFUNDED,
      charged_back: PaymentStatus.REFUNDED,
    };
    return statusMap[status] ?? PaymentStatus.PENDING;
  }

  private mapSubscription(
    subscription: MPSubscription,
    plan?: MPPlan
  ): GatewaySubscription {
    const nextPayment = subscription.next_payment_date
      ? new Date(subscription.next_payment_date)
      : new Date();

    // Calculate current period based on next payment
    const currentPeriodEnd = nextPayment;
    const currentPeriodStart = new Date(currentPeriodEnd);
    if (subscription.auto_recurring.frequency_type === 'months') {
      currentPeriodStart.setMonth(
        currentPeriodStart.getMonth() - subscription.auto_recurring.frequency
      );
    } else if (subscription.auto_recurring.frequency_type === 'days') {
      currentPeriodStart.setDate(
        currentPeriodStart.getDate() - subscription.auto_recurring.frequency
      );
    }

    return {
      id: subscription.id,
      gatewayType: this.type,
      customerId: String(subscription.payer_id),
      planCode: plan?.reason ?? subscription.external_reference ?? '',
      status: this.mapSubscriptionStatus(subscription.status),
      amountCents: Math.round(subscription.auto_recurring.transaction_amount * 100),
      currency: subscription.auto_recurring.currency_id,
      interval: `${subscription.auto_recurring.frequency_type}`,
      quantity: 1,
      trialStart: subscription.auto_recurring.free_trial
        ? new Date(subscription.date_created)
        : undefined,
      trialEnd: subscription.auto_recurring.free_trial
        ? new Date(
            new Date(subscription.date_created).getTime() +
              subscription.auto_recurring.free_trial.frequency *
                (subscription.auto_recurring.free_trial.frequency_type === 'days'
                  ? 24 * 60 * 60 * 1000
                  : 30 * 24 * 60 * 60 * 1000)
          )
        : undefined,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.status === 'pending',
      metadata: {},
      createdAt: new Date(subscription.date_created),
      rawResponse: subscription,
    };
  }

  private mapSubscriptionStatus(status: string): SubscriptionGatewayStatus {
    const statusMap: Record<string, SubscriptionGatewayStatus> = {
      pending: SubscriptionGatewayStatus.TRIALING,
      authorized: SubscriptionGatewayStatus.ACTIVE,
      paused: SubscriptionGatewayStatus.PAUSED,
      cancelled: SubscriptionGatewayStatus.CANCELED,
    };
    return statusMap[status] ?? SubscriptionGatewayStatus.ACTIVE;
  }

  private mapRefund(refund: MPRefund): GatewayRefund {
    return {
      id: String(refund.id),
      gatewayType: this.type,
      paymentId: String(refund.payment_id),
      amountCents: Math.round(refund.amount * 100),
      currency: 'BRL', // Default, should come from payment
      status: this.mapRefundStatus(refund.status),
      createdAt: new Date(refund.date_created),
      rawResponse: refund,
    };
  }

  private mapRefundStatus(status: string): RefundStatus {
    const statusMap: Record<string, RefundStatus> = {
      pending: RefundStatus.PENDING,
      approved: RefundStatus.SUCCEEDED,
      rejected: RefundStatus.FAILED,
    };
    return statusMap[status] ?? RefundStatus.PENDING;
  }

  private mapWebhookEventType(type: string, action: string): WebhookEventType {
    if (type === 'payment') {
      if (action === 'payment.created' || action === 'payment.updated') {
        return WebhookEventType.PAYMENT_SUCCESS;
      }
    }

    if (type === 'subscription_preapproval') {
      if (action === 'created') {
        return WebhookEventType.SUBSCRIPTION_CREATED;
      }
      if (action === 'updated') {
        return WebhookEventType.SUBSCRIPTION_UPDATED;
      }
    }

    const eventMap: Record<string, WebhookEventType> = {
      'payment.created': WebhookEventType.PAYMENT_SUCCESS,
      'payment.updated': WebhookEventType.PAYMENT_SUCCESS,
      payment: WebhookEventType.PAYMENT_SUCCESS,
      subscription_preapproval: WebhookEventType.SUBSCRIPTION_UPDATED,
      subscription_authorized_payment: WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCESS,
    };

    return eventMap[type] ?? WebhookEventType.UNKNOWN;
  }

  private async getOrCreatePlan(input: CreateSubscriptionInput): Promise<MPPlan> {
    // Try to find existing plan
    try {
      const plans = await this.request<{ results: MPPlan[] }>(
        'GET',
        `/preapproval_plan/search?status=active&q=${encodeURIComponent(input.planCode)}`
      );

      const existing = plans.results.find(
        (p) =>
          p.reason === input.planCode &&
          Math.round(p.transaction_amount * 100) === input.amountCents
      );
      if (existing) return existing;
    } catch {
      // Continue to create
    }

    // Create new plan
    return this.request<MPPlan>('POST', '/preapproval_plan', {
      reason: input.planCode,
      frequency: this.getFrequency(input.interval),
      frequency_type: this.getFrequencyType(input.interval),
      transaction_amount: input.amountCents / 100,
      currency_id: input.currency,
      free_trial: input.trialDays
        ? {
            frequency: input.trialDays,
            frequency_type: 'days',
          }
        : undefined,
    });
  }
}
