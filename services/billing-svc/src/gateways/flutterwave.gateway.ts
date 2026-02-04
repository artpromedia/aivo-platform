/**
 * Flutterwave Payment Gateway Implementation
 *
 * Flutterwave provides comprehensive payment coverage across Africa with support for:
 * - 34+ African countries
 * - Card payments (local and international)
 * - Mobile money (MTN, Airtel, Vodafone, M-Pesa)
 * - Bank transfers
 * - USSD
 * - Francophone mobile money
 * - Barter (Flutterwave wallet)
 *
 * Regional Focus: Pan-African (Nigeria, Ghana, Kenya, South Africa, Tanzania, Uganda, Rwanda, etc.)
 * Supported Currencies: NGN, GHS, KES, ZAR, TZS, UGX, RWF, XOF, XAF, USD, EUR, GBP
 */

import {
  type PaymentGateway,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type CreatePaymentInput,
  type VerifyPaymentInput,
  type CreateSubscriptionInput,
  type UpdateSubscriptionInput,
  type CreateRefundInput,
  type CreateCheckoutInput,
  type GatewayCustomer,
  type GatewayPayment,
  type GatewaySubscription,
  type GatewayRefund,
  type GatewayCheckoutSession,
  type WebhookVerificationResult,
  PaymentGatewayType,
  PaymentStatus,
  SubscriptionGatewayStatus,
  RefundStatus,
  WebhookEventType,
} from './payment-gateway.interface.js';

interface FlutterwaveConfig {
  secretKey: string;
  publicKey: string;
  encryptionKey: string;
  webhookSecretHash?: string;
  environment: 'sandbox' | 'production';
}

interface FlutterwaveCustomer {
  id: number;
  email: string;
  name: string;
  phone_number: string;
  created_at: string;
}

interface FlutterwaveTransaction {
  id: number;
  tx_ref: string;
  flw_ref: string;
  amount: number;
  currency: string;
  charged_amount: number;
  app_fee: number;
  merchant_fee: number;
  status: string;
  payment_type: string;
  created_at: string;
  customer: FlutterwaveCustomer;
}

interface FlutterwavePaymentPlan {
  id: number;
  name: string;
  amount: number;
  interval: string;
  duration: number;
  status: string;
  currency: string;
  plan_token: string;
  created_at: string;
}

interface FlutterwaveSubscription {
  id: number;
  amount: number;
  customer: FlutterwaveCustomer;
  plan: number;
  status: string;
  created_at: string;
}

interface FlutterwaveRefund {
  id: number;
  account_id: number;
  tx_id: number;
  flw_ref: string;
  amount_refunded: number;
  status: string;
  created_at: string;
}

// Country-specific payment methods
const FLUTTERWAVE_PAYMENT_METHODS: Record<string, string[]> = {
  NG: ['card', 'banktransfer', 'ussd', 'account', 'barter', 'nqr'],
  GH: ['card', 'mobilemoneyghs', 'banktransfer'],
  KE: ['card', 'mpesa', 'banktransfer'],
  ZA: ['card', 'banktransfer'],
  TZ: ['card', 'mobilemoneytanzania', 'banktransfer'],
  UG: ['card', 'mobilemoneyuganda', 'banktransfer'],
  RW: ['card', 'mobilemoneyrwanda', 'banktransfer'],
  ZM: ['card', 'mobilemoneyzambia', 'banktransfer'],
  CM: ['card', 'mobilemoneyfranc', 'banktransfer'],
  CI: ['card', 'mobilemoneyfranc', 'banktransfer'],
  SN: ['card', 'mobilemoneyfranc', 'banktransfer'],
  DEFAULT: ['card', 'banktransfer'],
};

// Currency to country mapping for automatic method selection
const CURRENCY_COUNTRY_MAP: Record<string, string> = {
  NGN: 'NG',
  GHS: 'GH',
  KES: 'KE',
  ZAR: 'ZA',
  TZS: 'TZ',
  UGX: 'UG',
  RWF: 'RW',
  ZMW: 'ZM',
  XOF: 'CI', // Francophone West Africa
  XAF: 'CM', // Francophone Central Africa
};

