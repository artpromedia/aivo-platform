/**
 * M-Pesa Payment Gateway Implementation
 *
 * ⚠️ PRODUCTION STATUS: DISABLED (requires completion)
 *
 * This implementation is ~90% complete but requires production hardening:
 *
 * BLOCKERS FOR PRODUCTION:
 * 1. Transaction Storage: Currently uses in-memory Map (line 93)
 *    → Replace with Redis or PostgreSQL for persistence and scalability
 *
 * 2. Credentials: Environment variables defined but values not configured
 *    → Obtain Safaricom production credentials (consumer key, secret, short code, passkey)
 *    → Configure ENABLE_MPESA=true in production environment
 *
 * 3. Testing: No integration tests exist
 *    → Add STK Push flow tests (sandbox)
 *    → Test webhook callback handling
 *    → Test refund/reversal operations
 *    → Test error scenarios (timeout, cancellation, insufficient funds)
 *
 * 4. Monitoring: Missing transaction monitoring and alerting
 *    → Add metrics for success/failure rates
 *    → Add alerts for high failure rates
 *    → Add latency tracking
 *
 * ENABLEMENT PROCESS:
 * 1. Set ENABLE_MPESA=true in environment
 * 2. Configure all MPESA_* environment variables
 * 3. Replace transactionStore Map with persistent storage
 * 4. Add integration tests and run against sandbox
 * 5. Update COUNTRY_GATEWAY_MAP: KE → MPESA (gateway.factory.ts line 113)
 * 6. Deploy and monitor
 *
 * M-Pesa is the leading mobile money platform in East Africa with support for:
 * - M-Pesa Express (STK Push) - Customer initiates from phone
 * - C2B (Customer to Business) - Customer sends to paybill/till
 * - B2C (Business to Customer) - Disbursements
 * - Transaction status queries
 * - Account balance queries
 *
 * Regional Focus: Kenya, Tanzania, Mozambique, DRC, Lesotho, Ghana, Egypt
 * Primary Currency: KES (Kenya Shillings), TZS (Tanzania Shillings)
 *
 * Safaricom M-Pesa API (Daraja Platform)
 */

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
  WebhookVerificationResult,
  PaymentVerificationResult,
} from './payment-gateway.interface';
import {
  WebhookEventType,
  PaymentStatus,
  RefundStatus,
  PaymentGatewayType,
} from './payment-gateway.interface';

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortCode: string; // Paybill or Till number
  passKey: string; // Lipa na M-Pesa Online passkey
  callbackUrl: string;
  environment: 'sandbox' | 'production';
  initiatorName?: string;
  initiatorPassword?: string;
  securityCredential?: string; // For B2C
}

interface MpesaAccessToken {
  access_token: string;
  expires_in: string;
}

interface MpesaStkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface MpesaStkQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

// Store for tracking transactions (should use Redis/DB in production)
const transactionStore = new Map<
  string,
  {
    amountCents: number;
    phone: string;
    customerId: string;
    status: PaymentStatus;
    checkoutRequestId?: string;
    merchantRequestId?: string;
    mpesaReceiptNumber?: string;
    description?: string;
    currency: string;
    metadata: Record<string, string>;
    createdAt: Date;
  }
>();

export class MpesaGateway implements PaymentGateway {
  readonly type: PaymentGatewayType = PaymentGatewayType.MPESA;
  readonly supportedCurrencies: string[] = ['KES', 'TZS'];
  readonly supportedCountries: string[] = ['KE', 'TZ', 'MZ', 'CD', 'LS', 'GH', 'EG'];
  private readonly baseUrl: string;
  private readonly config: MpesaConfig;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(config: MpesaConfig) {
    this.config = config;
    this.baseUrl =
      config.environment === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';
  }

