/**
 * Paytm Payment Gateway Implementation
 * 
 * Paytm is one of India's largest payment platforms with support for:
 * - Paytm Wallet
 * - Credit/Debit Cards
 * - Net Banking
 * - UPI (Unified Payments Interface)
 * - EMI (Equated Monthly Installments)
 * - Paytm Postpaid (Buy Now Pay Later)
 * 
 * Regional Focus: India
 * Supported Currency: INR
 * 
 * Uses Paytm All-in-One Payment Gateway API
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

interface PaytmConfig {
  merchantId: string;
  merchantKey: string;
  website: string; // e.g., 'WEBSTAGING' for sandbox, 'DEFAULT' for production
  industryType: string; // e.g., 'Retail', 'Ecommerce'
  channelId: string; // e.g., 'WEB', 'WAP'
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

interface PaytmChecksum {
  signature: string;
  body: Record<string, unknown>;
}

interface PaytmTransactionResponse {
  head: {
    responseTimestamp: string;
    version: string;
    signature: string;
  };
  body: {
    resultInfo: {
      resultStatus: string;
      resultCode: string;
      resultMsg: string;
    };
    txnId?: string;
    bankTxnId?: string;
    orderId?: string;
    txnAmount?: string;
    txnType?: string;
    gatewayName?: string;
    bankName?: string;
    mid?: string;
    paymentMode?: string;
    refundAmt?: string;
    txnDate?: string;
  };
}

interface PaytmRefundResponse {
  head: {
    responseTimestamp: string;
    signature: string;
  };
  body: {
    resultInfo: {
      resultStatus: string;
      resultCode: string;
      resultMsg: string;
    };
    txnId?: string;
    orderId?: string;
    refId?: string;
    refundId?: string;
    txnAmount?: string;
    refundAmount?: string;
  };
}

interface PaytmSubscriptionResponse {
  head: {
    responseTimestamp: string;
    signature: string;
  };
  body: {
    resultInfo: {
      resultStatus: string;
      resultCode: string;
      resultMsg: string;
    };
    subscriptionId?: string;
    status?: string;
    txnToken?: string;
  };
}

export class PaytmGateway implements PaymentGateway {
  readonly type: PaymentGatewayType = 'PAYTM';
  private readonly baseUrl: string;
  private readonly merchantUrl: string;
  private readonly config: PaytmConfig;

  constructor(config: PaytmConfig) {
    this.config = config;
    
    if (config.environment === 'production') {
      this.baseUrl = 'https://securegw.paytm.in';
      this.merchantUrl = 'https://securegw.paytm.in/theia/api/v1';
    } else {
      this.baseUrl = 'https://securegw-stage.paytm.in';
      this.merchantUrl = 'https://securegw-stage.paytm.in/theia/api/v1';
    }
  }

  // ============================================
  // CHECKSUM GENERATION
  // ============================================

  private generateChecksum(params: Record<string, string>): string {
    // Sort parameters and create string
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys
      .map(key => `${key}=${params[key]}`)
      .join('|');

    // Paytm uses AES encryption for checksum
    const salt = this.generateRandomString(4);
    const finalString = `${paramString}|${salt}`;

    // SHA256 hash
    const hash = crypto.createHash('sha256').update(finalString).digest('hex');
    const hashWithSalt = `${hash}${salt}`;

    // AES encrypt
    const iv = Buffer.from('@@@@&&&&####$$$$', 'utf8');
    const key = Buffer.from(this.config.merchantKey, 'utf8');
    const cipher = crypto.createCipheriv('aes-128-cbc', key.slice(0, 16), iv);
    let encrypted = cipher.update(hashWithSalt, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return encrypted;
  }

  private verifyChecksum(params: Record<string, string>, checksum: string): boolean {
    try {
      // Decrypt checksum
      const iv = Buffer.from('@@@@&&&&####$$$$', 'utf8');
      const key = Buffer.from(this.config.merchantKey, 'utf8');
      const decipher = crypto.createDecipheriv('aes-128-cbc', key.slice(0, 16), iv);
      let decrypted = decipher.update(checksum, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      // Extract hash and salt
      const hash = decrypted.slice(0, 64);
      const salt = decrypted.slice(64);

      // Recreate hash
      const sortedKeys = Object.keys(params).sort();
      const paramString = sortedKeys
        .filter(key => key !== 'CHECKSUMHASH')
        .map(key => `${key}=${params[key]}`)
        .join('|');
      const finalString = `${paramString}|${salt}`;
      const expectedHash = crypto.createHash('sha256').update(finalString).digest('hex');

      return hash === expectedHash;
    } catch {
      return false;
    }
  }

  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private async initiateTransaction(
    orderId: string,
    amount: number,
    customerId: string
  ): Promise<{ txnToken: string }> {
    const requestBody = {
      body: {
        requestType: 'Payment',
        mid: this.config.merchantId,
        websiteName: this.config.website,
        orderId,
        txnAmount: {
          value: (amount / 100).toFixed(2),
          currency: 'INR',
        },
        userInfo: {
          custId: customerId,
        },
        callbackUrl: this.config.callbackUrl,
      },
      head: {
        signature: '',
      },
    };

    // Generate signature for body
    const bodyString = JSON.stringify(requestBody.body);
    requestBody.head.signature = this.generateSignature(bodyString);

    const response = await fetch(
      `${this.merchantUrl}/initiateTransaction?mid=${this.config.merchantId}&orderId=${orderId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json() as PaytmTransactionResponse;

    if (data.body.resultInfo.resultStatus !== 'S') {
      throw new Error(data.body.resultInfo.resultMsg);
    }

    return { txnToken: data.body.txnId || '' };
  }

  private generateSignature(body: string): string {
    return crypto
      .createHmac('sha256', this.config.merchantKey)
      .update(body)
      .digest('base64');
  }

  private async request<T>(
    endpoint: string,
    body: Record<string, unknown>,
    queryParams?: Record<string, string>
  ): Promise<T> {
    const bodyString = JSON.stringify(body);
    const signature = this.generateSignature(bodyString);

    const requestBody = {
      body,
      head: { signature },
    };

    let url = `${this.merchantUrl}${endpoint}`;
    if (queryParams) {
      url += '?' + new URLSearchParams(queryParams).toString();
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    return response.json();
  }

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  async createCustomer(input: CreateCustomerInput): Promise<CustomerResult> {
    // Paytm doesn't have standalone customer management
    const customerId = `paytm_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      success: true,
      customerId,
      gatewayType: this.type,
      metadata: {
        email: input.email,
        name: input.name,
        phone: input.phone,
      },
    };
  }

  async getCustomer(customerId: string): Promise<CustomerResult> {
    return {
      success: true,
      customerId,
      gatewayType: this.type,
      metadata: {
        note: 'Paytm customers are transaction-based',
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
    const orderId = `AIVO_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const customerId = input.customerId || `cust_${Date.now()}`;

    try {
      // Step 1: Initiate transaction to get txnToken
      const { txnToken } = await this.initiateTransaction(
        orderId,
        input.amount,
        customerId
      );

      // Build checkout URL
      const checkoutUrl = `${this.baseUrl}/theia/api/v1/showPaymentPage?mid=${this.config.merchantId}&orderId=${orderId}&txnToken=${txnToken}`;

      return {
        success: true,
        paymentId: orderId,
        status: 'pending' as PaymentStatus,
        gatewayType: this.type,
        gatewayPaymentId: orderId,
        amount: input.amount,
        currency: 'INR',
        redirectUrl: checkoutUrl,
        metadata: {
          txnToken,
          customerId,
          note: 'Redirect user to checkoutUrl to complete payment',
        },
      };
    } catch (error) {
      return {
        success: false,
        paymentId: orderId,
        status: 'failed' as PaymentStatus,
        gatewayType: this.type,
        error: error instanceof Error ? error.message : 'Payment initiation failed',
      };
    }
  }

  async verifyPayment(paymentId: string): Promise<PaymentResult> {
    const body = {
      mid: this.config.merchantId,
      orderId: paymentId,
    };

    const response = await this.request<PaytmTransactionResponse>(
      '/order/status',
      body,
      { mid: this.config.merchantId, orderId: paymentId }
    );

    const resultStatus = response.body.resultInfo.resultStatus;
    const status = this.mapTransactionStatus(resultStatus);

    return {
      success: status === 'succeeded',
      paymentId,
      status,
      gatewayType: this.type,
      gatewayPaymentId: response.body.txnId,
      amount: response.body.txnAmount ? Math.round(parseFloat(response.body.txnAmount) * 100) : undefined,
      currency: 'INR',
      metadata: {
        resultCode: response.body.resultInfo.resultCode,
        resultMsg: response.body.resultInfo.resultMsg,
        bankTxnId: response.body.bankTxnId,
        paymentMode: response.body.paymentMode,
        bankName: response.body.bankName,
        txnDate: response.body.txnDate,
      },
    };
  }

  async capturePayment(paymentId: string, amount?: number): Promise<PaymentResult> {
    // Paytm auto-captures payments
    return this.verifyPayment(paymentId);
  }

  async cancelPayment(paymentId: string): Promise<PaymentResult> {
    // Paytm doesn't support cancellation, only refunds
    return {
      success: false,
      paymentId,
      status: 'failed' as PaymentStatus,
      gatewayType: this.type,
      error: 'Paytm payments cannot be canceled. Use refund for completed transactions.',
    };
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult> {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const customerId = input.customerId || `cust_${Date.now()}`;

    const body = {
      mid: this.config.merchantId,
      subscriptionAmountType: 'FIX',
      subscriptionMaxAmount: (input.amount / 100).toFixed(2),
      subscriptionFrequency: this.mapFrequency(input.interval),
      subscriptionFrequencyUnit: this.mapFrequencyUnit(input.interval),
      subscriptionGraceDays: '3',
      subscriptionExpiryDate: this.calculateExpiryDate(input.interval, 12), // 12 billing cycles
      subscriptionEnableRetry: '1',
      subscriptionRetryCount: '3',
      txnAmount: {
        value: (input.amount / 100).toFixed(2),
        currency: 'INR',
      },
      userInfo: {
        custId: customerId,
        email: input.email,
        mobile: input.phone,
      },
      orderId: subscriptionId,
      websiteName: this.config.website,
      callbackUrl: input.returnUrl || this.config.callbackUrl,
      requestType: 'SUBSCRIPTION',
    };

    try {
      const response = await this.request<PaytmSubscriptionResponse>(
        '/subscription/create',
        body,
        { mid: this.config.merchantId }
      );

      if (response.body.resultInfo.resultStatus !== 'S') {
        return {
          success: false,
          subscriptionId,
          status: 'pending' as SubscriptionGatewayStatus,
          gatewayType: this.type,
          error: response.body.resultInfo.resultMsg,
        };
      }

      // Build subscription activation URL
      const activationUrl = `${this.baseUrl}/subscription/api/v1/showPaymentPage?mid=${this.config.merchantId}&subscriptionId=${response.body.subscriptionId}&txnToken=${response.body.txnToken}`;

      return {
        success: true,
        subscriptionId,
        status: 'pending' as SubscriptionGatewayStatus,
        gatewayType: this.type,
        gatewaySubscriptionId: response.body.subscriptionId,
        currentPeriodEnd: this.calculatePeriodEnd(input.interval),
        redirectUrl: activationUrl,
        metadata: {
          txnToken: response.body.txnToken,
          note: 'Redirect user to activate subscription mandate',
        },
      };
    } catch (error) {
      return {
        success: false,
        subscriptionId,
        status: 'pending' as SubscriptionGatewayStatus,
        gatewayType: this.type,
        error: error instanceof Error ? error.message : 'Subscription creation failed',
      };
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    const body = {
      mid: this.config.merchantId,
      subscriptionId,
    };

    const response = await this.request<PaytmSubscriptionResponse>(
      '/subscription/status',
      body,
      { mid: this.config.merchantId }
    );

    if (response.body.resultInfo.resultStatus !== 'S') {
      return {
        success: false,
        subscriptionId,
        status: 'pending' as SubscriptionGatewayStatus,
        gatewayType: this.type,
        error: response.body.resultInfo.resultMsg,
      };
    }

    return {
      success: true,
      subscriptionId,
      status: this.mapSubscriptionStatus(response.body.status || ''),
      gatewayType: this.type,
      gatewaySubscriptionId: response.body.subscriptionId,
    };
  }

  async updateSubscription(
    subscriptionId: string,
    input: Partial<CreateSubscriptionInput>
  ): Promise<SubscriptionResult> {
    // Paytm subscriptions can be modified for amount
    if (input.amount) {
      const body = {
        mid: this.config.merchantId,
        subscriptionId,
        subscriptionMaxAmount: (input.amount / 100).toFixed(2),
      };

      const response = await this.request<PaytmSubscriptionResponse>(
        '/subscription/update',
        body,
        { mid: this.config.merchantId }
      );

      if (response.body.resultInfo.resultStatus !== 'S') {
        return {
          success: false,
          subscriptionId,
          status: 'active' as SubscriptionGatewayStatus,
          gatewayType: this.type,
          error: response.body.resultInfo.resultMsg,
        };
      }
    }

    return {
      success: true,
      subscriptionId,
      status: 'active' as SubscriptionGatewayStatus,
      gatewayType: this.type,
      gatewaySubscriptionId: subscriptionId,
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    const body = {
      mid: this.config.merchantId,
      subscriptionId,
      status: 'CANCEL',
    };

    const response = await this.request<PaytmSubscriptionResponse>(
      '/subscription/status/update',
      body,
      { mid: this.config.merchantId }
    );

    if (response.body.resultInfo.resultStatus !== 'S') {
      return {
        success: false,
        subscriptionId,
        status: 'active' as SubscriptionGatewayStatus,
        gatewayType: this.type,
        error: response.body.resultInfo.resultMsg,
      };
    }

    return {
      success: true,
      subscriptionId,
      status: 'canceled' as SubscriptionGatewayStatus,
      gatewayType: this.type,
      gatewaySubscriptionId: subscriptionId,
    };
  }

  // ============================================
  // REFUND OPERATIONS
  // ============================================

  async createRefund(input: CreateRefundInput): Promise<RefundResult> {
    const refundId = `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // First verify the original transaction
    const verifyResult = await this.verifyPayment(input.paymentId);
    if (!verifyResult.success) {
      return {
        success: false,
        refundId: '',
        status: 'failed' as RefundStatus,
        gatewayType: this.type,
        error: 'Original transaction not found or incomplete',
      };
    }

    const body = {
      mid: this.config.merchantId,
      txnId: verifyResult.gatewayPaymentId,
      orderId: input.paymentId,
      refId: refundId,
      refundAmount: input.amount 
        ? (input.amount / 100).toFixed(2) 
        : (verifyResult.amount! / 100).toFixed(2),
      comments: input.reason || 'Refund request',
    };

    try {
      const response = await this.request<PaytmRefundResponse>(
        '/refund/apply',
        body,
        { mid: this.config.merchantId }
      );

      if (response.body.resultInfo.resultStatus !== 'TXN_SUCCESS' &&
          response.body.resultInfo.resultStatus !== 'PENDING') {
        return {
          success: false,
          refundId,
          status: 'failed' as RefundStatus,
          gatewayType: this.type,
          error: response.body.resultInfo.resultMsg,
        };
      }

      return {
        success: true,
        refundId,
        status: response.body.resultInfo.resultStatus === 'TXN_SUCCESS' 
          ? 'succeeded' as RefundStatus 
          : 'pending' as RefundStatus,
        gatewayType: this.type,
        gatewayRefundId: response.body.refundId || response.body.txnId,
        amount: input.amount || verifyResult.amount,
        metadata: {
          refId: response.body.refId,
          orderId: response.body.orderId,
        },
      };
    } catch (error) {
      return {
        success: false,
        refundId: '',
        status: 'failed' as RefundStatus,
        gatewayType: this.type,
        error: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }

  async getRefund(refundId: string): Promise<RefundResult> {
    const body = {
      mid: this.config.merchantId,
      refId: refundId,
    };

    const response = await this.request<PaytmRefundResponse>(
      '/refund/status',
      body,
      { mid: this.config.merchantId }
    );

    if (response.body.resultInfo.resultStatus === 'TXN_FAILURE') {
      return {
        success: false,
        refundId,
        status: 'failed' as RefundStatus,
        gatewayType: this.type,
        error: response.body.resultInfo.resultMsg,
      };
    }

    return {
      success: true,
      refundId,
      status: this.mapRefundStatus(response.body.resultInfo.resultStatus),
      gatewayType: this.type,
      gatewayRefundId: response.body.refundId,
      amount: response.body.refundAmount 
        ? Math.round(parseFloat(response.body.refundAmount) * 100) 
        : undefined,
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
      currency: 'INR',
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
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      metadata: paymentResult.metadata,
    };
  }

  // ============================================
  // WEBHOOK HANDLING
  // ============================================

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    const params = JSON.parse(payload);
    return this.verifyChecksum(params, signature || params.CHECKSUMHASH);
  }

  async handleWebhook(payload: string, signature: string): Promise<WebhookResult> {
    const params = JSON.parse(payload);
    
    // Verify checksum
    const isValid = await this.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      return {
        success: false,
        eventType: 'unknown',
        gatewayType: this.type,
        error: 'Invalid webhook checksum',
      };
    }

    const status = this.mapTransactionStatus(params.STATUS || params.RESPCODE);
    let eventType: string;

    if (params.SUBSID) {
      // Subscription event
      eventType = status === 'succeeded' ? 'subscription.payment_succeeded' : 'subscription.payment_failed';
    } else if (params.REFUNDID) {
      // Refund event
      eventType = status === 'succeeded' ? 'refund.succeeded' : 'refund.failed';
    } else {
      // Regular payment
      eventType = status === 'succeeded' ? 'payment.succeeded' : 'payment.failed';
    }

    return {
      success: true,
      eventType,
      gatewayType: this.type,
      resourceId: params.ORDERID,
      metadata: {
        txnId: params.TXNID,
        bankTxnId: params.BANKTXNID,
        txnAmount: params.TXNAMOUNT,
        paymentMode: params.PAYMENTMODE,
        status: params.STATUS,
        respCode: params.RESPCODE,
        respMsg: params.RESPMSG,
        gatewayName: params.GATEWAYNAME,
      },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private mapTransactionStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      TXN_SUCCESS: 'succeeded',
      S: 'succeeded',
      PENDING: 'pending',
      P: 'pending',
      TXN_FAILURE: 'failed',
      F: 'failed',
      '01': 'succeeded', // Response code for success
    };
    return statusMap[status] || 'pending';
  }

  private mapSubscriptionStatus(status: string): SubscriptionGatewayStatus {
    const statusMap: Record<string, SubscriptionGatewayStatus> = {
      ACTIVE: 'active',
      CREATED: 'pending',
      PAUSED: 'paused',
      CANCELLED: 'canceled',
      EXPIRED: 'canceled',
    };
    return statusMap[status.toUpperCase()] || 'pending';
  }

  private mapRefundStatus(status: string): RefundStatus {
    const statusMap: Record<string, RefundStatus> = {
      TXN_SUCCESS: 'succeeded',
      SUCCESS: 'succeeded',
      PENDING: 'pending',
      TXN_FAILURE: 'failed',
      FAILURE: 'failed',
    };
    return statusMap[status] || 'pending';
  }

  private mapFrequency(interval: string): string {
    const freqMap: Record<string, string> = {
      day: '1',
      week: '1',
      month: '1',
      year: '1',
    };
    return freqMap[interval] || '1';
  }

  private mapFrequencyUnit(interval: string): string {
    const unitMap: Record<string, string> = {
      day: 'DAY',
      week: 'WEEK',
      month: 'MONTH',
      year: 'YEAR',
    };
    return unitMap[interval] || 'MONTH';
  }

  private calculateExpiryDate(interval: string, cycles: number): string {
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
    return date.toISOString().split('T')[0];
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
      supportedCurrencies: ['INR'],
      supportedCountries: ['IN'],
      supportedPaymentMethods: [
        'card',
        'wallet',
        'netbanking',
        'upi',
        'emi',
        'postpaid',
      ],
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsSubscriptions: true,
      supportsCheckout: true,
      supportsWebhooks: true,
      webhookEvents: [
        'payment.succeeded',
        'payment.failed',
        'refund.succeeded',
        'refund.failed',
        'subscription.created',
        'subscription.payment_succeeded',
        'subscription.payment_failed',
        'subscription.canceled',
      ],
    };
  }
}

/**
 * Create and configure a Paytm gateway instance
 */
export function createPaytmGateway(config: PaytmConfig): PaytmGateway {
  return new PaytmGateway(config);
}
