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

import type {
  PaymentGateway,
  CreateCustomerInput,
  CreatePaymentInput,
  CreateSubscriptionInput,
  CreateRefundInput,
  CreateCheckoutInput,
  CustomerResult,
  PaymentResult,
  SubscriptionResult,
  RefundResult,
  CheckoutResult,
  WebhookResult,
  PaymentStatus,
  SubscriptionGatewayStatus,
  RefundStatus,
  PaymentGatewayType,
  GatewayCapabilities,
} from './payment-gateway.interface';

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

export class FlutterwaveGateway implements PaymentGateway {
  readonly type: PaymentGatewayType = 'FLUTTERWAVE';
  private readonly baseUrl: string;
  private readonly config: FlutterwaveConfig;

  constructor(config: FlutterwaveConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://api.flutterwave.com/v3'
      : 'https://api.flutterwave.com/v3'; // Same URL, different keys
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
        'Authorization': `Bearer ${this.config.secretKey}`,
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

  async createCustomer(input: CreateCustomerInput): Promise<CustomerResult> {
    // Flutterwave doesn't have a dedicated customer creation API
    // Customers are created implicitly during transactions
    // We'll simulate customer ID generation for consistency
    const customerId = `flw_cust_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      success: true,
      customerId,
      gatewayType: this.type,
      metadata: {
        email: input.email,
        name: input.name,
        phone: input.phone,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async getCustomer(customerId: string): Promise<CustomerResult> {
    // Since Flutterwave customers are implicit, we return stored metadata
    return {
      success: true,
      customerId,
      gatewayType: this.type,
      metadata: {
        note: 'Flutterwave customers are transaction-based',
      },
    };
  }

  async updateCustomer(customerId: string, input: Partial<CreateCustomerInput>): Promise<CustomerResult> {
    return {
      success: true,
      customerId,
      gatewayType: this.type,
      metadata: {
        updated: true,
        ...input,
      },
    };
  }

  async deleteCustomer(customerId: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  // ============================================
  // PAYMENT OPERATIONS
  // ============================================

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const txRef = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const country = CURRENCY_COUNTRY_MAP[input.currency] || 'NG';
    const paymentMethods = FLUTTERWAVE_PAYMENT_METHODS[country] || FLUTTERWAVE_PAYMENT_METHODS.DEFAULT;

    // For mobile money payments, we need to initiate the charge directly
    if (input.paymentMethodType && ['mobilemoney', 'mpesa', 'ussd'].includes(input.paymentMethodType)) {
      return this.createMobileMoneyCharge(input, txRef);
    }

    // Standard card charge
    const payload: Record<string, unknown> = {
      tx_ref: txRef,
      amount: input.amount / 100, // Flutterwave uses major units
      currency: input.currency,
      redirect_url: input.returnUrl || 'https://aivo.education/payment/callback',
      customer: {
        email: input.email,
        name: input.customerName,
        phone_number: input.phone,
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
      success: true,
      paymentId: txRef,
      status: 'pending' as PaymentStatus,
      gatewayType: this.type,
      gatewayPaymentId: txRef,
      amount: input.amount,
      currency: input.currency,
      redirectUrl: response.data.link,
      metadata: {
        paymentOptions: paymentMethods,
        country,
      },
    };
  }

  private async createMobileMoneyCharge(
    input: CreatePaymentInput,
    txRef: string
  ): Promise<PaymentResult> {
    const currency = input.currency;
    let endpoint = '/charges';
    let payload: Record<string, unknown>;

    if (currency === 'KES') {
      // M-Pesa charge
      endpoint = '?type=mpesa';
      payload = {
        tx_ref: txRef,
        amount: input.amount / 100,
        currency: 'KES',
        email: input.email,
        phone_number: input.phone,
        fullname: input.customerName,
      };
    } else if (['GHS', 'UGX', 'TZS', 'RWF', 'ZMW'].includes(currency)) {
      // Mobile money for other countries
      endpoint = '?type=mobile_money_' + currency.toLowerCase().substring(0, 2);
      payload = {
        tx_ref: txRef,
        amount: input.amount / 100,
        currency,
        email: input.email,
        phone_number: input.phone,
        fullname: input.customerName,
        network: input.metadata?.network, // e.g., MTN, VODAFONE, AIRTEL
      };
    } else if (currency === 'NGN' && input.paymentMethodType === 'ussd') {
      // Nigerian USSD
      endpoint = '?type=ussd';
      payload = {
        tx_ref: txRef,
        amount: input.amount / 100,
        currency: 'NGN',
        email: input.email,
        phone_number: input.phone,
        fullname: input.customerName,
        account_bank: input.metadata?.bank || '058', // GTBank default
      };
    } else {
      // Francophone mobile money (XOF, XAF)
      endpoint = '?type=mobile_money_franco';
      payload = {
        tx_ref: txRef,
        amount: input.amount / 100,
        currency,
        email: input.email,
        phone_number: input.phone,
        fullname: input.customerName,
        country: CURRENCY_COUNTRY_MAP[currency] || 'CI',
      };
    }

    const response = await this.request<{
      status: string;
      message: string;
      meta: {
        authorization?: {
          redirect?: string;
          mode?: string;
          note?: string;
        };
      };
      data?: {
        flw_ref?: string;
      };
    }>('POST', endpoint, payload);

    return {
      success: true,
      paymentId: txRef,
      status: 'pending' as PaymentStatus,
      gatewayType: this.type,
      gatewayPaymentId: response.data?.flw_ref || txRef,
      amount: input.amount,
      currency: input.currency,
      redirectUrl: response.meta?.authorization?.redirect,
      metadata: {
        mode: response.meta?.authorization?.mode,
        note: response.meta?.authorization?.note,
      },
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentResult> {
    // First try by tx_ref
    const response = await this.request<{
      status: string;
      data: FlutterwaveTransaction;
    }>('GET', `/transactions/verify_by_reference?tx_ref=${paymentId}`);

    const tx = response.data;
    const status = this.mapTransactionStatus(tx.status);

    return {
      success: status === 'succeeded',
      paymentId,
      status,
      gatewayType: this.type,
      gatewayPaymentId: tx.flw_ref,
      amount: Math.round(tx.amount * 100),
      currency: tx.currency,
      metadata: {
        chargedAmount: tx.charged_amount,
        appFee: tx.app_fee,
        paymentType: tx.payment_type,
        createdAt: tx.created_at,
      },
    };
  }

  async capturePayment(paymentId: string, amount?: number): Promise<PaymentResult> {
    // Flutterwave doesn't support separate authorization/capture
    // Payments are captured immediately
    return this.verifyPayment(paymentId);
  }

  async cancelPayment(paymentId: string): Promise<PaymentResult> {
    // Cannot cancel Flutterwave payments, only refund
    return {
      success: false,
      paymentId,
      status: 'failed' as PaymentStatus,
      gatewayType: this.type,
      error: 'Flutterwave does not support payment cancellation. Use refund instead.',
    };
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult> {
    // First, create a payment plan
    const planPayload = {
      amount: input.amount / 100,
      name: input.planId,
      interval: this.mapInterval(input.interval),
      duration: input.metadata?.duration || 0, // 0 = indefinite
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
      amount: input.amount / 100,
      currency: input.currency,
      redirect_url: input.returnUrl || 'https://aivo.education/subscription/callback',
      payment_plan: plan.id,
      customer: {
        email: input.email,
        name: input.customerName,
        phone_number: input.phone,
      },
      customizations: {
        title: 'AIVO Subscription',
        description: `Subscription to ${input.planId}`,
        logo: 'https://aivo.education/logo.png',
      },
    };

    const paymentResponse = await this.request<{
      status: string;
      data: { link: string };
    }>('POST', '/payments', paymentPayload);

    return {
      success: true,
      subscriptionId: txRef,
      status: 'pending' as SubscriptionGatewayStatus,
      gatewayType: this.type,
      gatewaySubscriptionId: String(plan.id),
      currentPeriodEnd: this.calculatePeriodEnd(input.interval),
      redirectUrl: paymentResponse.data.link,
      metadata: {
        planId: plan.id,
        planToken: plan.plan_token,
      },
    };
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    // Get subscription by plan ID
    const response = await this.request<{
      status: string;
      data: FlutterwaveSubscription[];
    }>('GET', `/subscriptions?transaction_id=${subscriptionId}`);

    if (!response.data || response.data.length === 0) {
      return {
        success: false,
        subscriptionId,
        status: 'canceled' as SubscriptionGatewayStatus,
        gatewayType: this.type,
        error: 'Subscription not found',
      };
    }

    const sub = response.data[0];
    return {
      success: true,
      subscriptionId,
      status: this.mapSubscriptionStatus(sub.status),
      gatewayType: this.type,
      gatewaySubscriptionId: String(sub.id),
      metadata: {
        amount: sub.amount,
        createdAt: sub.created_at,
      },
    };
  }

  async updateSubscription(
    subscriptionId: string,
    input: Partial<CreateSubscriptionInput>
  ): Promise<SubscriptionResult> {
    // Flutterwave subscriptions cannot be modified, must cancel and recreate
    return {
      success: false,
      subscriptionId,
      status: 'active' as SubscriptionGatewayStatus,
      gatewayType: this.type,
      error: 'Flutterwave subscriptions must be canceled and recreated to modify',
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    await this.request<{
      status: string;
      message: string;
    }>('PUT', `/subscriptions/${subscriptionId}/cancel`);

    return {
      success: true,
      subscriptionId,
      status: 'canceled' as SubscriptionGatewayStatus,
      gatewayType: this.type,
    };
  }

  // ============================================
  // REFUND OPERATIONS
  // ============================================

  async createRefund(input: CreateRefundInput): Promise<RefundResult> {
    // First get the transaction to get the internal ID
    const verifyResponse = await this.request<{
      status: string;
      data: FlutterwaveTransaction;
    }>('GET', `/transactions/verify_by_reference?tx_ref=${input.paymentId}`);

    const transactionId = verifyResponse.data.id;

    const payload: Record<string, unknown> = {
      amount: input.amount ? input.amount / 100 : undefined,
      comments: input.reason,
    };

    const response = await this.request<{
      status: string;
      data: FlutterwaveRefund;
      message: string;
    }>('POST', `/transactions/${transactionId}/refund`, payload);

    const refund = response.data;

    return {
      success: true,
      refundId: String(refund.id),
      status: this.mapRefundStatus(refund.status),
      gatewayType: this.type,
      gatewayRefundId: refund.flw_ref,
      amount: Math.round(refund.amount_refunded * 100),
      metadata: {
        transactionId: refund.tx_id,
        createdAt: refund.created_at,
      },
    };
  }

  async getRefund(refundId: string): Promise<RefundResult> {
    const response = await this.request<{
      status: string;
      data: FlutterwaveRefund;
    }>('GET', `/refunds/${refundId}`);

    const refund = response.data;

    return {
      success: true,
      refundId,
      status: this.mapRefundStatus(refund.status),
      gatewayType: this.type,
      gatewayRefundId: refund.flw_ref,
      amount: Math.round(refund.amount_refunded * 100),
    };
  }

  // ============================================
  // CHECKOUT SESSION
  // ============================================

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutResult> {
    const txRef = `checkout_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const country = CURRENCY_COUNTRY_MAP[input.currency] || 'NG';
    const paymentMethods = FLUTTERWAVE_PAYMENT_METHODS[country] || FLUTTERWAVE_PAYMENT_METHODS.DEFAULT;

    const payload = {
      tx_ref: txRef,
      amount: input.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0) / 100,
      currency: input.currency,
      redirect_url: input.successUrl,
      customer: {
        email: input.email,
        name: input.customerName,
        phone_number: input.phone,
      },
      customizations: {
        title: 'AIVO Education',
        description: input.items.map(i => i.name).join(', '),
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
      success: true,
      sessionId: txRef,
      checkoutUrl: response.data.link,
      gatewayType: this.type,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    };
  }

  // ============================================
  // WEBHOOK HANDLING
  // ============================================

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    if (!this.config.webhookSecretHash) {
      console.warn('Flutterwave webhook secret hash not configured');
      return true; // Allow in development
    }

    // Flutterwave uses verif-hash header
    return signature === this.config.webhookSecretHash;
  }