  isAvailable(): boolean {
    return !!(
      this.config.consumerKey &&
      this.config.consumerSecret &&
      this.config.shortCode &&
      this.config.passKey
    );
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`
    ).toString('base64');

    const response = await fetch(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`M-Pesa authentication failed: ${response.status}`);
    }

    const data = (await response.json()) as MpesaAccessToken;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + parseInt(data.expires_in) * 1000 - 60000; // 1 min buffer

    return this.accessToken;
  }

  private async request<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.errorMessage || `M-Pesa API error: ${response.status}`);
    }

    return data;
  }

  private generatePassword(): { password: string; timestamp: string } {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .substring(0, 14);

    const password = Buffer.from(
      `${this.config.shortCode}${this.config.passKey}${timestamp}`
    ).toString('base64');

    return { password, timestamp };
  }

  private formatPhoneNumber(phone: string): string {
    // Convert to 254XXXXXXXXX format
    let formatted = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');

    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.substring(1);
    } else if (formatted.startsWith('+254')) {
      formatted = formatted.substring(1);
    } else if (!formatted.startsWith('254')) {
      formatted = '254' + formatted;
    }

    return formatted;
  }

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  async createCustomer(input: CreateCustomerInput): Promise<GatewayCustomer> {
    // M-Pesa doesn't have customer accounts - phone number is the identifier
    const customerId = `mpesa_${this.formatPhoneNumber(input.phone || '')}`;

    return {
      id: customerId,
      gatewayType: this.type,
      email: input.email,
      name: input.name,
      phone: input.phone,
      metadata: input.metadata
        ? Object.fromEntries(
            Object.entries(input.metadata).filter(
              (entry): entry is [string, string] => entry[1] !== undefined
            )
          )
        : {},
      createdAt: new Date(),
      rawResponse: null,
    };
  }

  async getCustomer(customerId: string): Promise<GatewayCustomer | null> {
    // M-Pesa uses phone numbers as customer identifiers; no remote lookup available
    return {
      id: customerId,
      gatewayType: this.type,
      email: '',
      metadata: {
        note: 'M-Pesa uses phone numbers as customer identifiers',
      },
      createdAt: new Date(),
      rawResponse: null,
    };
  }

  async updateCustomer(customerId: string, input: UpdateCustomerInput): Promise<GatewayCustomer> {
    return {
      id: customerId,
      gatewayType: this.type,
      email: input.email || '',
      name: input.name,
      phone: input.phone,
      metadata: input.metadata || {},
      createdAt: new Date(),
      rawResponse: null,
    };
  }

  async deleteCustomer(_customerId: string): Promise<boolean> {
    return true;
  }

  // ============================================
  // PAYMENT OPERATIONS - STK Push (Lipa na M-Pesa)
  // ============================================

  async createPayment(input: CreatePaymentInput): Promise<GatewayPayment> {
    const phone = input.metadata?.phone;
    if (!phone) {
      throw new Error(
        'Phone number is required for M-Pesa payments. Provide it via metadata.phone'
      );
    }

    const { password, timestamp } = this.generatePassword();
    const phoneNumber = this.formatPhoneNumber(phone);
    const txRef = `mpesa_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store transaction for tracking
    transactionStore.set(txRef, {
      amountCents: input.amountCents,
      phone: phoneNumber,
      customerId: input.customerId,
      status: PaymentStatus.PENDING,
      description: input.description,
      currency: input.currency || 'KES',
      metadata: input.metadata
        ? Object.fromEntries(
            Object.entries(input.metadata).filter(
              (entry): entry is [string, string] => entry[1] !== undefined
            )
          )
        : {},
      createdAt: new Date(),
    });

    const payload = {
      BusinessShortCode: this.config.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(input.amountCents / 100), // M-Pesa uses whole units
      PartyA: phoneNumber,
      PartyB: this.config.shortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: input.callbackUrl || this.config.callbackUrl,
      AccountReference: input.metadata?.accountRef || 'AIVO',
      TransactionDesc: input.description?.substring(0, 20) || 'AIVO Payment',
    };

    const response = await this.request<MpesaStkPushResponse>(
      '/mpesa/stkpush/v1/processrequest',
      payload
    );

    if (response.ResponseCode === '0') {
      // Update transaction store with M-Pesa IDs
      const tx = transactionStore.get(txRef);
      if (tx) {
        tx.checkoutRequestId = response.CheckoutRequestID;
        tx.merchantRequestId = response.MerchantRequestID;
        transactionStore.set(txRef, tx);
      }

      return {
        id: txRef,
        gatewayType: this.type,
        customerId: input.customerId,
        amountCents: input.amountCents,
        currency: input.currency || 'KES',
        status: PaymentStatus.PENDING,
        description: input.description,
        metadata: {
          merchantRequestId: response.MerchantRequestID,
          checkoutRequestId: response.CheckoutRequestID,
          customerMessage: response.CustomerMessage,
          note: 'STK Push sent to customer phone. Awaiting PIN entry.',
        },
        reference: response.CheckoutRequestID,
        createdAt: new Date(),
        rawResponse: response,
      };
    }

    throw new Error(`M-Pesa STK Push failed: ${response.ResponseDescription}`);
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    const paymentId = input.reference;
    const tx = transactionStore.get(paymentId);

    if (!tx?.checkoutRequestId) {
      throw new Error('Transaction not found');
    }

    // If already completed, return cached result
    if (tx.status === PaymentStatus.SUCCEEDED) {
      const payment: GatewayPayment = {
        id: paymentId,
        gatewayType: this.type,
        customerId: tx.customerId,
        amountCents: tx.amountCents,
        currency: tx.currency,
        status: PaymentStatus.SUCCEEDED,
        description: tx.description,
        metadata: tx.metadata,
        reference: tx.mpesaReceiptNumber,
        paidAt: new Date(),
        createdAt: tx.createdAt,
        rawResponse: null,
      };

      return {
        verified: true,
        status: PaymentStatus.SUCCEEDED,
        payment,
      };
    }

    const { password, timestamp } = this.generatePassword();

    const payload = {
      BusinessShortCode: this.config.shortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: tx.checkoutRequestId,
    };

    const response = await this.request<MpesaStkQueryResponse>(
      '/mpesa/stkpushquery/v1/query',
      payload
    );

    const status = this.mapResultCode(response.ResultCode);
    tx.status = status;
    transactionStore.set(paymentId, tx);

    const payment: GatewayPayment = {
      id: paymentId,
      gatewayType: this.type,
      customerId: tx.customerId,
      amountCents: tx.amountCents,
      currency: tx.currency,
      status,
      description: tx.description,
      metadata: {
        ...tx.metadata,
        resultCode: response.ResultCode,
        resultDesc: response.ResultDesc,
      },
      reference: tx.checkoutRequestId,
      paidAt: status === PaymentStatus.SUCCEEDED ? new Date() : undefined,
      createdAt: tx.createdAt,
      rawResponse: response,
    };

    return {
      verified: status === PaymentStatus.SUCCEEDED,
      status,
      payment,
    };
  }