const SUPPORTED_CURRENCIES = [
  'NGN',
  'GHS',
  'KES',
  'ZAR',
  'TZS',
  'UGX',
  'RWF',
  'ZMW',
  'XOF',
  'XAF',
  'USD',
  'EUR',
  'GBP',
];

const SUPPORTED_COUNTRIES = [
  'NG',
  'GH',
  'KE',
  'ZA',
  'TZ',
  'UG',
  'RW',
  'ZM',
  'CI',
  'SN',
  'CM',
  'BJ',
  'TG',
  'BF',
  'ML',
  'NE',
];

export class FlutterwaveGateway implements PaymentGateway {
  readonly type = PaymentGatewayType.FLUTTERWAVE;
  readonly supportedCurrencies = SUPPORTED_CURRENCIES;
  readonly supportedCountries = SUPPORTED_COUNTRIES;
  private readonly baseUrl: string;
  private readonly config: FlutterwaveConfig;

  constructor(config: FlutterwaveConfig) {
    this.config = config;
    this.baseUrl =
      config.environment === 'production'
        ? 'https://api.flutterwave.com/v3'
        : 'https://api.flutterwave.com/v3'; // Same URL, different keys
  }

  isAvailable(): boolean {
    return !!(this.config.secretKey && this.config.publicKey);
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok || data.status === 'error') {
      throw new Error(data.message || `Flutterwave API error: ${response.status}`);
    }

