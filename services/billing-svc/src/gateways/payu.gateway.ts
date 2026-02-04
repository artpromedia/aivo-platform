/**
 * PayU Payment Gateway Implementation
 *
 * PayU provides payment processing across multiple regions:
 * - PayU India (PayUmoney, PayUbiz)
 * - PayU Latin America (Argentina, Brazil, Chile, Colombia, Mexico, Panama, Peru)
 * - PayU Europe (Poland, Czech Republic, Romania, Turkey)
 * - PayU Africa (South Africa, Nigeria, Kenya)
 *
 * Features:
 * - Card payments (credit, debit)
 * - Net banking
 * - EMI options
 * - Digital wallets
 * - Cash payments (via convenience stores)
 * - UPI (India)
 *
 * This implementation focuses on the PayU Hub API for multi-region support
 */

import * as crypto from 'crypto';

import {
  PaymentGatewayType,
  PaymentStatus,
  SubscriptionGatewayStatus,
  RefundStatus,
  WebhookEventType,
} from './payment-gateway.interface';
import type {
  PaymentGateway,
  CreateCustomerInput,
  UpdateCustomerInput,
  CreatePaymentInput,
  VerifyPaymentInput,
  PaymentVerificationResult,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  CreateRefundInput,
  CreateCheckoutInput,
  GatewayCustomer,
  GatewayPayment,
  GatewaySubscription,
  GatewayRefund,
  GatewayCheckoutSession,
  WebhookVerificationResult,
} from './payment-gateway.interface';

interface PayUConfig {
  merchantKey: string;
  merchantSalt: string;
  merchantSaltV2?: string; // For newer API versions
  merchantId?: string;
  region: 'india' | 'latam' | 'europe' | 'africa';
  environment: 'sandbox' | 'production';
}

interface PayUTransaction {
  mihpayid: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  status: string;
  error_Message?: string;
  mode: string;
  unmappedstatus: string;
  net_amount_debit: string;
  bank_ref_num?: string;
  cardnum?: string;
  pg_TYPE?: string;
}

interface _PayURefund {
  refund_id: string;
  transaction_id: string;
  amount: string;
  status: string;
  request_id: string;
  created_on: string;
}

// Regional API endpoints
const PAYU_ENDPOINTS: Record<string, Record<string, string>> = {
  india: {
    sandbox: 'https://test.payu.in',
    production: 'https://secure.payu.in',
  },
  latam: {
    sandbox: 'https://sandbox.api.payulatam.com',
    production: 'https://api.payulatam.com',
  },
  europe: {
    sandbox: 'https://sandbox.payu.com',
    production: 'https://secure.payu.com',
  },
  africa: {
    sandbox: 'https://staging.payu.co.za',
    production: 'https://secure.payu.co.za',
  },
};

// Regional payment methods
const _REGIONAL_PAYMENT_METHODS: Record<string, string[]> = {
  india: ['card', 'netbanking', 'upi', 'wallet', 'emi'],
  latam: ['card', 'cash', 'bank_transfer', 'wallet', 'pix', 'boleto'],
  europe: ['card', 'bank_transfer', 'blik', 'installments'],
  africa: ['card', 'eft', 'mobicred', 'ozow'],
};

// Currency support by region
const REGIONAL_CURRENCIES: Record<string, string[]> = {
  india: ['INR'],
  latam: ['BRL', 'ARS', 'CLP', 'COP', 'MXN', 'PEN', 'USD'],
  europe: ['PLN', 'CZK', 'RON', 'TRY', 'EUR'],
  africa: ['ZAR', 'NGN', 'KES', 'USD'],
};

// Country support by region
const REGIONAL_COUNTRIES: Record<string, string[]> = {
  india: ['IN'],
  latam: ['BR', 'AR', 'CL', 'CO', 'MX', 'PA', 'PE'],
  europe: ['PL', 'CZ', 'RO', 'TR'],
  africa: ['ZA', 'NG', 'KE'],
};

export class PayUGateway implements PaymentGateway {
  readonly type: PaymentGatewayType = PaymentGatewayType.PAYU;
  readonly supportedCurrencies: string[];
  readonly supportedCountries: string[];
  private readonly baseUrl: string;
  private readonly config: PayUConfig;

