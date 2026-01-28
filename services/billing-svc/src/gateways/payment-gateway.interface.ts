/**
 * Payment Gateway Interface
 *
 * Provides a unified abstraction for multiple payment providers:
 * - Stripe (Global)
 * - Paystack (Nigeria, Ghana, Kenya, South Africa)
 * - Razorpay (India)
 * - Mercado Pago (Latin America)
 * - Flutterwave (Africa)
 * - PayU (India, Latin America, Europe)
 * - M-Pesa (East Africa mobile money)
 *
 * All implementations must support:
 * - Customer management
 * - Payment processing
 * - Subscription management
 * - Webhook handling
 * - Refunds
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

export enum PaymentGatewayType {
  STRIPE = 'STRIPE',
  PAYSTACK = 'PAYSTACK',
  RAZORPAY = 'RAZORPAY',
  MERCADO_PAGO = 'MERCADO_PAGO',
  FLUTTERWAVE = 'FLUTTERWAVE',
  PAYU = 'PAYU',
  MPESA = 'MPESA',
  PAYTM = 'PAYTM',
  MANUAL_INVOICE = 'MANUAL_INVOICE',
  TEST_FAKE = 'TEST_FAKE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  REQUIRES_ACTION = 'REQUIRES_ACTION',
  REQUIRES_PAYMENT_METHOD = 'REQUIRES_PAYMENT_METHOD',
}

export enum SubscriptionGatewayStatus {
  ACTIVE = 'ACTIVE',
  TRIALING = 'TRIALING',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  UNPAID = 'UNPAID',
  PAUSED = 'PAUSED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

// ══════════════════════════════════════════════════════════════════════════════
// COMMON TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface GatewayAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string; // ISO 3166-1 alpha-2
}

export interface GatewayMetadata {
  tenantId: string;
  userId?: string;
  correlationId?: string;
  [key: string]: string | undefined;
}

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMER TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateCustomerInput {
  email: string;
  name?: string;
  phone?: string;
  address?: GatewayAddress;
  metadata: GatewayMetadata;
}

export interface UpdateCustomerInput {
  email?: string;
  name?: string;
  phone?: string;
  address?: GatewayAddress;
  metadata?: Record<string, string>;
}

export interface GatewayCustomer {
  id: string;
  gatewayType: PaymentGatewayType;
  email: string;
  name?: string;
  phone?: string;
  address?: GatewayAddress;
  metadata: Record<string, string>;
  createdAt: Date;
  rawResponse: unknown;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreatePaymentInput {
  customerId: string;
  amountCents: number;
  currency: string; // ISO 4217
  description?: string;
  metadata?: GatewayMetadata;
  returnUrl?: string; // For redirect-based flows
  callbackUrl?: string; // For webhook notifications
  paymentMethodId?: string; // Pre-saved payment method
  idempotencyKey?: string;
}

export interface GatewayPayment {
  id: string;
  gatewayType: PaymentGatewayType;
  customerId: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  description?: string;
  metadata: Record<string, string>;
  authorizationUrl?: string; // For redirect-based flows
  accessCode?: string; // Provider-specific code
  reference?: string; // Provider reference
  paidAt?: Date;
  createdAt: Date;
  rawResponse: unknown;
}

export interface VerifyPaymentInput {
  reference: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  status: PaymentStatus;
  payment: GatewayPayment;
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateSubscriptionInput {
  customerId: string;
  planCode: string; // SKU or plan code
  amountCents: number;
  currency: string;
  interval: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  metadata?: GatewayMetadata;
  trialDays?: number;
  startDate?: Date;
  idempotencyKey?: string;
}

export interface UpdateSubscriptionInput {
  planCode?: string;
  amountCents?: number;
  quantity?: number;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, string>;
}

export interface GatewaySubscription {
  id: string;
  gatewayType: PaymentGatewayType;
  customerId: string;
  planCode: string;
  status: SubscriptionGatewayStatus;
  amountCents: number;
  currency: string;
  interval: string;
  quantity: number;
  trialStart?: Date;
  trialEnd?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  endedAt?: Date;
  metadata: Record<string, string>;
  createdAt: Date;
  rawResponse: unknown;
}

// ══════════════════════════════════════════════════════════════════════════════
// REFUND TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateRefundInput {
  paymentId: string;
  amountCents?: number; // Full refund if not specified
  reason?: string;
  metadata?: GatewayMetadata;
  idempotencyKey?: string;
}

export interface GatewayRefund {
  id: string;
  gatewayType: PaymentGatewayType;
  paymentId: string;
  amountCents: number;
  currency: string;
  status: RefundStatus;
  reason?: string;
  createdAt: Date;
  rawResponse: unknown;
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK TYPES
// ══════════════════════════════════════════════════════════════════════════════

export enum WebhookEventType {
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_ACTIVATED = 'subscription.activated',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELED = 'subscription.canceled',
  SUBSCRIPTION_PAYMENT_SUCCESS = 'subscription.payment.success',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription.payment.failed',
  REFUND_PROCESSED = 'refund.processed',
  CHARGE_DISPUTE = 'charge.dispute',
  CUSTOMER_UPDATED = 'customer.updated',
  UNKNOWN = 'unknown',
}

export interface WebhookEvent {
  id: string;
  gatewayType: PaymentGatewayType;
  eventType: WebhookEventType;
  data: unknown;
  timestamp: Date;
  rawEvent: unknown;
}

export interface WebhookVerificationResult {
  verified: boolean;
  event?: WebhookEvent;
  error?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CHECKOUT TYPES (for hosted payment pages)
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateCheckoutInput {
  customerId?: string;
  customerEmail?: string;
  items: Array<{
    name: string;
    description?: string;
    amountCents: number;
    quantity: number;
  }>;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  callbackUrl?: string;
  metadata?: GatewayMetadata;
  allowPromotionCodes?: boolean;
  mode: 'payment' | 'subscription';
  subscriptionData?: {
    planCode: string;
    interval: 'monthly' | 'yearly';
    trialDays?: number;
  };
}

export interface GatewayCheckoutSession {
  id: string;
  gatewayType: PaymentGatewayType;
  url: string; // Redirect URL for hosted checkout
  accessCode?: string;
  reference?: string;
  expiresAt?: Date;
  rawResponse: unknown;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT GATEWAY INTERFACE
// ══════════════════════════════════════════════════════════════════════════════

export interface PaymentGateway {
  /**
   * Gateway identifier
   */
  readonly type: PaymentGatewayType;

  /**
   * Supported currencies (ISO 4217 codes)
   */
  readonly supportedCurrencies: string[];

  /**
   * Supported countries (ISO 3166-1 alpha-2 codes)
   */
  readonly supportedCountries: string[];

  /**
   * Check if gateway is properly configured and available
   */
  isAvailable(): boolean;

  // ════════════════════════════════════════════════════════════════════════════
  // CUSTOMER MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new customer
   */
  createCustomer(input: CreateCustomerInput): Promise<GatewayCustomer>;

  /**
   * Get customer by gateway-specific ID
   */
  getCustomer(customerId: string): Promise<GatewayCustomer | null>;

  /**
   * Update customer details
   */
  updateCustomer(customerId: string, input: UpdateCustomerInput): Promise<GatewayCustomer>;

  /**
   * Delete a customer
   */
  deleteCustomer(customerId: string): Promise<boolean>;

  // ════════════════════════════════════════════════════════════════════════════
  // PAYMENT PROCESSING
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Initialize a one-time payment
   */
  createPayment(input: CreatePaymentInput): Promise<GatewayPayment>;

  /**
   * Verify a payment (for redirect-based flows)
   */
  verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult>;

  /**
   * Get payment details
   */
  getPayment(paymentId: string): Promise<GatewayPayment | null>;

  // ════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a subscription
   */
  createSubscription(input: CreateSubscriptionInput): Promise<GatewaySubscription>;

  /**
   * Get subscription details
   */
  getSubscription(subscriptionId: string): Promise<GatewaySubscription | null>;

  /**
   * Update a subscription
   */
  updateSubscription(
    subscriptionId: string,
    input: UpdateSubscriptionInput
  ): Promise<GatewaySubscription>;

  /**
   * Cancel a subscription
   */
  cancelSubscription(
    subscriptionId: string,
    options?: { immediate?: boolean }
  ): Promise<GatewaySubscription>;

  /**
   * Resume a paused/canceled subscription
   */
  resumeSubscription(subscriptionId: string): Promise<GatewaySubscription>;

  // ════════════════════════════════════════════════════════════════════════════
  // REFUNDS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a refund
   */
  createRefund(input: CreateRefundInput): Promise<GatewayRefund>;

  /**
   * Get refund details
   */
  getRefund(refundId: string): Promise<GatewayRefund | null>;

  // ════════════════════════════════════════════════════════════════════════════
  // CHECKOUT (Hosted Payment Pages)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a hosted checkout session
   */
  createCheckoutSession(input: CreateCheckoutInput): Promise<GatewayCheckoutSession>;

  // ════════════════════════════════════════════════════════════════════════════
  // WEBHOOKS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Verify and parse incoming webhook
   */
  verifyWebhook(
    payload: string | Buffer,
    headers: Record<string, string>
  ): Promise<WebhookVerificationResult>;
}

