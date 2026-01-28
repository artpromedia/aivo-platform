/**
 * M-Pesa Payment Gateway Implementation
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

interface MpesaC2BResponse {
  ResponseCode: string;
  ResponseDescription: string;
}

interface MpesaTransactionStatusResponse {
  ResponseCode: string;
  ResponseDescription: string;
  OriginatorConversationID: string;
  ConversationID: string;
}

interface MpesaB2CResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

// Store for tracking transactions (should use Redis/DB in production)
const transactionStore = new Map<string, {
  amount: number;
  phone: string;
  status: PaymentStatus;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  mpesaReceiptNumber?: string;
}>();

export class MpesaGateway implements PaymentGateway {
  readonly type: PaymentGatewayType = 'MPESA';
  private readonly baseUrl: string;
  private readonly config: MpesaConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: MpesaConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
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
          'Authorization': `Basic ${credentials}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`M-Pesa authentication failed: ${response.status}`);
    }

    const data = await response.json() as MpesaAccessToken;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (parseInt(data.expires_in) * 1000) - 60000; // 1 min buffer

    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    body: Record<string, unknown>
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
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
    const timestamp = new Date().toISOString()
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

  async createCustomer(input: CreateCustomerInput): Promise<CustomerResult> {
    // M-Pesa doesn't have customer accounts - phone number is the identifier
    const customerId = `mpesa_${this.formatPhoneNumber(input.phone || '')}`;

    return {
      success: true,
      customerId,
      gatewayType: this.type,
      metadata: {
        phone: input.phone,
        email: input.email,
        name: input.name,
      },
    };
  }

  async getCustomer(customerId: string): Promise<CustomerResult> {
    return {
      success: true,
      customerId,
      gatewayType: this.type,
      metadata: {
        note: 'M-Pesa uses phone numbers as customer identifiers',
      },
    };
  }

  async updateCustomer(customerId: string, input: Partial<CreateCustomerInput>): Promise<CustomerResult> {
    return {
      success: true,
      customerId,
      gatewayType: this.type,
      metadata: input,
    };
  }

  async deleteCustomer(customerId: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  // ============================================
  // PAYMENT OPERATIONS - STK Push (Lipa na M-Pesa)
  // ============================================

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    if (!input.phone) {
      return {
        success: false,
        paymentId: '',
        status: 'failed' as PaymentStatus,
        gatewayType: this.type,
        error: 'Phone number is required for M-Pesa payments',
      };
    }

    const { password, timestamp } = this.generatePassword();
    const phoneNumber = this.formatPhoneNumber(input.phone);
    const txRef = `mpesa_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store transaction for tracking
    transactionStore.set(txRef, {
      amount: input.amount,
      phone: phoneNumber,
      status: 'pending',
    });

    const payload = {
      BusinessShortCode: this.config.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(input.amount / 100), // M-Pesa uses whole units
      PartyA: phoneNumber,
      PartyB: this.config.shortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: this.config.callbackUrl,
      AccountReference: input.metadata?.accountRef || 'AIVO',
      TransactionDesc: input.description?.substring(0, 20) || 'AIVO Payment',
    };

    try {
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
          success: true,
          paymentId: txRef,
          status: 'pending' as PaymentStatus,
          gatewayType: this.type,
          gatewayPaymentId: response.CheckoutRequestID,
          amount: input.amount,
          currency: 'KES',
          metadata: {
            merchantRequestId: response.MerchantRequestID,
            checkoutRequestId: response.CheckoutRequestID,
            customerMessage: response.CustomerMessage,
            note: 'STK Push sent to customer phone. Awaiting PIN entry.',
          },
        };
      }

      return {
        success: false,
        paymentId: txRef,
        status: 'failed' as PaymentStatus,
        gatewayType: this.type,
        error: response.ResponseDescription,
      };
    } catch (error) {
      return {
        success: false,
        paymentId: txRef,
        status: 'failed' as PaymentStatus,
        gatewayType: this.type,
        error: error instanceof Error ? error.message : 'M-Pesa STK Push failed',
      };
    }
  }

  async verifyPayment(paymentId: string): Promise<PaymentResult> {
    const tx = transactionStore.get(paymentId);
    
    if (!tx || !tx.checkoutRequestId) {
      return {
        success: false,
        paymentId,
        status: 'failed' as PaymentStatus,
        gatewayType: this.type,
        error: 'Transaction not found',
      };
    }

    // If already completed, return cached result
    if (tx.status === 'succeeded') {
      return {
        success: true,
        paymentId,
        status: 'succeeded' as PaymentStatus,
        gatewayType: this.type,
        gatewayPaymentId: tx.mpesaReceiptNumber,
        amount: tx.amount,
        currency: 'KES',
      };
    }

    const { password, timestamp } = this.generatePassword();

    const payload = {
      BusinessShortCode: this.config.shortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: tx.checkoutRequestId,
    };

    try {
      const response = await this.request<MpesaStkQueryResponse>(
        '/mpesa/stkpushquery/v1/query',
        payload
      );

      const status = this.mapResultCode(response.ResultCode);
      tx.status = status;
      transactionStore.set(paymentId, tx);

      return {
        success: status === 'succeeded',
        paymentId,
        status,
        gatewayType: this.type,
        gatewayPaymentId: tx.checkoutRequestId,
        amount: tx.amount,
        currency: 'KES',
        metadata: {
          resultCode: response.ResultCode,
          resultDesc: response.ResultDesc,
        },
      };
    } catch (error) {
      return {
        success: false,
        paymentId,
        status: 'pending' as PaymentStatus,
        gatewayType: this.type,
        error: 'Query failed - transaction may still be processing',
      };
    }
  }

  async capturePayment(paymentId: string, amount?: number): Promise<PaymentResult> {
    // M-Pesa payments are captured immediately
    return this.verifyPayment(paymentId);
  }

  async cancelPayment(paymentId: string): Promise<PaymentResult> {
    // M-Pesa doesn't support cancellation
    return {
      success: false,
      paymentId,
      status: 'failed' as PaymentStatus,
      gatewayType: this.type,
      error: 'M-Pesa payments cannot be canceled. Use reversal for completed transactions.',
    };
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult> {
    // M-Pesa doesn't have native subscriptions
    // Implementation would require recurring payment scheduler
    return {
      success: false,
      subscriptionId: '',
      status: 'pending' as SubscriptionGatewayStatus,
      gatewayType: this.type,
      error: 'M-Pesa subscriptions require external scheduling. Contact support for setup.',
    };
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    return {
      success: false,
      subscriptionId,
      status: 'pending' as SubscriptionGatewayStatus,
      gatewayType: this.type,
      error: 'M-Pesa subscription lookup not implemented',
    };
  }

  async updateSubscription(
    subscriptionId: string,
    input: Partial<CreateSubscriptionInput>
  ): Promise<SubscriptionResult> {
    return {
      success: false,
      subscriptionId,
      status: 'pending' as SubscriptionGatewayStatus,
      gatewayType: this.type,
      error: 'M-Pesa subscription updates not implemented',
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    return {
      success: false,
      subscriptionId,
      status: 'pending' as SubscriptionGatewayStatus,
      gatewayType: this.type,
      error: 'M-Pesa subscription cancellation not implemented',
    };
  }

  // ============================================
  // REFUND OPERATIONS (Reversal)
  // ============================================

  async createRefund(input: CreateRefundInput): Promise<RefundResult> {
    if (!this.config.initiatorName || !this.config.securityCredential) {
      return {
        success: false,
        refundId: '',
        status: 'failed' as RefundStatus,
        gatewayType: this.type,
        error: 'Reversal credentials not configured',
      };
    }

    const tx = transactionStore.get(input.paymentId);
    if (!tx || !tx.mpesaReceiptNumber) {
      return {
        success: false,
        refundId: '',
        status: 'failed' as RefundStatus,
        gatewayType: this.type,
        error: 'Original transaction not found or not completed',
      };
    }

    const payload = {
      Initiator: this.config.initiatorName,
      SecurityCredential: this.config.securityCredential,
      CommandID: 'TransactionReversal',
      TransactionID: tx.mpesaReceiptNumber,
      Amount: input.amount ? Math.round(input.amount / 100) : Math.round(tx.amount / 100),
      ReceiverParty: this.config.shortCode,
      ReceiverIdentifierType: '11', // Shortcode
      ResultURL: `${this.config.callbackUrl}/reversal/result`,
      QueueTimeOutURL: `${this.config.callbackUrl}/reversal/timeout`,
      Remarks: input.reason || 'Refund request',
      Occasion: 'Reversal',
    };

    try {
      const response = await this.request<{
        OriginatorConversationID: string;
        ConversationID: string;
        ResponseCode: string;
        ResponseDescription: string;
      }>('/mpesa/reversal/v1/request', payload);

      if (response.ResponseCode === '0') {
        return {
          success: true,
          refundId: response.ConversationID,
          status: 'pending' as RefundStatus,
          gatewayType: this.type,
          gatewayRefundId: response.OriginatorConversationID,
          amount: input.amount || tx.amount,
          metadata: {
            note: 'Reversal initiated. Check status via callback.',
          },
        };
      }

      return {
        success: false,
        refundId: '',
        status: 'failed' as RefundStatus,
        gatewayType: this.type,
        error: response.ResponseDescription,
      };
    } catch (error) {
      return {
        success: false,
        refundId: '',
        status: 'failed' as RefundStatus,
        gatewayType: this.type,
        error: error instanceof Error ? error.message : 'Reversal failed',
      };
    }
  }

  async getRefund(refundId: string): Promise<RefundResult> {
    // Would need to implement transaction status query for reversals
    return {
      success: false,
      refundId,
      status: 'pending' as RefundStatus,
      gatewayType: this.type,
      error: 'Refund status query not implemented',
    };
  }

  // ============================================
  // CHECKOUT SESSION
  // ============================================

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutResult> {
    // M-Pesa doesn't have hosted checkout - generate STK push
    const totalAmount = input.items.reduce(
      (sum, item) => sum + (item.amount * item.quantity),
      0
    );

    const paymentResult = await this.createPayment({
      amount: totalAmount,
      currency: 'KES',
      customerId: input.customerId,
      email: input.email,
      phone: input.phone,
      customerName: input.customerName,
      description: input.items.map(i => i.name).join(', '),
      metadata: input.metadata,
    });

    return {
      success: paymentResult.success,
      sessionId: paymentResult.paymentId,
      gatewayType: this.type,
      metadata: {
        note: 'M-Pesa STK Push initiated. Check phone for payment prompt.',
        checkoutRequestId: paymentResult.gatewayPaymentId,
      },
    };
  }

  // ============================================
  // WEBHOOK HANDLING
  // ============================================

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    // M-Pesa callbacks are IP-whitelisted, not signed
    // In production, verify source IP
    return true;
  }

  async handleWebhook(payload: string, signature: string): Promise<WebhookResult> {
    const data = JSON.parse(payload);
    
    // Handle STK Push callback
    if (data.Body?.stkCallback) {
      const callback = data.Body.stkCallback;
      const checkoutRequestId = callback.CheckoutRequestID;
      const resultCode = callback.ResultCode;
      
      // Find and update transaction
      for (const [txRef, tx] of transactionStore.entries()) {
        if (tx.checkoutRequestId === checkoutRequestId) {
          const status = this.mapResultCode(String(resultCode));
          tx.status = status;
          
          // Extract M-Pesa receipt if successful
          if (resultCode === 0 && callback.CallbackMetadata?.Item) {
            const receiptItem = callback.CallbackMetadata.Item.find(
              (i: { Name: string; Value: unknown }) => i.Name === 'MpesaReceiptNumber'
            );
            if (receiptItem) {
              tx.mpesaReceiptNumber = String(receiptItem.Value);
            }
          }
          
          transactionStore.set(txRef, tx);

          return {
            success: true,
            eventType: status === 'succeeded' ? 'payment.succeeded' : 'payment.failed',
            gatewayType: this.type,
            resourceId: txRef,
            metadata: {
              resultCode,
              resultDesc: callback.ResultDesc,
              mpesaReceiptNumber: tx.mpesaReceiptNumber,
            },
          };
        }
      }
    }

    // Handle C2B confirmation
    if (data.TransactionType) {
      return {
        success: true,
        eventType: 'payment.succeeded',
        gatewayType: this.type,
        resourceId: data.TransID,
        metadata: {
          transactionType: data.TransactionType,
          amount: data.TransAmount,
          phoneNumber: data.MSISDN,
          billRefNumber: data.BillRefNumber,
        },
      };
    }

    return {
      success: true,
      eventType: 'unknown',
      gatewayType: this.type,
      metadata: data,
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
      '0': 'succeeded',
      '1': 'failed',
      '1032': 'canceled',
      '1037': 'failed',
    };
    return codeMap[resultCode] || 'pending';
  }

  getCapabilities(): GatewayCapabilities {
    return {
      supportedCurrencies: ['KES', 'TZS'],
      supportedCountries: ['KE', 'TZ', 'MZ', 'CD', 'LS', 'GH', 'EG'],
      supportedPaymentMethods: ['mobile_money'],
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsSubscriptions: false, // Requires external scheduler
      supportsCheckout: false, // No hosted checkout
      supportsWebhooks: true,
      webhookEvents: [
        'payment.succeeded',
        'payment.failed',
        'refund.succeeded',
        'refund.failed',
      ],
    };
  }
}

/**
 * Create and configure an M-Pesa gateway instance
 */
export function createMpesaGateway(config: MpesaConfig): MpesaGateway {
  return new MpesaGateway(config);
}
