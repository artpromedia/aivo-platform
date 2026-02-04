/**
 * Unified Payment Service
 *
 * High-level payment service that abstracts gateway selection and provides
 * a consistent API for processing payments across all supported regions.
 *
 * Features:
 * - Automatic gateway selection based on user's country/currency
 * - Payment method optimization for local markets
 * - Unified error handling
 * - Transaction logging and audit trail
 * - Retry logic for transient failures
 */

import type {
  CreateCheckoutInput,
  CreateCustomerInput,
  CreatePaymentInput,
  CreateRefundInput,
  CreateSubscriptionInput,
  GatewayCheckoutSession,
  GatewayCustomer,
  GatewayPayment,
  GatewayRefund,
  GatewaySubscription,
  PaymentVerificationResult,
  UpdateCustomerInput,
  UpdateSubscriptionInput,
  PaymentGatewayType,
} from '../gateways/index.js';
import { getPaymentGateway, PaymentStatus } from '../gateways/index.js';
import type { PaymentProvider } from '../prisma.js';
import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface PaymentContext {
  tenantId: string;
  userId: string;
  country: string;
  currency: string;
  correlationId?: string;
}

interface PaymentResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  gatewayType: PaymentGatewayType;
  transactionId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// UNIFIED PAYMENT SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class UnifiedPaymentService {
  // ════════════════════════════════════════════════════════════════════════════
  // CUSTOMER MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create or get a customer for the appropriate gateway
   */
  async getOrCreateCustomer(
    context: PaymentContext,
    input: Omit<CreateCustomerInput, 'metadata'>
  ): Promise<PaymentResult<GatewayCustomer>> {
    const gateway = getPaymentGateway({
      country: context.country,
      currency: context.currency,
    });

    try {
      // Check if customer already exists
      const existingAccount = await prisma.billingAccount.findFirst({
        where: {
          tenantId: context.tenantId,
          ownerUserId: context.userId,
          provider: gateway.type as unknown as PaymentProvider,
        },
      });

      if (existingAccount?.providerCustomerId) {
        const customer = await gateway.getCustomer(existingAccount.providerCustomerId);
        if (customer) {
          return {
            success: true,
            data: customer,
            gatewayType: gateway.type,
          };
        }
      }

      // Create new customer
      const customer = await gateway.createCustomer({
        ...input,
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          correlationId: context.correlationId,
        },
      });

      // Update or create billing account
      await prisma.billingAccount.upsert({
        where: {
          id: existingAccount?.id ?? '00000000-0000-0000-0000-000000000000',
        },
        create: {
          tenantId: context.tenantId,
          ownerUserId: context.userId,
          accountType: 'PARENT_CONSUMER',
          displayName: input.name ?? input.email,
          provider: gateway.type as unknown as PaymentProvider,
          providerCustomerId: customer.id,
          defaultCurrency: context.currency,
          billingEmail: input.email,
        },
        update: {
          providerCustomerId: customer.id,
          provider: gateway.type as unknown as PaymentProvider,
        },
      });

      return {
        success: true,
        data: customer,
        gatewayType: gateway.type,
      };
    } catch (error) {
      return this.handleError(error, gateway.type);
    }
  }

  /**
   * Update customer details
   */
  async updateCustomer(
    context: PaymentContext,
    customerId: string,
    input: UpdateCustomerInput
  ): Promise<PaymentResult<GatewayCustomer>> {
    const gateway = getPaymentGateway({
      country: context.country,
      currency: context.currency,
    });

    try {
      const customer = await gateway.updateCustomer(customerId, input);
      return {
        success: true,
        data: customer,
        gatewayType: gateway.type,
      };
    } catch (error) {
      return this.handleError(error, gateway.type);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ONE-TIME PAYMENTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a one-time payment
   */
  async createPayment(
    context: PaymentContext,
    input: Omit<CreatePaymentInput, 'metadata'>
  ): Promise<PaymentResult<GatewayPayment>> {
    const gateway = getPaymentGateway({
      country: context.country,
      currency: context.currency,
    });

    const transactionId = crypto.randomUUID();

    try {
      // Log the transaction attempt
      await this.logTransaction({
        id: transactionId,
        billingAccountId: await this.getBillingAccountId(context.tenantId, context.userId),
        gateway: gateway.type,
        type: 'payment',
        status: 'pending',
        amountCents: input.amountCents,
        currency: input.currency,
        countryCode: context.country,
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          correlationId: context.correlationId,
        },
      });

      const payment = await gateway.createPayment({
        ...input,
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          correlationId: context.correlationId,
          transactionId,
        },
      });

      // Update transaction with gateway response
      await this.updateTransaction(transactionId, {
        gatewayTransactionId: payment.id,
        status: this.mapPaymentStatusToTransaction(payment.status),
        gatewayResponse: payment.rawResponse as object,
      });

      return {
        success: payment.status === PaymentStatus.SUCCEEDED,
        data: payment,
        gatewayType: gateway.type,
        transactionId,
      };
    } catch (error) {
      await this.updateTransactionError(transactionId, error);
      return this.handleError(error, gateway.type, transactionId);
    }
  }

  /**
   * Verify a payment (for redirect flows)
   */
  async verifyPayment(
    context: PaymentContext,
    reference: string
  ): Promise<PaymentResult<PaymentVerificationResult>> {
    const gateway = getPaymentGateway({
      country: context.country,
      currency: context.currency,
    });

    try {
      const result = await gateway.verifyPayment({ reference });
      return {
        success: result.verified,
        data: result,
        gatewayType: gateway.type,
      };
    } catch (error) {
      return this.handleError(error, gateway.type);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a subscription
   */
  async createSubscription(
    context: PaymentContext,
    input: Omit<CreateSubscriptionInput, 'metadata'>
  ): Promise<PaymentResult<GatewaySubscription>> {
    const gateway = getPaymentGateway({
      country: context.country,
      currency: context.currency,
      requireSubscriptions: true,
    });

    const transactionId = crypto.randomUUID();

    try {
      // Log the transaction attempt
      await this.logTransaction({
        id: transactionId,
        billingAccountId: await this.getBillingAccountId(context.tenantId, context.userId),
        gateway: gateway.type,
        type: 'subscription',
        status: 'pending',
        amountCents: input.amountCents,
        currency: input.currency,
        countryCode: context.country,
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          correlationId: context.correlationId,
          planCode: input.planCode,
        },
      });

      const subscription = await gateway.createSubscription({
        ...input,
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          correlationId: context.correlationId,
          transactionId,
        },
      });

      // Update transaction with gateway response
      await this.updateTransaction(transactionId, {
        gatewayTransactionId: subscription.id,
        status: 'active',
        gatewayResponse: subscription.rawResponse as object,
      });

      return {
        success: true,
        data: subscription,
        gatewayType: gateway.type,
        transactionId,
      };
    } catch (error) {
      await this.updateTransactionError(transactionId, error);
      return this.handleError(error, gateway.type, transactionId);
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(
    context: PaymentContext,
    subscriptionId: string
  ): Promise<PaymentResult<GatewaySubscription>> {
    const gateway = getPaymentGateway({
      country: context.country,
      currency: context.currency,
    });

    try {
      const subscription = await gateway.getSubscription(subscriptionId);
      if (!subscription) {
        return {
          success: false,
          error: {
            code: 'subscription_not_found',
            message: 'Subscription not found',
            retryable: false,
          },
          gatewayType: gateway.type,
        };
      }
      return {
        success: true,
        data: subscription,
        gatewayType: gateway.type,
      };
    } catch (error) {
      return this.handleError(error, gateway.type);
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    context: PaymentContext,
    subscriptionId: string,
    input: UpdateSubscriptionInput
  ): Promise<PaymentResult<GatewaySubscription>> {
    const gateway = getPaymentGateway({
      country: context.country,
      currency: context.currency,
    });

    try {
      const subscription = await gateway.updateSubscription(subscriptionId, input);
      return {
        success: true,
        data: subscription,
        gatewayType: gateway.type,
      };
    } catch (error) {
      return this.handleError(error, gateway.type);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    context: PaymentContext,
    subscriptionId: string,
    options?: { immediate?: boolean }
  ): Promise<PaymentResult<GatewaySubscription>> {
    const gateway = getPaymentGateway({
      country: context.country,
      currency: context.currency,
    });

    try {
      const subscription = await gateway.cancelSubscription(subscriptionId, options);
      return {
        success: true,
        data: subscription,
        gatewayType: gateway.type,
      };
    } catch (error) {
      return this.handleError(error, gateway.type);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REFUNDS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a refund
   */
  async createRefund(
    context: PaymentContext,
    input: Omit<CreateRefundInput, 'metadata'>
  ): Promise<PaymentResult<GatewayRefund>> {
    const gateway = getPaymentGateway({
      country: context.country,
      currency: context.currency,
    });

    const transactionId = crypto.randomUUID();

    try {
      // Log the refund attempt
      await this.logTransaction({
        id: transactionId,
        billingAccountId: await this.getBillingAccountId(context.tenantId, context.userId),
        gateway: gateway.type,
        type: 'refund',
        status: 'pending',
        amountCents: input.amountCents ?? 0,
        currency: context.currency,
        countryCode: context.country,
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          correlationId: context.correlationId,
          originalPaymentId: input.paymentId,
        },
      });

      const refund = await gateway.createRefund({
        ...input,
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          correlationId: context.correlationId,
          transactionId,
        },
      });

      // Update transaction with gateway response
      await this.updateTransaction(transactionId, {
        gatewayTransactionId: refund.id,
        status: 'completed',
        gatewayResponse: refund.rawResponse as object,
      });

      return {
        success: true,
        data: refund,
        gatewayType: gateway.type,
        transactionId,
      };
    } catch (error) {
      await this.updateTransactionError(transactionId, error);
      return this.handleError(error, gateway.type, transactionId);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHECKOUT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a hosted checkout session
   */
  async createCheckoutSession(
    context: PaymentContext,
    input: Omit<CreateCheckoutInput, 'metadata'>
  ): Promise<PaymentResult<GatewayCheckoutSession>> {
    const gateway = getPaymentGateway({
      country: context.country,
      currency: context.currency,
      requireSubscriptions: input.mode === 'subscription',
    });

    try {
      const session = await gateway.createCheckoutSession({
        ...input,
        metadata: {
          tenantId: context.tenantId,
          userId: context.userId,
          correlationId: context.correlationId,
        },
      });

      return {
        success: true,
        data: session,
        gatewayType: gateway.type,
      };
    } catch (error) {
      return this.handleError(error, gateway.type);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ════════════════════════════════════════════════════════════════════════════

  private handleError<T>(
    error: unknown,
    gatewayType: PaymentGatewayType,
    transactionId?: string
  ): PaymentResult<T> {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isRetryable = this.isRetryableError(error);

    return {
      success: false,
      error: {
        code: 'payment_error',
        message,
        retryable: isRetryable,
      },
      gatewayType,
      transactionId,
    };
  }

  private isRetryableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('rate limit') ||
      message.includes('temporarily unavailable')
    );
  }

  private mapPaymentStatusToTransaction(status: PaymentStatus): string {
    const map: Record<PaymentStatus, string> = {
      [PaymentStatus.PENDING]: 'pending',
      [PaymentStatus.PROCESSING]: 'processing',
      [PaymentStatus.SUCCEEDED]: 'completed',
      [PaymentStatus.FAILED]: 'failed',
      [PaymentStatus.CANCELED]: 'canceled',
      [PaymentStatus.REFUNDED]: 'refunded',
      [PaymentStatus.PARTIALLY_REFUNDED]: 'partially_refunded',
      [PaymentStatus.REQUIRES_ACTION]: 'requires_action',
      [PaymentStatus.REQUIRES_PAYMENT_METHOD]: 'requires_payment_method',
    };
    return map[status] ?? 'unknown';
  }

  private async getBillingAccountId(tenantId: string, userId: string): Promise<string | undefined> {
    const account = await prisma.billingAccount.findFirst({
      where: { tenantId, ownerUserId: userId },
      select: { id: true },
    });
    return account?.id;
  }

  private async logTransaction(data: {
    id: string;
    billingAccountId?: string;
    gateway: PaymentGatewayType;
    type: string;
    status: string;
    amountCents: number;
    currency: string;
    countryCode: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await prisma.paymentTransaction.create({
        data: {
          id: data.id,
          billingAccountId: data.billingAccountId!,
          gateway: data.gateway,
          type: data.type,
          status: data.status,
          amountCents: data.amountCents,
          currency: data.currency,
          countryCode: data.countryCode,
          metadata: data.metadata as object,
        },
      });
    } catch {
      // Don't fail payment if logging fails
      console.error('Failed to log transaction:', data.id);
    }
  }

  private async updateTransaction(
    id: string,
    data: {
      gatewayTransactionId?: string;
      status?: string;
      gatewayResponse?: object;
    }
  ): Promise<void> {
    try {
      await prisma.paymentTransaction.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
          completedAt: data.status === 'completed' ? new Date() : undefined,
        },
      });
    } catch {
      console.error('Failed to update transaction:', id);
    }
  }

  private async updateTransactionError(id: string, error: unknown): Promise<void> {
    try {
      await prisma.paymentTransaction.update({
        where: { id },
        data: {
          status: 'failed',
          errorCode: 'payment_error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        },
      });
    } catch {
      console.error('Failed to update transaction error:', id);
    }
  }
}

// Export singleton instance
export const unifiedPaymentService = new UnifiedPaymentService();
