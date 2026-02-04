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

import * as crypto from 'crypto';

import type {
  PaymentGateway,
  CreateCustomerInput,
  UpdateCustomerInput,
  CreatePaymentInput,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  CreateRefundInput,
  CreateCheckoutInput,
  VerifyPaymentInput,
  GatewayCustomer,
  GatewayPayment,
  GatewaySubscription,
  GatewayRefund,
  GatewayCheckoutSession,
  PaymentVerificationResult,
  WebhookVerificationResult,
} from './payment-gateway.interface';
import {
  WebhookEventType,
  PaymentStatus,
  SubscriptionGatewayStatus,
  RefundStatus,
  PaymentGatewayType,
} from './payment-gateway.interface';

interface PaytmConfig {
  merchantId: string;
  merchantKey: string;
  website: string; // e.g., 'WEBSTAGING' for sandbox, 'DEFAULT' for production
  industryType: string; // e.g., 'Retail', 'Ecommerce'
  channelId: string; // e.g., 'WEB', 'WAP'
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

interface _PaytmChecksum {
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
  readonly type: PaymentGatewayType = PaymentGatewayType.PAYTM;
  readonly supportedCurrencies: string[] = ['INR'];
  readonly supportedCountries: string[] = ['IN'];
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
  // AVAILABILITY CHECK
  // ============================================

  isAvailable(): boolean {
    return !!(this.config.merchantId && this.config.merchantKey);
  }

  // ============================================
  // CHECKSUM GENERATION
  // ============================================

