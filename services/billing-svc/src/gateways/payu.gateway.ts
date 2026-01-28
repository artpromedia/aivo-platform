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
import * as crypto from 'crypto';

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

interface PayURefund {
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
const REGIONAL_PAYMENT_METHODS: Record<string, string[]> = {
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
  readonly type: PaymentGatewayType = 'PAYU';
  private readonly baseUrl: string;
  private readonly config: PayUConfig;

  constructor(config: PayUConfig) {
    this.config = config;
    const endpoints = PAYU_ENDPOINTS[config.region];
    this.baseUrl = endpoints?.[config.environment] || PAYU_ENDPOINTS.india.sandbox;
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
      '', '', '', '', '',
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
      '', '', '', '', '',
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

  private async request<T>(
    endpoint: string,
    params: Record<string, string>
  ): Promise<T> {
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

  async createCustomer(input: CreateCustomerInput): Promise<CustomerResult> {
    // PayU doesn't have standalone customer creation
    const customerId = `payu_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      success: true,
      customerId,
      gatewayType: this.type,
      metadata: {
        email: input.email,
        name: input.name,
        phone: input.phone,
        region: this.config.region,
      },
    };
  }

  async getCustomer(customerId: string): Promise<CustomerResult> {
    return {
      success: true,
      customerId,
      gatewayType: this.type,
      metadata: {
        note: 'PayU customers are transaction-based',
      },
    };
  }

  async updateCustomer(customerId: string, input: Partial<CreateCustomerInput>): Promise<CustomerResult> {
    return {
      success: true,
      customerId,
      gatewayType: this.type,
      metadata: { updated: true, ...input },
    };
  }

  async deleteCustomer(customerId: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  // ============================================
  // PAYMENT OPERATIONS
  // ============================================

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const txnid = `aivo_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const amount = (input.amount / 100).toFixed(2);

    // Build payment form parameters
    const params: Record<string, string> = {
      key: this.config.merchantKey,
      txnid,
      amount,
      productinfo: input.description || 'AIVO Education',
      firstname: input.customerName?.split(' ')[0] || 'User',
      email: input.email,
      phone: input.phone || '',
      surl: input.returnUrl || 'https://aivo.education/payment/success',
      furl: input.returnUrl || 'https://aivo.education/payment/failure',
      udf1: input.customerId || '',
      udf2: input.metadata?.planId || '',
      udf3: '',
      udf4: '',
      udf5: '',
    };

    // Generate hash
    params.hash = this.generateHash(params);

    // For India region with specific payment mode
    if (this.config.region === 'india' && input.paymentMethodType) {
      params.pg = this.mapIndianPaymentMode(input.paymentMethodType);
      
      if (input.paymentMethodType === 'upi') {
        params.bankcode = 'UPI';
        params.vpa = input.metadata?.upiId || '';
      } else if (input.paymentMethodType === 'netbanking' && input.metadata?.bankCode) {
        params.bankcode = input.metadata.bankCode;
      }
    }

    // Build the checkout URL
    const formParams = new URLSearchParams(params).toString();
    const checkoutUrl = `${this.baseUrl}/_payment`;

    return {
      success: true,
      paymentId: txnid,
      status: 'pending' as PaymentStatus,
      gatewayType: this.type,
      gatewayPaymentId: txnid,
      amount: input.amount,
      currency: input.currency,
      redirectUrl: `${checkoutUrl}?${formParams}`,
      metadata: {
        region: this.config.region,
        formParams: params,
        note: 'Redirect user to checkoutUrl or submit form to _payment endpoint',
      },
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentResult> {
    const command = 'verify_payment';
    
    const params: Record<string, string> = {
      key: this.config.merchantKey,
      command,
      var1: paymentId,
      hash: '',
    };

    // Generate command hash
    const hashString = `${this.config.merchantKey}|${command}|${paymentId}|${this.config.merchantSalt}`;
    params.hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const response = await this.request<{
      status: number;
      msg: string;
      transaction_details: Record<string, PayUTransaction>;
    }>('/merchant/postservice.php?form=2', params);

    if (response.status !== 1) {
      return {
        success: false,
        paymentId,
        status: 'failed' as PaymentStatus,
        gatewayType: this.type,
        error: response.msg || 'Payment verification failed',
      };
    }

    const tx = response.transaction_details[paymentId];
    if (!tx) {
      return {
        success: false,
        paymentId,
        status: 'failed' as PaymentStatus,
        gatewayType: this.type,
        error: 'Transaction not found',
      };
    }

    const status = this.mapTransactionStatus(tx.status);

    return {
      success: status === 'succeeded',
      paymentId,
      status,
      gatewayType: this.type,
      gatewayPaymentId: tx.mihpayid,
      amount: Math.round(parseFloat(tx.amount) * 100),
      currency: this.getRegionCurrency(),
      metadata: {
        mode: tx.mode,
        bankRefNum: tx.bank_ref_num,
        pgType: tx.pg_TYPE,
        netAmountDebit: tx.net_amount_debit,
      },
    };
  }

  async capturePayment(paymentId: string, amount?: number): Promise<PaymentResult> {
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

    if (response.status === 1) {
      return {
        success: true,
        paymentId,
        status: 'succeeded' as PaymentStatus,
        gatewayType: this.type,
        gatewayPaymentId: paymentId,
      };
    }

    return {
      success: false,
      paymentId,
      status: 'failed' as PaymentStatus,
      gatewayType: this.type,
      error: response.msg,
    };
  }

  async cancelPayment(paymentId: string): Promise<PaymentResult> {
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

    return {
      success: response.status === 1,
      paymentId,
      status: response.status === 1 ? 'canceled' as PaymentStatus : 'failed' as PaymentStatus,
      gatewayType: this.type,
      error: response.status !== 1 ? response.msg : undefined,
    };
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult> {
    // PayU Standing Instructions (SI) for recurring payments
    // This is India-specific
    if (this.config.region !== 'india') {
      return {
        success: false,
        subscriptionId: '',
        status: 'pending' as SubscriptionGatewayStatus,
        gatewayType: this.type,
        error: 'Subscriptions only supported in India region via Standing Instructions',
      };
    }

    const txnid = `si_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const amount = (input.amount / 100).toFixed(2);

    const params: Record<string, string> = {
      key: this.config.merchantKey,
      txnid,
      amount,
      productinfo: input.planId,
      firstname: input.customerName?.split(' ')[0] || 'User',
      email: input.email,
      phone: input.phone || '',
      surl: input.returnUrl || 'https://aivo.education/subscription/success',
      furl: input.returnUrl || 'https://aivo.education/subscription/failure',
      // SI specific parameters
      si: '1',
      si_details: JSON.stringify({
        billingAmount: amount,
        billingCurrency: input.currency,
        billingCycle: this.mapBillingCycle(input.interval),
        billingInterval: '1',
        paymentStartDate: new Date().toISOString().split('T')[0],
        paymentEndDate: this.calculateEndDate(input.interval, 12).split('T')[0], // 12 cycles
      }),
    };

    params.hash = this.generateHash(params);

    const checkoutUrl = `${this.baseUrl}/_payment`;

    return {
      success: true,
      subscriptionId: txnid,
      status: 'pending' as SubscriptionGatewayStatus,
      gatewayType: this.type,
      gatewaySubscriptionId: txnid,
      currentPeriodEnd: this.calculateEndDate(input.interval, 1),
      redirectUrl: `${checkoutUrl}?${new URLSearchParams(params).toString()}`,
      metadata: {
        note: 'Redirect user to complete SI mandate registration',
      },
    };
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    if (this.config.region !== 'india') {
      return {
        success: false,
        subscriptionId,
        status: 'pending' as SubscriptionGatewayStatus,
        gatewayType: this.type,
        error: 'Subscription lookup only available for India region',
      };
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
      return {
        success: false,
        subscriptionId,
        status: 'pending' as SubscriptionGatewayStatus,
        gatewayType: this.type,
        error: response.msg || 'SI status check failed',
      };
    }

    return {
      success: true,
      subscriptionId,
      status: this.mapSIStatus(response.si_status || ''),
      gatewayType: this.type,
      gatewaySubscriptionId: subscriptionId,
    };
  }

  async updateSubscription(
    subscriptionId: string,
    input: Partial<CreateSubscriptionInput>
  ): Promise<SubscriptionResult> {
    return {
      success: false,
      subscriptionId,
      status: 'active' as SubscriptionGatewayStatus,
      gatewayType: this.type,
      error: 'PayU SI modifications require new mandate registration',
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    if (this.config.region !== 'india') {
      return {
        success: false,
        subscriptionId,
        status: 'active' as SubscriptionGatewayStatus,
        gatewayType: this.type,
        error: 'Subscription cancellation only available for India region',
      };
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

    return {
      success: response.status === 1,
      subscriptionId,
      status: response.status === 1 ? 'canceled' as SubscriptionGatewayStatus : 'active' as SubscriptionGatewayStatus,
      gatewayType: this.type,
      error: response.status !== 1 ? response.msg : undefined,
    };
  }

  // ============================================
  // REFUND OPERATIONS
  // ============================================

  async createRefund(input: CreateRefundInput): Promise<RefundResult> {
    const command = 'cancel_refund_transaction';
    const refundId = `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // First verify the original transaction
    const verifyResult = await this.verifyPayment(input.paymentId);
    if (!verifyResult.success || !verifyResult.gatewayPaymentId) {
      return {
        success: false,
        refundId: '',
        status: 'failed' as RefundStatus,
        gatewayType: this.type,
        error: 'Original transaction not found or invalid',
      };
    }

    const mihpayid = verifyResult.gatewayPaymentId;
    const amount = input.amount ? (input.amount / 100).toFixed(2) : (verifyResult.amount! / 100).toFixed(2);

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

    if (response.status === 1) {
      return {
        success: true,
        refundId,
        status: 'pending' as RefundStatus,
        gatewayType: this.type,
        gatewayRefundId: response.request_id || refundId,
        amount: input.amount || verifyResult.amount,
        metadata: {
          bankRefNum: response.bank_ref_num,
        },
      };
    }

    return {
      success: false,
      refundId: '',
      status: 'failed' as RefundStatus,
      gatewayType: this.type,
      error: response.msg,
    };
  }

  async getRefund(refundId: string): Promise<RefundResult> {
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
      return {
        success: false,
        refundId,
        status: 'failed' as RefundStatus,
        gatewayType: this.type,
        error: response.msg || 'Refund status check failed',
      };
    }

    return {
      success: true,
      refundId,
      status: this.mapRefundStatus(response.action_status),
      gatewayType: this.type,
      gatewayRefundId: response.request_id,
      amount: Math.round(parseFloat(response.refund_amount) * 100),
    };
  }

  // ============================================
  // CHECKOUT SESSION
  // ============================================

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutResult> {
    const totalAmount = input.items.reduce(
      (sum, item) => sum + (item.amount * item.quantity),
      0
    );

    const paymentResult = await this.createPayment({
      amount: totalAmount,
      currency: input.currency,
      customerId: input.customerId,
      email: input.email,
      phone: input.phone,
      customerName: input.customerName,
      description: input.items.map(i => i.name).join(', '),
      returnUrl: input.successUrl,
      metadata: input.metadata,
    });

    return {
      success: paymentResult.success,
      sessionId: paymentResult.paymentId,
      checkoutUrl: paymentResult.redirectUrl,
      gatewayType: this.type,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };
  }

  // ============================================
  // WEBHOOK HANDLING
  // ============================================

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    // PayU sends response hash in the payload itself
    const params = JSON.parse(payload);
    
    if (!params.hash) {
      console.warn('No hash in PayU webhook payload');
      return false;
    }

    const expectedHash = this.generateVerifyHash(params);
    return params.hash === expectedHash;
  }

  async handleWebhook(payload: string, signature: string): Promise<WebhookResult> {
    const params = JSON.parse(payload);
    
    // Verify hash
    const isValid = await this.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      return {
        success: false,
        eventType: 'unknown',
        gatewayType: this.type,
        error: 'Invalid webhook hash',
      };
    }

    const status = this.mapTransactionStatus(params.status);
    let eventType: string;

    if (status === 'succeeded') {
      eventType = params.si ? 'subscription.created' : 'payment.succeeded';
    } else if (status === 'failed') {
      eventType = 'payment.failed';
    } else {
      eventType = 'payment.pending';
    }

    return {
      success: true,
      eventType,
      gatewayType: this.type,
      resourceId: params.txnid,
      metadata: {
        mihpayid: params.mihpayid,
        mode: params.mode,
        amount: params.amount,
        status: params.status,
        unmappedstatus: params.unmappedstatus,
      },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private mapTransactionStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      success: 'succeeded',
      captured: 'succeeded',
      failure: 'failed',
      failed: 'failed',
      pending: 'pending',
      inprogress: 'pending',
      bounced: 'failed',
      userCancelled: 'canceled',
    };
    return statusMap[status.toLowerCase()] || 'pending';
  }

  private mapSIStatus(status: string): SubscriptionGatewayStatus {
    const statusMap: Record<string, SubscriptionGatewayStatus> = {
      active: 'active',
      paused: 'paused',
      cancelled: 'canceled',
      expired: 'canceled',
    };
    return statusMap[status.toLowerCase()] || 'active';
  }

  private mapRefundStatus(status: string): RefundStatus {
    const statusMap: Record<string, RefundStatus> = {
      success: 'succeeded',
      pending: 'pending',
      queued: 'pending',
      failure: 'failed',
    };
    return statusMap[status.toLowerCase()] || 'pending';
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
      day: 'DAILY',
      week: 'WEEKLY',
      month: 'MONTHLY',
      year: 'YEARLY',
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

  private calculateEndDate(interval: string, cycles: number): string {
    const date = new Date();
    switch (interval) {
      case 'day':
        date.setDate(date.getDate() + cycles);
        break;
      case 'week':
        date.setDate(date.getDate() + (cycles * 7));
        break;
      case 'month':
        date.setMonth(date.getMonth() + cycles);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() + cycles);
        break;
    }
    return date.toISOString();
  }

  getCapabilities(): GatewayCapabilities {
    return {
      supportedCurrencies: REGIONAL_CURRENCIES[this.config.region] || [],
      supportedCountries: REGIONAL_COUNTRIES[this.config.region] || [],
      supportedPaymentMethods: REGIONAL_PAYMENT_METHODS[this.config.region] || ['card'],
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsSubscriptions: this.config.region === 'india', // SI only in India
      supportsCheckout: true,
      supportsWebhooks: true,
      webhookEvents: [
        'payment.succeeded',
        'payment.failed',
        'refund.succeeded',
        'subscription.created',
        'subscription.canceled',
      ],
    };
  }
}

/**
 * Create and configure a PayU gateway instance
 */
export function createPayUGateway(config: PayUConfig): PayUGateway {
  return new PayUGateway(config);
}