// ══════════════════════════════════════════════════════════════════════════════
// GATEWAY CAPABILITIES
// ══════════════════════════════════════════════════════════════════════════════

export interface GatewayCapabilities {
  supportsSubscriptions: boolean;
  supportsRefunds: boolean;
  supportsPartialRefunds: boolean;
  supportsRecurringPayments: boolean;
  supportsHostedCheckout: boolean;
  supportsSavedPaymentMethods: boolean;
  supportsTrials: boolean;
  requiresRedirect: boolean; // Gateway requires redirect flow
  supportsMobileWallet: boolean;
  supportsBankTransfer: boolean;
  supportsUssd: boolean; // USSD payments (common in Africa)
  supportsQrCode: boolean; // QR code payments
  supportsBnpl: boolean; // Buy now pay later
}

/**
 * Get capabilities for a gateway type
 */
export function getGatewayCapabilities(type: PaymentGatewayType): GatewayCapabilities {
  const capabilities: Record<PaymentGatewayType, GatewayCapabilities> = {
    [PaymentGatewayType.STRIPE]: {
      supportsSubscriptions: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsRecurringPayments: true,
      supportsHostedCheckout: true,
      supportsSavedPaymentMethods: true,
      supportsTrials: true,
      requiresRedirect: false,
      supportsMobileWallet: true,
      supportsBankTransfer: true,
      supportsUssd: false,
      supportsQrCode: false,
      supportsBnpl: true,
    },
    [PaymentGatewayType.PAYSTACK]: {
      supportsSubscriptions: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsRecurringPayments: true,
      supportsHostedCheckout: true,
      supportsSavedPaymentMethods: true,
      supportsTrials: false,
      requiresRedirect: true,
      supportsMobileWallet: true,
      supportsBankTransfer: true,
      supportsUssd: true,
      supportsQrCode: true,
      supportsBnpl: false,
    },
    [PaymentGatewayType.RAZORPAY]: {
      supportsSubscriptions: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsRecurringPayments: true,
      supportsHostedCheckout: true,
      supportsSavedPaymentMethods: true,
      supportsTrials: true,
      requiresRedirect: true,
      supportsMobileWallet: true,
      supportsBankTransfer: true,
      supportsUssd: false,
      supportsQrCode: true,
      supportsBnpl: true,
    },
    [PaymentGatewayType.MERCADO_PAGO]: {
      supportsSubscriptions: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsRecurringPayments: true,
      supportsHostedCheckout: true,
      supportsSavedPaymentMethods: true,
      supportsTrials: true,
      requiresRedirect: true,
      supportsMobileWallet: true,
      supportsBankTransfer: true,
      supportsUssd: false,
      supportsQrCode: true,
      supportsBnpl: true,
    },
    [PaymentGatewayType.FLUTTERWAVE]: {
      supportsSubscriptions: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsRecurringPayments: true,
      supportsHostedCheckout: true,
      supportsSavedPaymentMethods: true,
      supportsTrials: false,
      requiresRedirect: true,
      supportsMobileWallet: true,
      supportsBankTransfer: true,
      supportsUssd: true,
      supportsQrCode: true,
      supportsBnpl: false,
    },
    [PaymentGatewayType.PAYU]: {
      supportsSubscriptions: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsRecurringPayments: true,
      supportsHostedCheckout: true,
      supportsSavedPaymentMethods: true,
      supportsTrials: true,
      requiresRedirect: true,
      supportsMobileWallet: true,
      supportsBankTransfer: true,
      supportsUssd: false,
      supportsQrCode: false,
      supportsBnpl: true,
    },
    [PaymentGatewayType.MPESA]: {
      supportsSubscriptions: false,
      supportsRefunds: true,
      supportsPartialRefunds: false,
      supportsRecurringPayments: false,
      supportsHostedCheckout: false,
      supportsSavedPaymentMethods: false,
      supportsTrials: false,
      requiresRedirect: false,
      supportsMobileWallet: true,
      supportsBankTransfer: false,
      supportsUssd: true,
      supportsQrCode: false,
      supportsBnpl: false,
    },
    [PaymentGatewayType.PAYTM]: {
      supportsSubscriptions: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsRecurringPayments: true,
      supportsHostedCheckout: true,
      supportsSavedPaymentMethods: true,
      supportsTrials: false,
      requiresRedirect: true,
      supportsMobileWallet: true,
      supportsBankTransfer: true,
      supportsUssd: false,
      supportsQrCode: true,
      supportsBnpl: true,
    },
    [PaymentGatewayType.MANUAL_INVOICE]: {
      supportsSubscriptions: false,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsRecurringPayments: false,
      supportsHostedCheckout: false,
      supportsSavedPaymentMethods: false,
      supportsTrials: false,
      requiresRedirect: false,
      supportsMobileWallet: false,
      supportsBankTransfer: true,
      supportsUssd: false,
      supportsQrCode: false,
      supportsBnpl: false,
    },
    [PaymentGatewayType.TEST_FAKE]: {
      supportsSubscriptions: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsRecurringPayments: true,
      supportsHostedCheckout: true,
      supportsSavedPaymentMethods: true,
      supportsTrials: true,
      requiresRedirect: false,
      supportsMobileWallet: true,
      supportsBankTransfer: true,
      supportsUssd: true,
      supportsQrCode: true,
      supportsBnpl: true,
    },
  };

  return capabilities[type];
}