  private generateChecksum(params: Record<string, string>): string {
    // Sort parameters and create string
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys.map((key) => `${key}=${params[key]}`).join('|');

    // Paytm uses AES encryption for checksum
    const salt = this.generateRandomString(4);
    const finalString = `${paramString}|${salt}`;

    // SHA256 hash
    const hash = crypto.createHash('sha256').update(finalString).digest('hex');
    const hashWithSalt = `${hash}${salt}`;

    // AES encrypt
    const iv = Buffer.from('@@@@&&&&####$$$$', 'utf8');
    const key = Buffer.from(this.config.merchantKey, 'utf8');
    const cipher = crypto.createCipheriv('aes-128-cbc', key.subarray(0, 16), iv);
    let encrypted = cipher.update(hashWithSalt, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return encrypted;
  }

  private verifyChecksum(params: Record<string, string>, checksum: string): boolean {
    try {
      // Decrypt checksum
      const iv = Buffer.from('@@@@&&&&####$$$$', 'utf8');
      const key = Buffer.from(this.config.merchantKey, 'utf8');
      const decipher = crypto.createDecipheriv('aes-128-cbc', key.subarray(0, 16), iv);
      let decrypted = decipher.update(checksum, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      // Extract hash and salt
      const hash = decrypted.slice(0, 64);
      const salt = decrypted.slice(64);

      // Recreate hash
      const sortedKeys = Object.keys(params).sort();
      const paramString = sortedKeys
        .filter((key) => key !== 'CHECKSUMHASH')
        .map((key) => `${key}=${params[key]}`)
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

    const data = (await response.json()) as PaytmTransactionResponse;

    if (data.body.resultInfo.resultStatus !== 'S') {
      throw new Error(data.body.resultInfo.resultMsg);
    }

    return { txnToken: data.body.txnId || '' };
  }

  private generateSignature(body: string): string {
    return crypto.createHmac('sha256', this.config.merchantKey).update(body).digest('base64');
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
  // HELPER: Convert GatewayMetadata to Record<string, string>
  // ============================================

  private toStringRecord(metadata?: Record<string, string | undefined>): Record<string, string> {
    if (!metadata) return {};
    return Object.fromEntries(
      Object.entries(metadata).filter((entry): entry is [string, string] => entry[1] !== undefined)
    );
  }

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  async createCustomer(input: CreateCustomerInput): Promise<GatewayCustomer> {
    // Paytm doesn't have standalone customer management
    const customerId = `paytm_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      id: customerId,
      gatewayType: PaymentGatewayType.PAYTM,
      email: input.email,
      name: input.name,
      phone: input.phone,
      address: input.address,
      metadata: this.toStringRecord(input.metadata),
      createdAt: new Date(),
      rawResponse: null,
    };
  }

  async getCustomer(_customerId: string): Promise<GatewayCustomer | null> {
    // Paytm doesn't have standalone customer management
    return null;
  }

  async updateCustomer(customerId: string, input: UpdateCustomerInput): Promise<GatewayCustomer> {
    return {
      id: customerId,
      gatewayType: PaymentGatewayType.PAYTM,
      email: input.email || '',
      name: input.name,
      phone: input.phone,
      address: input.address,
      metadata: input.metadata || {},
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
    const orderId = `AIVO_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const customerId = input.customerId;

    try {
      // Step 1: Initiate transaction to get txnToken
      const { txnToken } = await this.initiateTransaction(orderId, input.amountCents, customerId);

      // Build checkout URL
      const checkoutUrl = `${this.baseUrl}/theia/api/v1/showPaymentPage?mid=${this.config.merchantId}&orderId=${orderId}&txnToken=${txnToken}`;

      return {
        id: orderId,
        gatewayType: PaymentGatewayType.PAYTM,
        customerId,
        amountCents: input.amountCents,
        currency: input.currency || 'INR',
        status: PaymentStatus.PENDING,
        description: input.description,
        metadata: {
          txnToken,
          note: 'Redirect user to authorizationUrl to complete payment',
        },
        authorizationUrl: checkoutUrl,
        reference: orderId,
        createdAt: new Date(),
        rawResponse: { txnToken },
      };
    } catch (error) {
      return {
        id: orderId,
        gatewayType: PaymentGatewayType.PAYTM,
        customerId,
        amountCents: input.amountCents,
        currency: input.currency || 'INR',
        status: PaymentStatus.FAILED,
        metadata: {
          error: error instanceof Error ? error.message : 'Payment initiation failed',
        },
        createdAt: new Date(),
        rawResponse: null,
      };
    }
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    const body = {
      mid: this.config.merchantId,
      orderId: input.reference,
    };

    const response = await this.request<PaytmTransactionResponse>('/order/status', body, {
      mid: this.config.merchantId,
      orderId: input.reference,
    });

    const resultStatus = response.body.resultInfo.resultStatus;
    const status = this.mapTransactionStatus(resultStatus);

    const payment: GatewayPayment = {
      id: input.reference,
      gatewayType: PaymentGatewayType.PAYTM,
      customerId: '',
      amountCents: response.body.txnAmount
        ? Math.round(parseFloat(response.body.txnAmount) * 100)
        : 0,
      currency: 'INR',
      status,
      metadata: {
        resultCode: response.body.resultInfo.resultCode,
        resultMsg: response.body.resultInfo.resultMsg,
        bankTxnId: response.body.bankTxnId || '',
        paymentMode: response.body.paymentMode || '',
        bankName: response.body.bankName || '',
        txnDate: response.body.txnDate || '',
      },
      reference: response.body.txnId,
      paidAt:
        status === PaymentStatus.SUCCEEDED && response.body.txnDate
          ? new Date(response.body.txnDate)
          : undefined,
      createdAt: response.body.txnDate ? new Date(response.body.txnDate) : new Date(),
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
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const customerId = input.customerId;
    const now = new Date();

    const body = {
      mid: this.config.merchantId,
      subscriptionAmountType: 'FIX',
      subscriptionMaxAmount: (input.amountCents / 100).toFixed(2),
      subscriptionFrequency: this.mapFrequency(input.interval),
      subscriptionFrequencyUnit: this.mapFrequencyUnit(input.interval),
      subscriptionGraceDays: '3',
      subscriptionExpiryDate: this.calculateExpiryDate(input.interval, 12), // 12 billing cycles
      subscriptionEnableRetry: '1',
      subscriptionRetryCount: '3',
      txnAmount: {
        value: (input.amountCents / 100).toFixed(2),
        currency: input.currency || 'INR',
      },
      userInfo: {
        custId: customerId,
      },
      orderId: subscriptionId,
      websiteName: this.config.website,
      callbackUrl: this.config.callbackUrl,
      requestType: 'SUBSCRIPTION',
    };

    const response = await this.request<PaytmSubscriptionResponse>('/subscription/create', body, {
      mid: this.config.merchantId,
    });

    if (response.body.resultInfo.resultStatus !== 'S') {
      throw new Error(response.body.resultInfo.resultMsg);
    }

    return {
      id: response.body.subscriptionId || subscriptionId,
      gatewayType: PaymentGatewayType.PAYTM,
      customerId,
      planCode: input.planCode,
      status: SubscriptionGatewayStatus.ACTIVE,
      amountCents: input.amountCents,
      currency: input.currency || 'INR',
      interval: input.interval,
      quantity: 1,
      currentPeriodStart: now,
      currentPeriodEnd: this.calculatePeriodEnd(input.interval),
      cancelAtPeriodEnd: false,
      metadata: this.toStringRecord(input.metadata),
      createdAt: now,
      rawResponse: response,
    };
  }

  async getSubscription(subscriptionId: string): Promise<GatewaySubscription | null> {
    const body = {
      mid: this.config.merchantId,
      subscriptionId,
    };

    try {
      const response = await this.request<PaytmSubscriptionResponse>('/subscription/status', body, {
        mid: this.config.merchantId,
      });

      if (response.body.resultInfo.resultStatus !== 'S') {
        return null;
      }

      const now = new Date();
      return {
        id: response.body.subscriptionId || subscriptionId,
        gatewayType: PaymentGatewayType.PAYTM,
        customerId: '',
        planCode: '',
        status: this.mapSubscriptionStatus(response.body.status || ''),
        amountCents: 0,
        currency: 'INR',
        interval: 'monthly',
        quantity: 1,
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        metadata: {},
        createdAt: now,
        rawResponse: response,
      };
    } catch {
      return null;
    }
  }

  async updateSubscription(
    subscriptionId: string,
    input: UpdateSubscriptionInput
  ): Promise<GatewaySubscription> {
    // Paytm subscriptions can be modified for amount
    if (input.amountCents) {
      const body = {
        mid: this.config.merchantId,
        subscriptionId,
        subscriptionMaxAmount: (input.amountCents / 100).toFixed(2),
      };

      const response = await this.request<PaytmSubscriptionResponse>('/subscription/update', body, {
        mid: this.config.merchantId,
      });

      if (response.body.resultInfo.resultStatus !== 'S') {
        throw new Error(response.body.resultInfo.resultMsg);
      }
    }

    const now = new Date();
    return {
      id: subscriptionId,
      gatewayType: PaymentGatewayType.PAYTM,
      customerId: '',
      planCode: input.planCode || '',
      status: SubscriptionGatewayStatus.ACTIVE,
      amountCents: input.amountCents || 0,
      currency: 'INR',
      interval: 'monthly',
      quantity: input.quantity || 1,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: input.cancelAtPeriodEnd || false,
      metadata: input.metadata || {},
      createdAt: now,
      rawResponse: null,
    };
  }

  async cancelSubscription(
    subscriptionId: string,
    options?: { immediate?: boolean }
  ): Promise<GatewaySubscription> {
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
      throw new Error(response.body.resultInfo.resultMsg);
    }

    const now = new Date();
    return {
      id: subscriptionId,
      gatewayType: PaymentGatewayType.PAYTM,
      customerId: '',
      planCode: '',
      status: SubscriptionGatewayStatus.CANCELED,
      amountCents: 0,
      currency: 'INR',
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

  async resumeSubscription(subscriptionId: string): Promise<GatewaySubscription> {
    const body = {
      mid: this.config.merchantId,
      subscriptionId,
      status: 'ACTIVE',
    };

    const response = await this.request<PaytmSubscriptionResponse>(
      '/subscription/status/update',
      body,
      { mid: this.config.merchantId }
    );

    if (response.body.resultInfo.resultStatus !== 'S') {
      throw new Error(response.body.resultInfo.resultMsg);
    }

    const now = new Date();
    return {
      id: subscriptionId,
      gatewayType: PaymentGatewayType.PAYTM,
      customerId: '',
      planCode: '',
      status: SubscriptionGatewayStatus.ACTIVE,
      amountCents: 0,
      currency: 'INR',
      interval: 'monthly',
      quantity: 1,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      metadata: {},
      createdAt: now,
      rawResponse: response,
    };
  }

  // ============================================
  // REFUND OPERATIONS
  // ============================================

  async createRefund(input: CreateRefundInput): Promise<GatewayRefund> {
    const refundId = `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // First verify the original transaction
    const verifyResult = await this.verifyPayment({ reference: input.paymentId });
    if (!verifyResult.verified) {
      throw new Error('Original transaction not found or incomplete');
    }

    const refundAmountCents = input.amountCents || verifyResult.payment.amountCents;

    const body = {
      mid: this.config.merchantId,
      txnId: verifyResult.payment.reference,
      orderId: input.paymentId,
      refId: refundId,
      refundAmount: (refundAmountCents / 100).toFixed(2),
      comments: input.reason || 'Refund request',
    };

    const response = await this.request<PaytmRefundResponse>('/refund/apply', body, {
      mid: this.config.merchantId,
    });

    if (
      response.body.resultInfo.resultStatus !== 'TXN_SUCCESS' &&
      response.body.resultInfo.resultStatus !== 'PENDING'
    ) {
      throw new Error(response.body.resultInfo.resultMsg);
    }

    return {
      id: response.body.refundId || refundId,
      gatewayType: PaymentGatewayType.PAYTM,
      paymentId: input.paymentId,
      amountCents: refundAmountCents,
      currency: 'INR',
      status:
        response.body.resultInfo.resultStatus === 'TXN_SUCCESS'
          ? RefundStatus.SUCCEEDED
          : RefundStatus.PENDING,
      reason: input.reason,
      createdAt: new Date(),
      rawResponse: response,
    };
  }

  async getRefund(refundId: string): Promise<GatewayRefund | null> {
    const body = {
      mid: this.config.merchantId,
      refId: refundId,
    };

    try {
      const response = await this.request<PaytmRefundResponse>('/refund/status', body, {
        mid: this.config.merchantId,
      });

      if (response.body.resultInfo.resultStatus === 'TXN_FAILURE') {
        return null;
      }

      return {
        id: response.body.refundId || refundId,
        gatewayType: PaymentGatewayType.PAYTM,
        paymentId: response.body.orderId || '',
        amountCents: response.body.refundAmount
          ? Math.round(parseFloat(response.body.refundAmount) * 100)
          : 0,
        currency: 'INR',
        status: this.mapRefundStatus(response.body.resultInfo.resultStatus),
        createdAt: new Date(),
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
    const totalAmountCents = input.items.reduce(
      (sum, item) => sum + item.amountCents * item.quantity,
      0
    );

    const paymentResult = await this.createPayment({
      customerId: input.customerId || '',
      amountCents: totalAmountCents,
      currency: input.currency || 'INR',
      description: input.items.map((i) => i.name).join(', '),
      returnUrl: input.successUrl,
      callbackUrl: input.callbackUrl,
      metadata: input.metadata,
    });

    return {
      id: paymentResult.id,
      gatewayType: PaymentGatewayType.PAYTM,
      url: paymentResult.authorizationUrl || '',
      reference: paymentResult.reference,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      rawResponse: paymentResult.rawResponse,
    };
  }

  // ============================================
  // WEBHOOK HANDLING
  // ============================================

  async verifyWebhook(
    payload: string | Buffer,
    headers: Record<string, string>
  ): Promise<WebhookVerificationResult> {
    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf8');
    const params = JSON.parse(payloadStr);
    const signature = headers['x-checksum'] || headers.checksumhash || params.CHECKSUMHASH;

    // Verify checksum
    const isValid = this.verifyChecksum(params, signature);
    if (!isValid) {
      return {
        verified: false,
        error: 'Invalid webhook checksum',
      };
    }

    const status = this.mapTransactionStatus(params.STATUS || params.RESPCODE);
    let eventType: WebhookEventType;

    if (params.SUBSID) {
      // Subscription event
      eventType =
        status === PaymentStatus.SUCCEEDED
          ? WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCESS
          : WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED;
    } else if (params.REFUNDID) {
      // Refund event
      eventType = WebhookEventType.REFUND_PROCESSED;
    } else {
      // Regular payment
      eventType =
        status === PaymentStatus.SUCCEEDED
          ? WebhookEventType.PAYMENT_SUCCESS
          : WebhookEventType.PAYMENT_FAILED;
    }

    return {
      verified: true,
      event: {
        id: params.ORDERID || params.TXNID || '',
        gatewayType: PaymentGatewayType.PAYTM,
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
      TXN_SUCCESS: PaymentStatus.SUCCEEDED,
      S: PaymentStatus.SUCCEEDED,
      PENDING: PaymentStatus.PENDING,
      P: PaymentStatus.PENDING,
      TXN_FAILURE: PaymentStatus.FAILED,
      F: PaymentStatus.FAILED,
      '01': PaymentStatus.SUCCEEDED, // Response code for success
    };
    return statusMap[status] || PaymentStatus.PENDING;
  }

  private mapSubscriptionStatus(status: string): SubscriptionGatewayStatus {
    const statusMap: Record<string, SubscriptionGatewayStatus> = {
      ACTIVE: SubscriptionGatewayStatus.ACTIVE,
      CREATED: SubscriptionGatewayStatus.ACTIVE,
      PAUSED: SubscriptionGatewayStatus.PAUSED,
      CANCELLED: SubscriptionGatewayStatus.CANCELED,
      EXPIRED: SubscriptionGatewayStatus.CANCELED,
    };
    return statusMap[status.toUpperCase()] || SubscriptionGatewayStatus.ACTIVE;
  }

  private mapRefundStatus(status: string): RefundStatus {
    const statusMap: Record<string, RefundStatus> = {
      TXN_SUCCESS: RefundStatus.SUCCEEDED,
      SUCCESS: RefundStatus.SUCCEEDED,
      PENDING: RefundStatus.PENDING,
      TXN_FAILURE: RefundStatus.FAILED,
      FAILURE: RefundStatus.FAILED,
    };
    return statusMap[status] || RefundStatus.PENDING;
  }

  private mapFrequency(interval: string): string {
    const freqMap: Record<string, string> = {
      daily: '1',
      weekly: '1',
      monthly: '1',
      quarterly: '3',
      yearly: '1',
    };
    return freqMap[interval] || '1';
  }

  private mapFrequencyUnit(interval: string): string {
    const unitMap: Record<string, string> = {
      daily: 'DAY',
      weekly: 'WEEK',
      monthly: 'MONTH',
      quarterly: 'MONTH',
      yearly: 'YEAR',
    };
    return unitMap[interval] || 'MONTH';
  }

  private calculateExpiryDate(interval: string, cycles: number): string {
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
    return date.toISOString().split('T')[0]!;
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
      case 'quarterly':
        return new Date(now.setMonth(now.getMonth() + 3));
      case 'yearly':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        return new Date(now.setMonth(now.getMonth() + 1));
    }
  }
}

/**
 * Create and configure a Paytm gateway instance
 */
export function createPaytmGateway(config: PaytmConfig): PaytmGateway {
  return new PaytmGateway(config);
}
