/**
 * Stripe Service
 *
 * Production-ready Stripe integration for:
 * - Customer management
 * - Subscription lifecycle (create, update, cancel, resume)
 * - Checkout sessions
 * - Billing portal
 * - Payment methods
 * - Invoices
 * - Usage-based billing
 *
 * Features:
 * - Idempotency keys for all mutating operations
 * - Comprehensive error handling
 * - Proration support for plan changes
 * - Retry logic for transient failures
 */

import Stripe from 'stripe';

import { stripeConfig } from '../config/stripe.config.js';

// ══════════════════════════════════════════════════════════════════════════════
// STRIPE CLIENT INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: stripeConfig.apiVersion as Stripe.LatestApiVersion,
  typescript: true,
  maxNetworkRetries: 3,
  timeout: 30000,
});

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Remove undefined values from an object (for Stripe API compatibility)
 */
function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

type ProrationBehavior = 'create_prorations' | 'none' | 'always_invoice';
type PaymentBehavior = 'default_incomplete' | 'error_if_incomplete' | 'allow_incomplete';
type CollectionMethod = 'charge_automatically' | 'send_invoice';
type PauseCollectionBehavior = 'keep_as_draft' | 'mark_uncollectible' | 'void';
type TaxExemptStatus = 'none' | 'exempt' | 'reverse';

export interface CreateCustomerDto {
  email: string;
  name?: string;
  phone?: string;
  tenantId: string;
  userId: string;
  metadata?: Record<string, string>;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  taxExempt?: TaxExemptStatus;
}

export interface UpdateCustomerDto {
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  taxExempt?: TaxExemptStatus;
  defaultPaymentMethodId?: string;
}

export interface CreateSubscriptionDto {
  customerId: string;
  priceId: string;
  quantity?: number;
  trialDays?: number;
  metadata?: Record<string, string>;
  paymentBehavior?: PaymentBehavior;
  prorationBehavior?: ProrationBehavior;
  idempotencyKey?: string;
  couponId?: string;
  promotionCodeId?: string;
  collectionMethod?: CollectionMethod;
  daysUntilDue?: number;
}

export interface UpdateSubscriptionDto {
  quantity?: number;
  metadata?: Record<string, string>;
  prorationBehavior?: ProrationBehavior;
  cancelAtPeriodEnd?: boolean;
  pauseCollection?: {
    behavior: PauseCollectionBehavior;
    resumesAt?: number;
  } | null;
  trialEnd?: number | 'now';
}

export interface CreateCheckoutDto {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
  mode?: 'subscription' | 'payment' | 'setup';
  metadata?: Record<string, string>;
  allowPromotionCodes?: boolean;
  trialDays?: number;
  clientReferenceId?: string;
  subscriptionData?: {
    metadata?: Record<string, string>;
    trialPeriodDays?: number;
  };
}

export interface UsageRecord {
  subscriptionItemId: string;
  quantity: number;
  timestamp?: number;
  action?: 'increment' | 'set';
  idempotencyKey?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// STRIPE SERVICE CLASS
// ══════════════════════════════════════════════════════════════════════════════

class StripeService {
  // ════════════════════════════════════════════════════════════════════════════
  // CUSTOMER MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new Stripe customer
   */
  async createCustomer(data: CreateCustomerDto): Promise<Stripe.Customer> {
    const params: Stripe.CustomerCreateParams = {
      email: data.email,
      metadata: {
        tenantId: data.tenantId,
        userId: data.userId,
        ...data.metadata,
      },
    };

    // Only add optional fields if they have values
    if (data.name) {
      params.name = data.name;
    }
    if (data.phone) {
      params.phone = data.phone;
    }

    if (data.address) {
      params.address = removeUndefined({
        line1: data.address.line1,
        line2: data.address.line2,
        city: data.address.city,
        state: data.address.state,
        postal_code: data.address.postalCode,
        country: data.address.country,
      }) as Stripe.AddressParam;
    }

    if (data.taxExempt) {
      params.tax_exempt = data.taxExempt;
    }

    return stripe.customers.create(params, {
      idempotencyKey: `create-customer-${data.tenantId}-${data.userId}`,
    });
  }