    return data;
  }

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  async createCustomer(input: CreateCustomerInput): Promise<GatewayCustomer> {
    // Flutterwave doesn't have a dedicated customer creation API
    // Customers are created implicitly during transactions
    const customerId = `flw_cust_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      id: customerId,
      gatewayType: this.type,
      email: input.email,
      name: input.name,
      phone: input.phone,
      metadata: {
        ...(input.metadata as Record<string, string>),
      },
      createdAt: new Date(),
      rawResponse: null,
    };
  }

  async getCustomer(customerId: string): Promise<GatewayCustomer | null> {
    // Since Flutterwave customers are implicit, we return stored metadata
    return {
      id: customerId,
      gatewayType: this.type,
      email: '',
      metadata: {
        note: 'Flutterwave customers are transaction-based',
      },
      createdAt: new Date(),
      rawResponse: null,
    };
  }

  async updateCustomer(customerId: string, input: UpdateCustomerInput): Promise<GatewayCustomer> {
    return {
      id: customerId,
      gatewayType: this.type,
      email: input.email ?? '',
      name: input.name,
      phone: input.phone,
      metadata: input.metadata ?? {},
      createdAt: new Date(),
      rawResponse: null,
    };
  }

  async deleteCustomer(_customerId: string): Promise<boolean> {
    return true;
  }

  // ============================================
  // PAYMENT OPERATIONS
  // ============================================

  async createPayment(input: CreatePaymentInput): Promise<GatewayPayment> {
    const txRef = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const country = CURRENCY_COUNTRY_MAP[input.currency] || 'NG';
    const paymentMethods =
      FLUTTERWAVE_PAYMENT_METHODS[country] || FLUTTERWAVE_PAYMENT_METHODS.DEFAULT;

    // Standard card charge
    const payload: Record<string, unknown> = {
      tx_ref: txRef,
      amount: input.amountCents / 100, // Flutterwave uses major units
      currency: input.currency,
      redirect_url: input.returnUrl || 'https://aivo.education/payment/callback',
      customer: {
        consumer_id: input.customerId,
      },
      customizations: {
        title: 'AIVO Education',
        description: input.description || 'Payment for AIVO services',
        logo: 'https://aivo.education/logo.png',
      },
      payment_options: paymentMethods.join(','),
      meta: {
        consumer_id: input.customerId,
        ...input.metadata,
      },
    };

    const response = await this.request<{
      status: string;
      message: string;
      data: { link: string };
    }>('POST', '/payments', payload);

    return {
      id: txRef,
      gatewayType: this.type,
      customerId: input.customerId,
      amountCents: input.amountCents,
      currency: input.currency,
      status: PaymentStatus.PENDING,
      description: input.description,
      metadata: {},
      authorizationUrl: response.data.link,
      reference: txRef,
      createdAt: new Date(),
      rawResponse: response,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<{
    verified: boolean;
    status: PaymentStatus;
    payment: GatewayPayment;
  }> {
    const response = await this.request<{
      status: string;
      data: FlutterwaveTransaction;
    }>('GET', `/transactions/verify_by_reference?tx_ref=${input.reference}`);

    const tx = response.data;
    const status = this.mapTransactionStatus(tx.status);

    const payment: GatewayPayment = {
      id: input.reference,
      gatewayType: this.type,
      customerId: String(tx.customer?.id ?? ''),
      amountCents: Math.round(tx.amount * 100),
      currency: tx.currency,
      status,
      metadata: {
        chargedAmount: String(tx.charged_amount),
        appFee: String(tx.app_fee),
        paymentType: tx.payment_type,
      },
      reference: tx.flw_ref,
      paidAt: status === PaymentStatus.SUCCEEDED ? new Date(tx.created_at) : undefined,
      createdAt: new Date(tx.created_at),
      rawResponse: response,
    };

    return {
      verified: status === PaymentStatus.SUCCEEDED,
      status,
      payment,
    };
  }

  async getPayment(paymentId: string): Promise<GatewayPayment | null> {
    try {
      const result = await this.verifyPayment({ reference: paymentId });
      return result.payment;
    } catch {
      return null;
    }
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  async createSubscription(input: CreateSubscriptionInput): Promise<GatewaySubscription> {
    // First, create a payment plan
    const planPayload = {
      amount: input.amountCents / 100,
      name: input.planCode,
      interval: this.mapInterval(input.interval),
      duration: 0, // 0 = indefinite
      currency: input.currency,
    };

    const planResponse = await this.request<{
      status: string;
      data: FlutterwavePaymentPlan;
    }>('POST', '/payment-plans', planPayload);

    const plan = planResponse.data;

    // Now initiate a subscription payment
    const txRef = `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const paymentPayload = {
      tx_ref: txRef,
      amount: input.amountCents / 100,
      currency: input.currency,
      redirect_url: 'https://aivo.education/subscription/callback',
      payment_plan: plan.id,
      customer: {
        consumer_id: input.customerId,
      },
      customizations: {
        title: 'AIVO Subscription',
        description: `Subscription to ${input.planCode}`,
        logo: 'https://aivo.education/logo.png',
      },
    };

    await this.request<{
      status: string;
      data: { link: string };
    }>('POST', '/payments', paymentPayload);

    const now = new Date();

    return {
      id: txRef,
      gatewayType: this.type,
      customerId: input.customerId,
      planCode: input.planCode,
      status: SubscriptionGatewayStatus.ACTIVE,
      amountCents: input.amountCents,
      currency: input.currency,
      interval: input.interval,
      quantity: 1,
      currentPeriodStart: now,
      currentPeriodEnd: this.calculatePeriodEnd(input.interval),
      cancelAtPeriodEnd: false,
      metadata: {
        planId: String(plan.id),
        planToken: plan.plan_token,
      },
      createdAt: now,
      rawResponse: planResponse,
    };
  }

  async getSubscription(subscriptionId: string): Promise<GatewaySubscription | null> {
    const response = await this.request<{
      status: string;
      data: FlutterwaveSubscription[];
    }>('GET', `/subscriptions?transaction_id=${subscriptionId}`);

    if (!response.data || response.data.length === 0) {
      return null;
    }

    const sub = response.data[0];
    const now = new Date();

    return {
      id: subscriptionId,
      gatewayType: this.type,
      customerId: String(sub.customer?.id ?? ''),
      planCode: String(sub.plan),
      status: this.mapSubscriptionStatus(sub.status),
      amountCents: Math.round(sub.amount * 100),
      currency: '',
      interval: 'monthly',
      quantity: 1,
      currentPeriodStart: now,
      currentPeriodEnd: this.calculatePeriodEnd('monthly'),
      cancelAtPeriodEnd: false,
      metadata: {
        createdAt: sub.created_at,
      },
      createdAt: new Date(sub.created_at),
      rawResponse: response,
    };
  }

  async updateSubscription(
    subscriptionId: string,
    _input: UpdateSubscriptionInput
  ): Promise<GatewaySubscription> {
    // Flutterwave subscriptions cannot be modified, must cancel and recreate
    throw new Error(
      `Flutterwave subscriptions must be canceled and recreated to modify (${subscriptionId})`
    );
  }

  async cancelSubscription(
    subscriptionId: string,
    _options?: { immediate?: boolean }
  ): Promise<GatewaySubscription> {
    await this.request<{
      status: string;
      message: string;
    }>('PUT', `/subscriptions/${subscriptionId}/cancel`);

    const now = new Date();

    return {
      id: subscriptionId,
      gatewayType: this.type,
      customerId: '',
      planCode: '',
      status: SubscriptionGatewayStatus.CANCELED,
      amountCents: 0,
      currency: '',
      interval: 'monthly',
      quantity: 1,
      currentPeriodStart: now,
      currentPeriodEnd: now,
      cancelAtPeriodEnd: false,
      canceledAt: now,
      metadata: {},
      createdAt: now,
      rawResponse: null,
    };
  }

  async resumeSubscription(subscriptionId: string): Promise<GatewaySubscription> {
    throw new Error(`Flutterwave does not support resuming subscriptions (${subscriptionId})`);
  }

  // ============================================
  // REFUND OPERATIONS
  // ============================================

  async createRefund(input: CreateRefundInput): Promise<GatewayRefund> {
    // First get the transaction to get the internal ID
    const verifyResponse = await this.request<{
      status: string;
      data: FlutterwaveTransaction;
    }>('GET', `/transactions/verify_by_reference?tx_ref=${input.paymentId}`);

    const transactionId = verifyResponse.data.id;

    const payload: Record<string, unknown> = {
      amount: input.amountCents ? input.amountCents / 100 : undefined,
      comments: input.reason,
    };

    const response = await this.request<{
      status: string;
      data: FlutterwaveRefund;
      message: string;
    }>('POST', `/transactions/${transactionId}/refund`, payload);

    const refund = response.data;

    return {
      id: String(refund.id),
      gatewayType: this.type,
      paymentId: input.paymentId,
      amountCents: Math.round(refund.amount_refunded * 100),
      currency: '',
      status: this.mapRefundStatus(refund.status),
      reason: input.reason,
      createdAt: new Date(refund.created_at),
      rawResponse: response,
    };
  }

  async getRefund(refundId: string): Promise<GatewayRefund | null> {
    try {
      const response = await this.request<{
        status: string;
        data: FlutterwaveRefund;
      }>('GET', `/refunds/${refundId}`);

      const refund = response.data;

      return {
        id: refundId,
        gatewayType: this.type,
        paymentId: String(refund.tx_id),
        amountCents: Math.round(refund.amount_refunded * 100),
        currency: '',
        status: this.mapRefundStatus(refund.status),
        createdAt: new Date(refund.created_at),
        rawResponse: response,
      };
    } catch {
      return null;
    }
  }

  // ============================================
  // CHECKOUT SESSION
  // ============================================

  async createCheckoutSession(input: CreateCheckoutInput): Promise<GatewayCheckoutSession> {
    const txRef = `checkout_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const country = CURRENCY_COUNTRY_MAP[input.currency] || 'NG';
    const paymentMethods =
      FLUTTERWAVE_PAYMENT_METHODS[country] || FLUTTERWAVE_PAYMENT_METHODS.DEFAULT;

    const payload = {
      tx_ref: txRef,
      amount: input.items.reduce((sum, item) => sum + item.amountCents * item.quantity, 0) / 100,
      currency: input.currency,
      redirect_url: input.successUrl,
      customer: {
        email: input.customerEmail,
      },
      customizations: {
        title: 'AIVO Education',
        description: input.items.map((i) => i.name).join(', '),
        logo: 'https://aivo.education/logo.png',
      },
      payment_options: paymentMethods.join(','),
      meta: {
        consumer_id: input.customerId,
        items: input.items,
        ...input.metadata,
      },
    };

    const response = await this.request<{
      status: string;
      data: { link: string };
    }>('POST', '/payments', payload);

    return {
      id: txRef,
      gatewayType: this.type,
      url: response.data.link,
      reference: txRef,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      rawResponse: response,
    };
  }

  // ============================================
  // WEBHOOK HANDLING
  // ============================================

  async verifyWebhook(
    payload: string | Buffer,
    headers: Record<string, string>
  ): Promise<WebhookVerificationResult> {
    const signature = headers['verif-hash'] || headers['Verif-Hash'] || '';

    if (this.config.webhookSecretHash && signature !== this.config.webhookSecretHash) {
      return {
        verified: false,
        error: 'Invalid webhook signature',
      };
    }

    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf-8');
    const event = JSON.parse(payloadStr);
    const eventType = event.event;
    const data = event.data;

    return {
      verified: true,
      event: {
        id: data?.id ? String(data.id) : eventType,
        gatewayType: this.type,
        eventType: this.mapWebhookEvent(eventType),
        data,
        timestamp: new Date(),
        rawEvent: event,
      },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private mapTransactionStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      successful: PaymentStatus.SUCCEEDED,
      pending: PaymentStatus.PENDING,
      failed: PaymentStatus.FAILED,
      cancelled: PaymentStatus.CANCELED,
    };
    return statusMap[status.toLowerCase()] || PaymentStatus.PENDING;
  }

  private mapSubscriptionStatus(status: string): SubscriptionGatewayStatus {
    const statusMap: Record<string, SubscriptionGatewayStatus> = {
      active: SubscriptionGatewayStatus.ACTIVE,
      cancelled: SubscriptionGatewayStatus.CANCELED,
    };
    return statusMap[status.toLowerCase()] || SubscriptionGatewayStatus.ACTIVE;
  }

  private mapRefundStatus(status: string): RefundStatus {
    const statusMap: Record<string, RefundStatus> = {
      pending: RefundStatus.PENDING,
      completed: RefundStatus.SUCCEEDED,
      'completed-mpesa': RefundStatus.SUCCEEDED,
      failed: RefundStatus.FAILED,
    };
    return statusMap[status.toLowerCase()] || RefundStatus.PENDING;
  }

  private mapInterval(interval: string): string {
    const intervalMap: Record<string, string> = {
      day: 'daily',
      week: 'weekly',
      month: 'monthly',
      year: 'yearly',
    };
    return intervalMap[interval] || 'monthly';
  }

  private mapWebhookEvent(event: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'charge.completed': WebhookEventType.PAYMENT_SUCCESS,
      'charge.failed': WebhookEventType.PAYMENT_FAILED,
      'subscription.cancelled': WebhookEventType.SUBSCRIPTION_CANCELED,
    };
    return eventMap[event] || WebhookEventType.UNKNOWN;
  }

  private calculatePeriodEnd(interval: string): Date {
    const now = new Date();
    switch (interval) {
      case 'daily':
        return new Date(now.setDate(now.getDate() + 1));
      case 'weekly':
        return new Date(now.setDate(now.getDate() + 7));
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1));
      case 'yearly':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        return new Date(now.setMonth(now.getMonth() + 1));
    }
  }
}

/**
 * Create and configure a Flutterwave gateway instance
 */
export function createFlutterwaveGateway(config: FlutterwaveConfig): FlutterwaveGateway {
  return new FlutterwaveGateway(config);
}