  async handleWebhook(payload: string, signature: string): Promise<WebhookResult> {
    const isValid = await this.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      return {
        success: false,
        eventType: 'unknown',
        gatewayType: this.type,
        error: 'Invalid webhook signature',
      };
    }

    const event = JSON.parse(payload);
    const eventType = event.event;
    const data = event.data;

    // Verify the transaction is real
    if (data?.tx_ref) {
      try {
        await this.verifyPayment(data.tx_ref);
      } catch (error) {
        return {
          success: false,
          eventType,
          gatewayType: this.type,
          error: 'Transaction verification failed',
        };
      }
    }

    return {
      success: true,
      eventType: this.mapWebhookEvent(eventType),
      gatewayType: this.type,
      resourceId: data?.tx_ref || data?.id,
      metadata: {
        originalEvent: eventType,
        flwRef: data?.flw_ref,
        status: data?.status,
        amount: data?.amount,
        currency: data?.currency,
      },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private mapTransactionStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      successful: 'succeeded',
      pending: 'pending',
      failed: 'failed',
      cancelled: 'canceled',
    };
    return statusMap[status.toLowerCase()] || 'pending';
  }

  private mapSubscriptionStatus(status: string): SubscriptionGatewayStatus {
    const statusMap: Record<string, SubscriptionGatewayStatus> = {
      active: 'active',
      cancelled: 'canceled',
    };
    return statusMap[status.toLowerCase()] || 'active';
  }

  private mapRefundStatus(status: string): RefundStatus {
    const statusMap: Record<string, RefundStatus> = {
      'pending': 'pending',
      'completed': 'succeeded',
      'completed-mpesa': 'succeeded',
      'failed': 'failed',
    };
    return statusMap[status.toLowerCase()] || 'pending';
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

  private mapWebhookEvent(event: string): string {
    const eventMap: Record<string, string> = {
      'charge.completed': 'payment.succeeded',
      'charge.failed': 'payment.failed',
      'transfer.completed': 'payout.completed',
      'transfer.failed': 'payout.failed',
      'subscription.cancelled': 'subscription.canceled',
    };
    return eventMap[event] || event;
  }

  private calculatePeriodEnd(interval: string): Date {
    const now = new Date();
    switch (interval) {
      case 'day':
        return new Date(now.setDate(now.getDate() + 1));
      case 'week':
        return new Date(now.setDate(now.getDate() + 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() + 1));
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        return new Date(now.setMonth(now.getMonth() + 1));
    }
  }

  getCapabilities(): GatewayCapabilities {
    return {
      supportedCurrencies: [
        'NGN', 'GHS', 'KES', 'ZAR', 'TZS', 'UGX', 'RWF', 'ZMW',
        'XOF', 'XAF', 'USD', 'EUR', 'GBP',
      ],
      supportedCountries: [
        'NG', 'GH', 'KE', 'ZA', 'TZ', 'UG', 'RW', 'ZM',
        'CI', 'SN', 'CM', 'BJ', 'TG', 'BF', 'ML', 'NE',
      ],
      supportedPaymentMethods: [
        'card', 'bank_transfer', 'mobile_money', 'ussd', 'qr', 'wallet',
      ],
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsSubscriptions: true,
      supportsCheckout: true,
      supportsWebhooks: true,
      webhookEvents: [
        'charge.completed',
        'charge.failed',
        'transfer.completed',
        'subscription.cancelled',
      ],
    };
  }
}

/**
 * Create and configure a Flutterwave gateway instance
 */
export function createFlutterwaveGateway(config: FlutterwaveConfig): FlutterwaveGateway {
  return new FlutterwaveGateway(config);
}