  async getPayment(paymentId: string): Promise<GatewayPayment | null> {
    const tx = transactionStore.get(paymentId);
    if (!tx) {
      return null;
    }

    return {
      id: paymentId,
      gatewayType: this.type,
      customerId: tx.customerId,
      amountCents: tx.amountCents,
      currency: tx.currency,
      status: tx.status,
      description: tx.description,
      metadata: tx.metadata,
      reference: tx.mpesaReceiptNumber || tx.checkoutRequestId,
      paidAt: tx.status === PaymentStatus.SUCCEEDED ? new Date() : undefined,
      createdAt: tx.createdAt,
      rawResponse: null,
    };
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  async createSubscription(_input: CreateSubscriptionInput): Promise<GatewaySubscription> {
    // M-Pesa doesn't have native subscriptions
    // Implementation would require recurring payment scheduler
    throw new Error('M-Pesa subscriptions require external scheduling. Contact support for setup.');
  }

  async getSubscription(_subscriptionId: string): Promise<GatewaySubscription | null> {
    throw new Error('M-Pesa subscription lookup not implemented');
  }

  async updateSubscription(
    _subscriptionId: string,
    _input: UpdateSubscriptionInput
  ): Promise<GatewaySubscription> {
    throw new Error('M-Pesa subscription updates not implemented');
  }

  async cancelSubscription(
    _subscriptionId: string,
    _options?: { immediate?: boolean }
  ): Promise<GatewaySubscription> {
    throw new Error('M-Pesa subscription cancellation not implemented');
  }

  async resumeSubscription(_subscriptionId: string): Promise<GatewaySubscription> {
    throw new Error('M-Pesa subscription resume not implemented');
  }

  // ============================================
  // REFUND OPERATIONS (Reversal)
  // ============================================

  async createRefund(input: CreateRefundInput): Promise<GatewayRefund> {
    if (!this.config.initiatorName || !this.config.securityCredential) {
      throw new Error('Reversal credentials not configured');
    }

    const tx = transactionStore.get(input.paymentId);
    if (!tx?.mpesaReceiptNumber) {
      throw new Error('Original transaction not found or not completed');
    }

    const refundAmountCents = input.amountCents ?? tx.amountCents;

    const payload = {
      Initiator: this.config.initiatorName,
      SecurityCredential: this.config.securityCredential,
      CommandID: 'TransactionReversal',
      TransactionID: tx.mpesaReceiptNumber,
      Amount: Math.round(refundAmountCents / 100),
      ReceiverParty: this.config.shortCode,
      ReceiverIdentifierType: '11', // Shortcode
      ResultURL: `${this.config.callbackUrl}/reversal/result`,
      QueueTimeOutURL: `${this.config.callbackUrl}/reversal/timeout`,
      Remarks: input.reason || 'Refund request',
      Occasion: 'Reversal',
    };

    const response = await this.request<{
      OriginatorConversationID: string;
      ConversationID: string;
      ResponseCode: string;
      ResponseDescription: string;
    }>('/mpesa/reversal/v1/request', payload);

    if (response.ResponseCode === '0') {
      return {
        id: response.ConversationID,
        gatewayType: this.type,
        paymentId: input.paymentId,
        amountCents: refundAmountCents,
        currency: tx.currency,
        status: RefundStatus.PENDING,
        reason: input.reason,
        createdAt: new Date(),
        rawResponse: response,
      };
    }

    throw new Error(`M-Pesa reversal failed: ${response.ResponseDescription}`);
  }

  async getRefund(_refundId: string): Promise<GatewayRefund | null> {
    // Would need to implement transaction status query for reversals
    return null;
  }

  // ============================================
  // CHECKOUT SESSION
  // ============================================

  async createCheckoutSession(input: CreateCheckoutInput): Promise<GatewayCheckoutSession> {
    // M-Pesa doesn't have hosted checkout - generate STK push
    const totalAmountCents = input.items.reduce(
      (sum, item) => sum + item.amountCents * item.quantity,
      0
    );

    const phone = input.metadata?.phone;
    if (!phone) {
      throw new Error(
        'Phone number is required for M-Pesa checkout. Provide it via metadata.phone'
      );
    }

    const paymentResult = await this.createPayment({
      amountCents: totalAmountCents,
      currency: input.currency || 'KES',
      customerId: input.customerId || '',
      description: input.items.map((i) => i.name).join(', '),
      metadata: input.metadata,
      callbackUrl: input.callbackUrl,
    });

    return {
      id: paymentResult.id,
      gatewayType: this.type,
      url: '', // M-Pesa uses STK Push, no redirect URL
      reference: paymentResult.reference,
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
    // M-Pesa callbacks are IP-whitelisted, not signed
    // In production, verify source IP via headers
    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf-8');

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(payloadStr);
    } catch {
      return { verified: false, error: 'Invalid JSON payload' };
    }

    // Handle STK Push callback
    if ((data.Body as Record<string, unknown>)?.stkCallback) {
      const body = data.Body as Record<string, unknown>;
      const callback = body.stkCallback as Record<string, unknown>;
      const checkoutRequestId = callback.CheckoutRequestID as string;
      const resultCode = callback.ResultCode as number;

      // Find and update transaction
      for (const [txRef, tx] of transactionStore.entries()) {
        if (tx.checkoutRequestId === checkoutRequestId) {
          const status = this.mapResultCode(String(resultCode));
          tx.status = status;

          // Extract M-Pesa receipt if successful
          const callbackMetadata = callback.CallbackMetadata as
            | { Item?: { Name: string; Value: unknown }[] }
            | undefined;
          if (resultCode === 0 && callbackMetadata?.Item) {
            const receiptItem = callbackMetadata.Item.find((i) => i.Name === 'MpesaReceiptNumber');
            if (receiptItem) {
              tx.mpesaReceiptNumber = receiptItem.Value as string;
            }
          }

          transactionStore.set(txRef, tx);

          return {
            verified: true,
            event: {
              id: txRef,
              gatewayType: this.type,
              eventType:
                status === PaymentStatus.SUCCEEDED
                  ? WebhookEventType.PAYMENT_SUCCESS
                  : WebhookEventType.PAYMENT_FAILED,
              data: {
                resultCode,
                resultDesc: callback.ResultDesc,
                mpesaReceiptNumber: tx.mpesaReceiptNumber,
              },
              timestamp: new Date(),
              rawEvent: data,
            },
          };
        }
      }
    }

    // Handle C2B confirmation
    if ((data as Record<string, unknown>).TransactionType) {
      return {
        verified: true,
        event: {
          id: (data.TransID as string) || '',
          gatewayType: this.type,
          eventType: WebhookEventType.PAYMENT_SUCCESS,
          data: {
            transactionType: data.TransactionType,
            amount: data.TransAmount,
            phoneNumber: data.MSISDN,
            billRefNumber: data.BillRefNumber,
          },
          timestamp: new Date(),
          rawEvent: data,
        },
      };
    }

    return {
      verified: true,
      event: {
        id: '',
        gatewayType: this.type,
        eventType: WebhookEventType.UNKNOWN,
        data,
        timestamp: new Date(),
        rawEvent: data,
      },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private mapResultCode(resultCode: string): PaymentStatus {
    // M-Pesa result codes
    // 0 = Success
    // 1 = Insufficient balance
    // 1032 = Request cancelled by user
    // 1037 = Timeout waiting for user input
    const codeMap: Record<string, PaymentStatus> = {
      '0': PaymentStatus.SUCCEEDED,
      '1': PaymentStatus.FAILED,
      '1032': PaymentStatus.CANCELED,
      '1037': PaymentStatus.FAILED,
    };
    return codeMap[resultCode] || PaymentStatus.PENDING;
  }
}

/**
 * Create and configure an M-Pesa gateway instance
 */
export function createMpesaGateway(config: MpesaConfig): MpesaGateway {
  return new MpesaGateway(config);
}