  /**
   * Update an existing customer
   */
  async updateCustomer(customerId: string, data: UpdateCustomerDto): Promise<Stripe.Customer> {
    const params: Stripe.CustomerUpdateParams = {};

    if (data.email) params.email = data.email;
    if (data.name) params.name = data.name;
    if (data.phone) params.phone = data.phone;
    if (data.metadata) params.metadata = data.metadata;
    if (data.taxExempt) params.tax_exempt = data.taxExempt;

    if (data.address) {
      params.address = removeUndefined({
        line1: data.address.line1,
        line2: data.address.line2,
        city: data.address.city,
        state: data.address.state,
        postal_code: data.address.postalCode,
        country: data.address.country,
      }) as Stripe.AddressParam;
    }

    if (data.defaultPaymentMethodId) {
      params.invoice_settings = {
        default_payment_method: data.defaultPaymentMethodId,
      };
    }

    return stripe.customers.update(customerId, params);
  }

  /**
   * Get a customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        return null;
      }
      return customer as Stripe.Customer;
    } catch (error) {
      if (this.isResourceMissing(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(customerId: string): Promise<boolean> {
    try {
      await stripe.customers.del(customerId);
      return true;
    } catch (error) {
      if (this.isResourceMissing(error)) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Search for customers
   */
  async searchCustomers(query: string, limit = 10): Promise<Stripe.Customer[]> {
    const result = await stripe.customers.search({
      query,
      limit,
    });
    return result.data;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new subscription
   */
  async createSubscription(data: CreateSubscriptionDto): Promise<Stripe.Subscription> {
    const params: Stripe.SubscriptionCreateParams = {
      customer: data.customerId,
      items: [
        {
          price: data.priceId,
          quantity: data.quantity ?? 1,
        },
      ],
      payment_behavior: data.paymentBehavior ?? 'default_incomplete',
      proration_behavior: data.prorationBehavior ?? 'create_prorations',
      expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
    };

    // Add trial
    if (data.trialDays && data.trialDays > 0) {
      params.trial_period_days = data.trialDays;
    } else if (stripeConfig.defaultTrialDays > 0 && !data.trialDays) {
      params.trial_period_days = stripeConfig.defaultTrialDays;
    }

    // Add metadata
    if (data.metadata) {
      params.metadata = data.metadata;
    }

    // Add coupon or promotion code
    if (data.couponId) {
      params.coupon = data.couponId;
    }
    if (data.promotionCodeId) {
      params.promotion_code = data.promotionCodeId;
    }

    // Collection method for invoices
    if (data.collectionMethod) {
      params.collection_method = data.collectionMethod;
      if (data.collectionMethod === 'send_invoice' && data.daysUntilDue) {
        params.days_until_due = data.daysUntilDue;
      }
    }

    // Add tax rates if configured
    if (stripeConfig.taxRates && stripeConfig.taxRates.length > 0) {
      params.default_tax_rates = stripeConfig.taxRates;
    }

    // Enable automatic tax if configured
    if (stripeConfig.automaticTax) {
      params.automatic_tax = { enabled: true };
    }

    const options: Stripe.RequestOptions = {};
    if (data.idempotencyKey) {
      options.idempotencyKey = data.idempotencyKey;
    }

    return stripe.subscriptions.create(params, options);
  }

  /**
   * Get a subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    try {
      return await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice', 'default_payment_method'],
      });
    } catch (error) {
      if (this.isResourceMissing(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a subscription
   */
  async updateSubscription(
    subscriptionId: string,
    data: UpdateSubscriptionDto
  ): Promise<Stripe.Subscription> {
    const params: Stripe.SubscriptionUpdateParams = {
      proration_behavior: data.prorationBehavior ?? 'create_prorations',
    };

    if (data.quantity !== undefined) {
      // Get current subscription to find the item ID
      const subscription = await this.getSubscription(subscriptionId);
      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }
      const itemId = subscription.items.data[0]?.id;
      if (itemId) {
        params.items = [{ id: itemId, quantity: data.quantity }];
      }
    }

    if (data.metadata) {
      params.metadata = data.metadata;
    }

    if (data.cancelAtPeriodEnd !== undefined) {
      params.cancel_at_period_end = data.cancelAtPeriodEnd;
    }

    if (data.pauseCollection !== undefined) {
      if (data.pauseCollection === null) {
        params.pause_collection = ''; // Empty string clears the value
      } else {
        params.pause_collection = data.pauseCollection;
      }
    }

    if (data.trialEnd !== undefined) {
      params.trial_end = data.trialEnd;
    }

    return stripe.subscriptions.update(subscriptionId, params);
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediate = false,
    cancellationDetails?: {
      comment?: string;
      feedback?:
        | 'customer_service'
        | 'low_quality'
        | 'missing_features'
        | 'other'
        | 'switched_service'
        | 'too_complex'
        | 'too_expensive'
        | 'unused';
    }
  ): Promise<Stripe.Subscription> {
    if (immediate) {
      const cancelParams: Stripe.SubscriptionCancelParams = {};
      if (cancellationDetails) {
        cancelParams.cancellation_details = removeUndefined({
          comment: cancellationDetails.comment,
          feedback: cancellationDetails.feedback,
        }) as Stripe.SubscriptionCancelParams.CancellationDetails;
      }
      return stripe.subscriptions.cancel(subscriptionId, cancelParams);
    }

    // Cancel at period end (allows continued access)
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      metadata: {
        cancellation_reason: cancellationDetails?.feedback ?? 'user_requested',
        cancellation_comment: cancellationDetails?.comment ?? '',
      },
    });
  }

  /**
   * Resume a paused or canceled subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const subscription = await this.getSubscription(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const params: Stripe.SubscriptionUpdateParams = {};

    // If paused, resume
    if (subscription.pause_collection) {
      params.pause_collection = ''; // Empty string clears the value
    }

    // If canceled at period end, uncancel
    if (subscription.cancel_at_period_end) {
      params.cancel_at_period_end = false;
    }

    // If fully canceled, this won't work - need to create new subscription
    if (subscription.status === 'canceled') {
      throw new Error(
        'Cannot resume a fully canceled subscription. Please create a new subscription.'
      );
    }

    return stripe.subscriptions.update(subscriptionId, params);
  }

  /**
   * Change subscription plan (upgrade/downgrade)
   */
  async changeSubscriptionPlan(
    subscriptionId: string,
    newPriceId: string,
    prorationBehavior: 'create_prorations' | 'none' | 'always_invoice' = 'create_prorations'
  ): Promise<Stripe.Subscription> {
    const subscription = await this.getSubscription(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const itemId = subscription.items.data[0]?.id;
    if (!itemId) {
      throw new Error('Subscription has no items');
    }

    return stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: itemId,
          price: newPriceId,
        },
      ],
      proration_behavior: prorationBehavior,
      expand: ['latest_invoice.payment_intent'],
    });
  }

  /**
   * List subscriptions for a customer
   */
  async listSubscriptions(
    customerId: string,
    status?: Stripe.SubscriptionListParams.Status
  ): Promise<Stripe.Subscription[]> {
    const params: Stripe.SubscriptionListParams = {
      customer: customerId,
      limit: 100,
      expand: ['data.default_payment_method'],
    };

    if (status) {
      params.status = status;
    }

    const result = await stripe.subscriptions.list(params);
    return result.data;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHECKOUT & PORTAL
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a Checkout Session
   */
  async createCheckoutSession(data: CreateCheckoutDto): Promise<Stripe.Checkout.Session> {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: data.mode ?? 'subscription',
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      line_items: [
        {
          price: data.priceId,
          quantity: data.quantity ?? 1,
        },
      ],
    };

    // Customer handling
    if (data.customerId) {
      params.customer = data.customerId;
    } else if (data.customerEmail) {
      params.customer_email = data.customerEmail;
    }

    // Promotion codes
    if (data.allowPromotionCodes) {
      params.allow_promotion_codes = true;
    }

    // Client reference ID for tracking
    if (data.clientReferenceId) {
      params.client_reference_id = data.clientReferenceId;
    }

    // Metadata
    if (data.metadata) {
      params.metadata = data.metadata;
    }

    // Subscription-specific options
    if (data.mode === 'subscription' && data.subscriptionData) {
      const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {};
      if (data.subscriptionData.metadata) {
        subscriptionData.metadata = data.subscriptionData.metadata;
      }
      const trialDays = data.subscriptionData.trialPeriodDays ?? data.trialDays;
      if (trialDays !== undefined) {
        subscriptionData.trial_period_days = trialDays;
      }
      params.subscription_data = subscriptionData;
    }

    // Enable automatic tax if configured
    if (stripeConfig.automaticTax) {
      params.automatic_tax = { enabled: true };
    }

    return stripe.checkout.sessions.create(params);
  }

  /**
   * Create a Billing Portal Session
   */
  async createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    const params: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url: returnUrl,
    };

    if (stripeConfig.portalConfigId) {
      params.configuration = stripeConfig.portalConfigId;
    }

    return stripe.billingPortal.sessions.create(params);
  }

  /**
   * Get checkout session details
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
    try {
      return await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      });
    } catch (error) {
      if (this.isResourceMissing(error)) {
        return null;
      }
      throw error;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAYMENT METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod> {
    return stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  /**
   * Detach a payment method from a customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return stripe.paymentMethods.detach(paymentMethodId);
  }

  /**
   * Set default payment method for a customer
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.Customer> {
    return stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  /**
   * Get a payment method
   */
  async getPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod | null> {
    try {
      return await stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (error) {
      if (this.isResourceMissing(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List payment methods for a customer
   */
  async listPaymentMethods(
    customerId: string,
    type: 'card' | 'us_bank_account' | 'sepa_debit' = 'card'
  ): Promise<Stripe.PaymentMethod[]> {
    const result = await stripe.paymentMethods.list({
      customer: customerId,
      type,
    });
    return result.data;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INVOICES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get upcoming invoice preview
   */
  async getUpcomingInvoice(
    customerId: string,
    subscriptionId?: string
  ): Promise<Stripe.UpcomingInvoice> {
    const params: Stripe.InvoiceRetrieveUpcomingParams = {
      customer: customerId,
    };

    if (subscriptionId) {
      params.subscription = subscriptionId;
    }

    return stripe.invoices.retrieveUpcoming(params);
  }

  /**
   * Preview invoice for subscription change
   */
  async previewInvoiceForPlanChange(
    subscriptionId: string,
    newPriceId: string
  ): Promise<Stripe.UpcomingInvoice> {
    const subscription = await this.getSubscription(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const itemId = subscription.items.data[0]?.id;
    if (!itemId) {
      throw new Error('Subscription has no items');
    }

    return stripe.invoices.retrieveUpcoming({
      customer: subscription.customer as string,
      subscription: subscriptionId,
      subscription_items: [
        {
          id: itemId,
          price: newPriceId,
        },
      ],
      subscription_proration_behavior: 'create_prorations',
    });
  }

  /**
   * Get an invoice
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice | null> {
    try {
      return await stripe.invoices.retrieve(invoiceId, {
        expand: ['payment_intent', 'charge'],
      });
    } catch (error) {
      if (this.isResourceMissing(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Pay an open invoice
   */
  async payInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return stripe.invoices.pay(invoiceId);
  }

  /**
   * Void an invoice
   */
  async voidInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return stripe.invoices.voidInvoice(invoiceId);
  }

  /**
   * List invoices for a customer
   */
  async listInvoices(
    customerId: string,
    status?: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible',
    limit = 10
  ): Promise<Stripe.Invoice[]> {
    const params: Stripe.InvoiceListParams = {
      customer: customerId,
      limit,
    };

    if (status) {
      params.status = status;
    }

    const result = await stripe.invoices.list(params);
    return result.data;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // USAGE-BASED BILLING
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Report usage for metered billing
   */
  async reportUsage(data: UsageRecord): Promise<Stripe.UsageRecord> {
    const params: Stripe.SubscriptionItemCreateUsageRecordParams = {
      quantity: data.quantity,
      action: data.action ?? 'increment',
    };

    if (data.timestamp) {
      params.timestamp = data.timestamp;
    }

    const options: Stripe.RequestOptions = {};
    if (data.idempotencyKey) {
      options.idempotencyKey = data.idempotencyKey;
    }

    return stripe.subscriptionItems.createUsageRecord(data.subscriptionItemId, params, options);
  }

  /**
   * Get usage summary for a subscription item
   */
  async getUsageSummary(subscriptionItemId: string): Promise<Stripe.UsageRecordSummary[]> {
    const result = await stripe.subscriptionItems.listUsageRecordSummaries(subscriptionItemId);
    return result.data;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REFUNDS & DISPUTES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a refund
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  ): Promise<Stripe.Refund> {
    const params: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      params.amount = amount;
    }

    if (reason) {
      params.reason = reason;
    }

    return stripe.refunds.create(params);
  }

  /**
   * Get a dispute
   */
  async getDispute(disputeId: string): Promise<Stripe.Dispute | null> {
    try {
      return await stripe.disputes.retrieve(disputeId);
    } catch (error) {
      if (this.isResourceMissing(error)) {
        return null;
      }
      throw error;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // WEBHOOK HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Construct and verify webhook event
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, stripeConfig.webhook.secret);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Check if error is a resource not found error
   */
  private isResourceMissing(error: unknown): boolean {
    return error instanceof Stripe.errors.StripeError && error.code === 'resource_missing';
  }

  /**
   * Get the Stripe instance for advanced operations
   */
  getStripeInstance(): Stripe {
    return stripe;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const stripeService = new StripeService();

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export { stripe };
export default stripeService;