  constructor(config: PayUConfig) {
    this.config = config;
    const endpoints = PAYU_ENDPOINTS[config.region];
    this.baseUrl = endpoints?.[config.environment] || PAYU_ENDPOINTS.india.sandbox;
    this.supportedCurrencies = REGIONAL_CURRENCIES[config.region] || [];
    this.supportedCountries = REGIONAL_COUNTRIES[config.region] || [];
  }

  isAvailable(): boolean {
    return !!(this.config.merchantKey && this.config.merchantSalt);
  }

  // ============================================
  // HASH GENERATION (India-specific)
  // ============================================

  private generateHash(params: Record<string, string>): string {
    // PayU India uses SHA512 hash
    // hash = sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
    const hashString = [
      this.config.merchantKey,
      params.txnid,
      params.amount,
      params.productinfo,
      params.firstname,
      params.email,
      params.udf1 || '',
      params.udf2 || '',
      params.udf3 || '',
      params.udf4 || '',
      params.udf5 || '',
      '',
      '',
      '',
      '',
      '',
      this.config.merchantSalt,
    ].join('|');

    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  private generateVerifyHash(params: Record<string, string>): string {
    // Reverse hash for verification
    // hash = sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
    const hashString = [
      this.config.merchantSalt,
      params.status,
      '',
      '',
      '',
      '',
      '',
      params.udf5 || '',
      params.udf4 || '',
      params.udf3 || '',
      params.udf2 || '',
      params.udf1 || '',
      params.email,
      params.firstname,
      params.productinfo,
      params.amount,
      params.txnid,
      this.config.merchantKey,
    ].join('|');

    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  private async request<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      formData.append(key, value);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      // PayU sometimes returns non-JSON responses
      return { response: text } as T;
    }
  }

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  async createCustomer(input: CreateCustomerInput): Promise<GatewayCustomer> {
    // PayU doesn't have standalone customer creation
    const customerId = `payu_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      id: customerId,
      gatewayType: PaymentGatewayType.PAYU,
      email: input.email,
      name: input.name,
      phone: input.phone,
      address: input.address,
      metadata: {
        ...(input.metadata as Record<string, string>),
        region: this.config.region,
      },
      createdAt: new Date(),
      rawResponse: { region: this.config.region },
    };
  }

  async getCustomer(_customerId: string): Promise<GatewayCustomer | null> {
    // PayU customers are transaction-based; no standalone lookup
    return null;
  }

  async updateCustomer(customerId: string, input: UpdateCustomerInput): Promise<GatewayCustomer> {
    return {
      id: customerId,
      gatewayType: PaymentGatewayType.PAYU,
      email: input.email || '',
      name: input.name,
      phone: input.phone,
      address: input.address,
      metadata: (input.metadata || {}) as Record<string, string>,
      createdAt: new Date(),
      rawResponse: { updated: true },
    };
  }

  async deleteCustomer(_customerId: string): Promise<boolean> {
    return true;
  }

  // ============================================
  // PAYMENT OPERATIONS
  // ============================================

  async createPayment(input: CreatePaymentInput): Promise<GatewayPayment> {
    const txnid = `aivo_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const amount = (input.amountCents / 100).toFixed(2);

    // Build payment form parameters
    const params: Record<string, string> = {
      key: this.config.merchantKey,
      txnid,
      amount,
      productinfo: input.description || 'AIVO Education',
      firstname: input.metadata?.userId || 'User',
      email: input.metadata?.email || '',
      phone: input.metadata?.phone || '',
      surl: input.returnUrl || 'https://aivo.education/payment/success',
      furl: input.returnUrl || 'https://aivo.education/payment/failure',
      udf1: input.customerId || '',
      udf2: input.metadata?.planCode || '',
      udf3: '',
      udf4: '',
      udf5: '',
    };

    // Generate hash
    params.hash = this.generateHash(params);

    // For India region with specific payment method
    if (this.config.region === 'india' && input.paymentMethodId) {
      params.pg = this.mapIndianPaymentMode(input.paymentMethodId);

      if (input.paymentMethodId === 'upi') {
        params.bankcode = 'UPI';
        params.vpa = input.metadata?.upiId || '';
      } else if (input.paymentMethodId === 'netbanking' && input.metadata?.bankCode) {
        params.bankcode = input.metadata.bankCode;
      }
    }

    // Build the checkout URL
    const formParams = new URLSearchParams(params).toString();
    const checkoutUrl = `${this.baseUrl}/_payment`;

    return {
      id: txnid,
      gatewayType: PaymentGatewayType.PAYU,
      customerId: input.customerId,
      amountCents: input.amountCents,
      currency: input.currency,
      status: PaymentStatus.PENDING,
      description: input.description,
      metadata: (input.metadata || {}) as Record<string, string>,
      authorizationUrl: `${checkoutUrl}?${formParams}`,
      reference: txnid,
      createdAt: new Date(),
      rawResponse: {
        region: this.config.region,
        formParams: params,
        note: 'Redirect user to authorizationUrl or submit form to _payment endpoint',
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    const command = 'verify_payment';

    const params: Record<string, string> = {
      key: this.config.merchantKey,
      command,
      var1: input.reference,
      hash: '',
    };

    // Generate command hash
    const hashString = `${this.config.merchantKey}|${command}|${input.reference}|${this.config.merchantSalt}`;
    params.hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const response = await this.request<{
      status: number;
      msg: string;
      transaction_details: Record<string, PayUTransaction>;
    }>('/merchant/postservice.php?form=2', params);

    if (response.status !== 1) {
      return {
        verified: false,
        status: PaymentStatus.FAILED,
        payment: {
          id: input.reference,
          gatewayType: PaymentGatewayType.PAYU,
          customerId: '',
          amountCents: 0,
          currency: this.getRegionCurrency(),
          status: PaymentStatus.FAILED,
          metadata: {},
          createdAt: new Date(),
          rawResponse: response,
        },
      };
    }

    const tx = response.transaction_details[input.reference];
    if (!tx) {
      return {
        verified: false,
        status: PaymentStatus.FAILED,
        payment: {
          id: input.reference,
          gatewayType: PaymentGatewayType.PAYU,
          customerId: '',
          amountCents: 0,
          currency: this.getRegionCurrency(),
          status: PaymentStatus.FAILED,
          metadata: {},
          createdAt: new Date(),
          rawResponse: response,
        },
      };
    }

    const status = this.mapTransactionStatus(tx.status);

    return {
      verified: status === PaymentStatus.SUCCEEDED,
      status,
      payment: {
        id: tx.mihpayid,
        gatewayType: PaymentGatewayType.PAYU,
        customerId: '',
        amountCents: Math.round(parseFloat(tx.amount) * 100),
        currency: this.getRegionCurrency(),
        status,
        metadata: {
          mode: tx.mode,
          bankRefNum: tx.bank_ref_num || '',
          pgType: tx.pg_TYPE || '',
          netAmountDebit: tx.net_amount_debit,
        },
        reference: tx.txnid,
        createdAt: new Date(),
        rawResponse: tx,
      },
    };
  }

  async getPayment(paymentId: string): Promise<GatewayPayment | null> {
    const result = await this.verifyPayment({ reference: paymentId });
    if (!result.verified && result.status === PaymentStatus.FAILED) {
      return null;
    }
    return result.payment;
  }

  async capturePayment(paymentId: string, _amount?: number): Promise<GatewayPayment> {
    // PayU auto-captures, but supports capture for auth-only transactions
    const command = 'capture_transaction';

    const params: Record<string, string> = {
      key: this.config.merchantKey,
      command,
      var1: paymentId,
      hash: '',
    };

    const hashString = `${this.config.merchantKey}|${command}|${paymentId}|${this.config.merchantSalt}`;
    params.hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const response = await this.request<{
      status: number;
      msg: string;
    }>('/merchant/postservice.php?form=2', params);

    if (response.status !== 1) {
      throw new Error(response.msg || 'Capture failed');
    }

    return {
      id: paymentId,
      gatewayType: PaymentGatewayType.PAYU,
      customerId: '',
      amountCents: 0,
      currency: this.getRegionCurrency(),
      status: PaymentStatus.SUCCEEDED,
      metadata: {},
      createdAt: new Date(),
      rawResponse: response,
    };
  }

  async cancelPayment(paymentId: string): Promise<GatewayPayment> {
    // PayU supports cancel for auth-only transactions
    const command = 'cancel_transaction';

    const params: Record<string, string> = {
      key: this.config.merchantKey,
      command,
      var1: paymentId,
      var2: paymentId,
      hash: '',
    };

    const hashString = `${this.config.merchantKey}|${command}|${paymentId}|${this.config.merchantSalt}`;
    params.hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const response = await this.request<{
      status: number;
      msg: string;
    }>('/merchant/postservice.php?form=2', params);

    if (response.status !== 1) {
      throw new Error(response.msg || 'Cancel failed');
    }

    return {
      id: paymentId,
      gatewayType: PaymentGatewayType.PAYU,
      customerId: '',
      amountCents: 0,
      currency: this.getRegionCurrency(),
      status: PaymentStatus.CANCELED,
      metadata: {},
      createdAt: new Date(),
      rawResponse: response,
    };
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  async createSubscription(input: CreateSubscriptionInput): Promise<GatewaySubscription> {
    // PayU Standing Instructions (SI) for recurring payments
    // This is India-specific
    if (this.config.region !== 'india') {
      throw new Error('Subscriptions only supported in India region via Standing Instructions');
    }

    const txnid = `si_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const amount = (input.amountCents / 100).toFixed(2);
    const now = new Date();

    const params: Record<string, string> = {
      key: this.config.merchantKey,
      txnid,
      amount,
      productinfo: input.planCode,
      firstname: input.metadata?.userId || 'User',
      email: input.metadata?.email || '',
      phone: input.metadata?.phone || '',
      surl: input.metadata?.returnUrl || 'https://aivo.education/subscription/success',
      furl: input.metadata?.returnUrl || 'https://aivo.education/subscription/failure',
      // SI specific parameters
      si: '1',
      si_details: JSON.stringify({
        billingAmount: amount,
        billingCurrency: input.currency,
        billingCycle: this.mapBillingCycle(input.interval),
        billingInterval: '1',
        paymentStartDate: now.toISOString().split('T')[0],
        paymentEndDate: this.calculateEndDate(input.interval, 12).toISOString().split('T')[0], // 12 cycles
      }),
    };

    params.hash = this.generateHash(params);

    const checkoutUrl = `${this.baseUrl}/_payment`;

    return {
      id: txnid,
      gatewayType: PaymentGatewayType.PAYU,
      customerId: input.customerId,
      planCode: input.planCode,
      status: input.trialDays
        ? SubscriptionGatewayStatus.TRIALING
        : SubscriptionGatewayStatus.ACTIVE,
      amountCents: input.amountCents,
      currency: input.currency,
      interval: input.interval,
      quantity: 1,
      trialStart: input.trialDays ? now : undefined,
      trialEnd: input.trialDays ? new Date(now.getTime() + input.trialDays * 86400000) : undefined,
      currentPeriodStart: now,
      currentPeriodEnd: this.calculateEndDate(input.interval, 1),
      cancelAtPeriodEnd: false,
      metadata: (input.metadata || {}) as Record<string, string>,
      createdAt: now,
      rawResponse: {
        redirectUrl: `${checkoutUrl}?${new URLSearchParams(params).toString()}`,
        note: 'Redirect user to complete SI mandate registration',
      },
    };
  }

  async getSubscription(subscriptionId: string): Promise<GatewaySubscription | null> {
    if (this.config.region !== 'india') {
      return null;
    }

    // Use SI status check API
    const command = 'check_si_status';

    const params: Record<string, string> = {
      key: this.config.merchantKey,
      command,
      var1: subscriptionId,
      hash: '',
    };

    const hashString = `${this.config.merchantKey}|${command}|${subscriptionId}|${this.config.merchantSalt}`;
    params.hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const response = await this.request<{
      status: number;
      si_status?: string;
      msg?: string;
    }>('/merchant/postservice.php?form=2', params);

    if (response.status !== 1) {
      return null;
    }

    const now = new Date();

    return {
      id: subscriptionId,
      gatewayType: PaymentGatewayType.PAYU,
      customerId: '',
      planCode: '',
      status: this.mapSIStatus(response.si_status || ''),
      amountCents: 0,
      currency: this.getRegionCurrency(),
      interval: 'monthly',
      quantity: 1,
      currentPeriodStart: now,
      currentPeriodEnd: now,
      cancelAtPeriodEnd: false,
      metadata: {},
      createdAt: now,
      rawResponse: response,
    };
  }

  async updateSubscription(
    _subscriptionId: string,
    _input: UpdateSubscriptionInput
  ): Promise<GatewaySubscription> {
    throw new Error('PayU SI modifications require new mandate registration');
  }

  async cancelSubscription(
    subscriptionId: string,
    options?: { immediate?: boolean }
  ): Promise<GatewaySubscription> {
    if (this.config.region !== 'india') {
      throw new Error('Subscription cancellation only available for India region');
    }

    const command = 'cancel_si';

    const params: Record<string, string> = {
      key: this.config.merchantKey,
      command,
      var1: subscriptionId,
      hash: '',
    };

    const hashString = `${this.config.merchantKey}|${command}|${subscriptionId}|${this.config.merchantSalt}`;
    params.hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const response = await this.request<{
      status: number;
      msg: string;
    }>('/merchant/postservice.php?form=2', params);

    if (response.status !== 1) {
      throw new Error(response.msg || 'Failed to cancel SI mandate');
    }

    const now = new Date();

    return {
      id: subscriptionId,
      gatewayType: PaymentGatewayType.PAYU,
      customerId: '',
      planCode: '',
      status: SubscriptionGatewayStatus.CANCELED,
      amountCents: 0,
      currency: this.getRegionCurrency(),
      interval: 'monthly',
      quantity: 1,
      currentPeriodStart: now,
      currentPeriodEnd: now,
      cancelAtPeriodEnd: !options?.immediate,
      canceledAt: now,
      metadata: {},
      createdAt: now,
      rawResponse: response,
    };
  }

  async resumeSubscription(_subscriptionId: string): Promise<GatewaySubscription> {
    throw new Error(
      'PayU SI does not support resuming subscriptions; a new mandate must be created'
    );
  }

  // ============================================
  // REFUND OPERATIONS
  // ============================================

  async createRefund(input: CreateRefundInput): Promise<GatewayRefund> {
    const command = 'cancel_refund_transaction';
    const refundId = `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // First verify the original transaction
    const verifyResult = await this.verifyPayment({ reference: input.paymentId });
    if (!verifyResult.verified) {
      throw new Error('Original transaction not found or invalid');
    }

    const mihpayid = verifyResult.payment.id;
    const refundAmountCents = input.amountCents ?? verifyResult.payment.amountCents;
    const amount = (refundAmountCents / 100).toFixed(2);

    const params: Record<string, string> = {
      key: this.config.merchantKey,
      command,
      var1: mihpayid,
      var2: refundId,
      var3: amount,
      hash: '',
    };

    const hashString = `${this.config.merchantKey}|${command}|${mihpayid}|${this.config.merchantSalt}`;
    params.hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const response = await this.request<{
      status: number;
      msg: string;
      request_id?: string;
      bank_ref_num?: string;
    }>('/merchant/postservice.php?form=2', params);

    if (response.status !== 1) {
      throw new Error(response.msg || 'Refund request failed');
    }

    return {
      id: response.request_id || refundId,
      gatewayType: PaymentGatewayType.PAYU,
      paymentId: input.paymentId,
      amountCents: refundAmountCents,
      currency: verifyResult.payment.currency,
      status: RefundStatus.PENDING,
      reason: input.reason,
      createdAt: new Date(),
      rawResponse: response,
    };
  }

  async getRefund(refundId: string): Promise<GatewayRefund | null> {
    const command = 'check_action_status';

    const params: Record<string, string> = {
      key: this.config.merchantKey,
      command,
      var1: refundId,
      hash: '',
    };

    const hashString = `${this.config.merchantKey}|${command}|${refundId}|${this.config.merchantSalt}`;
    params.hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const response = await this.request<{
      status: number;
      request_id: string;
      transaction_amount: string;
      refund_amount: string;
      action_status: string;
      msg?: string;
    }>('/merchant/postservice.php?form=2', params);

    if (response.status !== 1) {
      return null;
    }

    return {
      id: response.request_id,
      gatewayType: PaymentGatewayType.PAYU,
      paymentId: '',
      amountCents: Math.round(parseFloat(response.refund_amount) * 100),
      currency: this.getRegionCurrency(),
      status: this.mapRefundStatus(response.action_status),
      createdAt: new Date(),
      rawResponse: response,
    };
  }

  // ============================================
  // CHECKOUT SESSION
  // ============================================

  async createCheckoutSession(input: CreateCheckoutInput): Promise<GatewayCheckoutSession> {
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.amountCents * item.quantity,
      0
    );

    const paymentResult = await this.createPayment({
      amountCents: totalAmount,
      currency: input.currency,
      customerId: input.customerId || '',
      description: input.items.map((i) => i.name).join(', '),
      returnUrl: input.successUrl,
      callbackUrl: input.callbackUrl,
      metadata: input.metadata,
    });

    return {
      id: paymentResult.id,
      gatewayType: PaymentGatewayType.PAYU,
      url: paymentResult.authorizationUrl || `${this.baseUrl}/_payment`,
      reference: paymentResult.reference,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      rawResponse: paymentResult.rawResponse,
    };
  }

  // ============================================
  // WEBHOOK HANDLING
  // ============================================

  async verifyWebhook(
    payload: string | Buffer,
    _headers: Record<string, string>
  ): Promise<WebhookVerificationResult> {
    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf-8');
    let params: Record<string, string>;

    try {
      params = JSON.parse(payloadStr);
    } catch {
      return {
        verified: false,
        error: 'Invalid JSON payload',
      };
    }

    if (!params.hash) {
      return {
        verified: false,
        error: 'No hash in PayU webhook payload',
      };
    }

    const expectedHash = this.generateVerifyHash(params);
    if (params.hash !== expectedHash) {
      return {
        verified: false,
        error: 'Invalid webhook hash',
      };
    }

    const status = this.mapTransactionStatus(params.status);
    let eventType: WebhookEventType;

    if (status === PaymentStatus.SUCCEEDED) {
      eventType = params.si
        ? WebhookEventType.SUBSCRIPTION_CREATED
        : WebhookEventType.PAYMENT_SUCCESS;
    } else if (status === PaymentStatus.FAILED) {
      eventType = WebhookEventType.PAYMENT_FAILED;
    } else {
      eventType = WebhookEventType.UNKNOWN;
    }

    return {
      verified: true,
      event: {
        id: params.mihpayid || params.txnid || '',
        gatewayType: PaymentGatewayType.PAYU,
        eventType,
        data: params,
        timestamp: new Date(),
        rawEvent: params,
      },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private mapTransactionStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      success: PaymentStatus.SUCCEEDED,
      captured: PaymentStatus.SUCCEEDED,
      failure: PaymentStatus.FAILED,
      failed: PaymentStatus.FAILED,
      pending: PaymentStatus.PENDING,
      inprogress: PaymentStatus.PENDING,
      bounced: PaymentStatus.FAILED,
      usercancelled: PaymentStatus.CANCELED,
    };
    return statusMap[status.toLowerCase()] || PaymentStatus.PENDING;
  }

  private mapSIStatus(status: string): SubscriptionGatewayStatus {
    const statusMap: Record<string, SubscriptionGatewayStatus> = {
      active: SubscriptionGatewayStatus.ACTIVE,
      paused: SubscriptionGatewayStatus.PAUSED,
      cancelled: SubscriptionGatewayStatus.CANCELED,
      expired: SubscriptionGatewayStatus.CANCELED,
    };
    return statusMap[status.toLowerCase()] || SubscriptionGatewayStatus.ACTIVE;
  }

  private mapRefundStatus(status: string): RefundStatus {
    const statusMap: Record<string, RefundStatus> = {
      success: RefundStatus.SUCCEEDED,
      pending: RefundStatus.PENDING,
      queued: RefundStatus.PENDING,
      failure: RefundStatus.FAILED,
    };
    return statusMap[status.toLowerCase()] || RefundStatus.PENDING;
  }

  private mapIndianPaymentMode(method: string): string {
    const modeMap: Record<string, string> = {
      card: 'CC',
      credit_card: 'CC',
      debit_card: 'DC',
      netbanking: 'NB',
      upi: 'UPI',
      wallet: 'CASH',
      emi: 'EMI',
    };
    return modeMap[method] || 'CC';
  }

  private mapBillingCycle(interval: string): string {
    const cycleMap: Record<string, string> = {
      daily: 'DAILY',
      weekly: 'WEEKLY',
      monthly: 'MONTHLY',
      quarterly: 'QUARTERLY',
      yearly: 'YEARLY',
    };
    return cycleMap[interval] || 'MONTHLY';
  }

  private getRegionCurrency(): string {
    const defaultCurrencies: Record<string, string> = {
      india: 'INR',
      latam: 'USD',
      europe: 'EUR',
      africa: 'ZAR',
    };
    return defaultCurrencies[this.config.region] || 'USD';
  }

  private calculateEndDate(interval: string, cycles: number): Date {
    const date = new Date();
    switch (interval) {
      case 'daily':
        date.setDate(date.getDate() + cycles);
        break;
      case 'weekly':
        date.setDate(date.getDate() + cycles * 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + cycles);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + cycles * 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + cycles);
        break;
    }
    return date;
  }
}

/**
 * Create and configure a PayU gateway instance
 */
export function createPayUGateway(config: PayUConfig): PayUGateway {
  return new PayUGateway(config);
}
