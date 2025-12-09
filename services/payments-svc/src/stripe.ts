/**
 * Stripe Client Wrapper
 *
 * Abstracts Stripe SDK operations for easier testing and provider abstraction.
 * All Stripe-specific logic is contained here.
 */

import Stripe from 'stripe';

import { config } from './config.js';
import { BillingPeriod } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// STRIPE CLIENT INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: config.stripe.apiVersion,
  typescript: true,
});

export { stripe };

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMER OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateCustomerParams {
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
}

export async function createCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
  const createParams: Stripe.CustomerCreateParams = {};
  if (params.email) createParams.email = params.email;
  if (params.name) createParams.name = params.name;
  if (params.metadata) createParams.metadata = params.metadata;
  return stripe.customers.create(createParams);
}

export async function getCustomer(customerId: string): Promise<Stripe.Customer | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }
    return customer as Stripe.Customer;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
      return null;
    }
    throw error;
  }
}

export async function updateCustomer(
  customerId: string,
  params: Stripe.CustomerUpdateParams
): Promise<Stripe.Customer> {
  return stripe.customers.update(customerId, params);
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT METHOD OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function attachPaymentMethod(
  paymentMethodId: string,
  customerId: string
): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

export async function detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.detach(paymentMethodId);
}

export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  return stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

export async function getPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.retrieve(paymentMethodId);
}

export async function listPaymentMethods(
  customerId: string,
  type: Stripe.PaymentMethodListParams.Type = 'card'
): Promise<Stripe.PaymentMethod[]> {
  const result = await stripe.paymentMethods.list({
    customer: customerId,
    type,
  });
  return result.data;
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  quantity?: number;
  trialDays?: number;
  metadata?: Record<string, string>;
  paymentBehavior?: Stripe.SubscriptionCreateParams.PaymentBehavior;
}

export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<Stripe.Subscription> {
  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: params.customerId,
    items: [
      {
        price: params.priceId,
        quantity: params.quantity ?? 1,
      },
    ],
    payment_behavior: params.paymentBehavior ?? 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  };

  // Add metadata if specified
  if (params.metadata) {
    subscriptionParams.metadata = params.metadata;
  }

  // Add trial if specified
  if (params.trialDays && params.trialDays > 0) {
    subscriptionParams.trial_period_days = params.trialDays;
  }

  return stripe.subscriptions.create(subscriptionParams);
}

export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
      return null;
    }
    throw error;
  }
}

export async function updateSubscription(
  subscriptionId: string,
  params: Stripe.SubscriptionUpdateParams
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, params);
}

export async function cancelSubscription(
  subscriptionId: string,
  cancelImmediately = false
): Promise<Stripe.Subscription> {
  if (cancelImmediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }

  // Cancel at period end
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PRICE/PRODUCT OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreatePriceParams {
  productId: string;
  unitAmountCents: number;
  currency?: string;
  billingPeriod: BillingPeriod;
  metadata?: Record<string, string>;
}

export async function createPrice(params: CreatePriceParams): Promise<Stripe.Price> {
  const interval = params.billingPeriod === BillingPeriod.YEARLY ? 'year' : 'month';

  const createParams: Stripe.PriceCreateParams = {
    product: params.productId,
    unit_amount: params.unitAmountCents,
    currency: params.currency ?? 'usd',
    recurring: {
      interval,
    },
  };

  if (params.metadata) {
    createParams.metadata = params.metadata;
  }

  return stripe.prices.create(createParams);
}

export async function getPrice(priceId: string): Promise<Stripe.Price | null> {
  try {
    return await stripe.prices.retrieve(priceId);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
      return null;
    }
    throw error;
  }
}

export interface CreateProductParams {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
}

export async function createProduct(params: CreateProductParams): Promise<Stripe.Product> {
  const createParams: Stripe.ProductCreateParams = {
    name: params.name,
  };

  if (params.description) {
    createParams.description = params.description;
  }

  if (params.metadata) {
    createParams.metadata = params.metadata;
  }

  return stripe.products.create(createParams);
}

// ══════════════════════════════════════════════════════════════════════════════
// INVOICE OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function getInvoice(invoiceId: string): Promise<Stripe.Invoice | null> {
  try {
    return await stripe.invoices.retrieve(invoiceId);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
      return null;
    }
    throw error;
  }
}

export async function listInvoices(customerId: string): Promise<Stripe.Invoice[]> {
  const result = await stripe.invoices.list({
    customer: customerId,
    limit: 100,
  });
  return result.data;
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Extract card details from a Stripe PaymentMethod
 */
export function extractCardDetails(pm: Stripe.PaymentMethod): {
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
} {
  if (pm.type !== 'card' || !pm.card) {
    return { brand: null, last4: null, expiryMonth: null, expiryYear: null };
  }

  return {
    brand: pm.card.brand,
    last4: pm.card.last4,
    expiryMonth: pm.card.exp_month,
    expiryYear: pm.card.exp_year,
  };
}

/**
 * Map Stripe subscription status to our internal status
 */
export function mapStripeSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): 'IN_TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' {
  switch (stripeStatus) {
    case 'trialing':
      return 'IN_TRIAL';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELED';
    case 'incomplete':
    case 'incomplete_expired':
    case 'unpaid':
    case 'paused':
      return 'EXPIRED';
    default:
      return 'EXPIRED';
  }
}

/**
 * Map Stripe invoice status to our internal status
 */
export function mapStripeInvoiceStatus(
  stripeStatus: Stripe.Invoice.Status | null
): 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE' {
  switch (stripeStatus) {
    case 'draft':
      return 'DRAFT';
    case 'open':
      return 'OPEN';
    case 'paid':
      return 'PAID';
    case 'void':
      return 'VOID';
    case 'uncollectible':
      return 'UNCOLLECTIBLE';
    default:
      return 'DRAFT';
  }
}
