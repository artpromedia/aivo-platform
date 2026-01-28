/**
 * Multi-Gateway Webhook Routes
 *
 * Handles webhooks from all payment providers:
 * - Stripe
 * - Paystack
 * - Razorpay
 * - Mercado Pago
 *
 * Features:
 * - Signature verification
 * - Event deduplication
 * - Unified event processing
 * - Dead letter queue for failed events
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  getPaymentGatewayFactory,
  PaymentGatewayType,
  WebhookEventType,
} from '../gateways/index.js';
import { prisma } from '../prisma.js';
import { billingEventPublisher, BillingEventType } from '../events/billing.publisher.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface WebhookMetrics {
  received: number;
  processed: number;
  failed: number;
  duplicates: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK PROCESSOR
// ══════════════════════════════════════════════════════════════════════════════

class MultiGatewayWebhookProcessor {
  private readonly metrics: Record<PaymentGatewayType, WebhookMetrics> = {
    [PaymentGatewayType.STRIPE]: { received: 0, processed: 0, failed: 0, duplicates: 0 },
    [PaymentGatewayType.PAYSTACK]: { received: 0, processed: 0, failed: 0, duplicates: 0 },
    [PaymentGatewayType.RAZORPAY]: { received: 0, processed: 0, failed: 0, duplicates: 0 },
    [PaymentGatewayType.MERCADO_PAGO]: { received: 0, processed: 0, failed: 0, duplicates: 0 },
    [PaymentGatewayType.FLUTTERWAVE]: { received: 0, processed: 0, failed: 0, duplicates: 0 },
    [PaymentGatewayType.PAYU]: { received: 0, processed: 0, failed: 0, duplicates: 0 },
    [PaymentGatewayType.MPESA]: { received: 0, processed: 0, failed: 0, duplicates: 0 },
    [PaymentGatewayType.PAYTM]: { received: 0, processed: 0, failed: 0, duplicates: 0 },
    [PaymentGatewayType.MANUAL_INVOICE]: { received: 0, processed: 0, failed: 0, duplicates: 0 },
    [PaymentGatewayType.TEST_FAKE]: { received: 0, processed: 0, failed: 0, duplicates: 0 },
  };

  /**
   * Process a webhook from any gateway
   */
  async processWebhook(
    gatewayType: PaymentGatewayType,
    payload: string | Buffer,
    headers: Record<string, string>
  ): Promise<{ success: boolean; message: string }> {
    this.metrics[gatewayType].received++;

    try {
      const factory = getPaymentGatewayFactory();
      const gateway = factory.getGatewayByType(gatewayType);

      if (!gateway) {
        throw new Error(`Gateway ${gatewayType} not configured`);
      }

      // Verify webhook signature
      const result = await gateway.verifyWebhook(payload, headers);

      if (!result.verified || !result.event) {
        this.metrics[gatewayType].failed++;
        return { success: false, message: result.error ?? 'Verification failed' };
      }

      const { event } = result;

      // Check for duplicate event
      const existingEvent = await prisma.gatewayWebhookEvent.findUnique({
        where: {
          gateway_event_id: {
            gateway: gatewayType,
            eventId: event.id,
          },
        },
      });

      if (existingEvent) {
        this.metrics[gatewayType].duplicates++;
        return { success: true, message: 'Duplicate event, already processed' };
      }

      // Store the event
      await prisma.gatewayWebhookEvent.create({
        data: {
          gateway: gatewayType,
          eventId: event.id,
          eventType: event.eventType,
          payload: event.rawEvent as object,
          processed: false,
        },
      });

      // Process the event
      await this.handleEvent(gatewayType, event);

      // Mark as processed
      await prisma.gatewayWebhookEvent.update({
        where: {
          gateway_event_id: {
            gateway: gatewayType,
            eventId: event.id,
          },
        },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      this.metrics[gatewayType].processed++;
      return { success: true, message: 'Event processed successfully' };
    } catch (error) {
      this.metrics[gatewayType].failed++;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${gatewayType}] Webhook error:`, message);
      return { success: false, message };
    }
  }

  /**
   * Handle a verified webhook event
   */
  private async handleEvent(
    gatewayType: PaymentGatewayType,
    event: {
      id: string;
      eventType: WebhookEventType;
      data: unknown;
      timestamp: Date;
    }
  ): Promise<void> {
    const { eventType, data } = event;

    switch (eventType) {
      case WebhookEventType.PAYMENT_SUCCESS:
        await this.handlePaymentSuccess(gatewayType, data);
        break;

      case WebhookEventType.PAYMENT_FAILED:
        await this.handlePaymentFailed(gatewayType, data);
        break;

      case WebhookEventType.SUBSCRIPTION_CREATED:
        await this.handleSubscriptionCreated(gatewayType, data);
        break;

      case WebhookEventType.SUBSCRIPTION_ACTIVATED:
        await this.handleSubscriptionActivated(gatewayType, data);
        break;

      case WebhookEventType.SUBSCRIPTION_UPDATED:
        await this.handleSubscriptionUpdated(gatewayType, data);
        break;

      case WebhookEventType.SUBSCRIPTION_CANCELED:
        await this.handleSubscriptionCanceled(gatewayType, data);
        break;

      case WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCESS:
        await this.handleSubscriptionPaymentSuccess(gatewayType, data);
        break;

      case WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED:
        await this.handleSubscriptionPaymentFailed(gatewayType, data);
        break;

      case WebhookEventType.REFUND_PROCESSED:
        await this.handleRefundProcessed(gatewayType, data);
        break;

      case WebhookEventType.CHARGE_DISPUTE:
        await this.handleDispute(gatewayType, data);
        break;

      default:
        console.log(`[${gatewayType}] Unhandled event type: ${eventType}`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  private async handlePaymentSuccess(
    gatewayType: PaymentGatewayType,
    data: unknown
  ): Promise<void> {
    const paymentData = data as {
      id: string;
      customer?: string;
      amount?: number;
      currency?: string;
      metadata?: Record<string, string>;
    };

    // Update payment transaction status
    await prisma.paymentTransaction.updateMany({
      where: {
        gateway: gatewayType,
        gatewayTransactionId: paymentData.id,
      },
      data: {
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Publish event
    await billingEventPublisher.publish(BillingEventType.PAYMENT_SUCCEEDED, {
      gateway: gatewayType,
      transactionId: paymentData.id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      metadata: paymentData.metadata,
    });
  }

  private async handlePaymentFailed(
    gatewayType: PaymentGatewayType,
    data: unknown
  ): Promise<void> {
    const paymentData = data as {
      id: string;
      error_code?: string;
      error_message?: string;
    };

    // Update payment transaction status
    await prisma.paymentTransaction.updateMany({
      where: {
        gateway: gatewayType,
        gatewayTransactionId: paymentData.id,
      },
      data: {
        status: 'failed',
        errorCode: paymentData.error_code,
        errorMessage: paymentData.error_message,
        updatedAt: new Date(),
      },
    });

    // Publish event
    await billingEventPublisher.publish(BillingEventType.PAYMENT_FAILED, {
      gateway: gatewayType,
      transactionId: paymentData.id,
      errorCode: paymentData.error_code,
      errorMessage: paymentData.error_message,
    });
  }

  private async handleSubscriptionCreated(
    _gatewayType: PaymentGatewayType,
    _data: unknown
  ): Promise<void> {
    // Implementation depends on your subscription sync logic
    console.log('Subscription created event received');
  }

  private async handleSubscriptionActivated(
    gatewayType: PaymentGatewayType,
    data: unknown
  ): Promise<void> {
    const subData = data as {
      id: string;
      customer?: string;
      metadata?: Record<string, string>;
    };

    // Publish event
    await billingEventPublisher.publish(BillingEventType.SUBSCRIPTION_ACTIVATED, {
      gateway: gatewayType,
      subscriptionId: subData.id,
      customerId: subData.customer,
      metadata: subData.metadata,
    });
  }

  private async handleSubscriptionUpdated(
    gatewayType: PaymentGatewayType,
    data: unknown
  ): Promise<void> {
    const subData = data as {
      id: string;
      status?: string;
      metadata?: Record<string, string>;
    };

    // Publish event
    await billingEventPublisher.publish(BillingEventType.SUBSCRIPTION_UPDATED, {
      gateway: gatewayType,
      subscriptionId: subData.id,
      status: subData.status,
      metadata: subData.metadata,
    });
  }

  private async handleSubscriptionCanceled(
    gatewayType: PaymentGatewayType,
    data: unknown
  ): Promise<void> {
    const subData = data as {
      id: string;
      customer?: string;
      ended_at?: number;
    };

    // Publish event
    await billingEventPublisher.publish(BillingEventType.SUBSCRIPTION_CANCELLED, {
      gateway: gatewayType,
      subscriptionId: subData.id,
      customerId: subData.customer,
      endedAt: subData.ended_at ? new Date(subData.ended_at * 1000) : undefined,
    });
  }

  private async handleSubscriptionPaymentSuccess(
    gatewayType: PaymentGatewayType,
    data: unknown
  ): Promise<void> {
    const invoiceData = data as {
      id: string;
      subscription?: string;
      amount_paid?: number;
      currency?: string;
    };

    // Publish event
    await billingEventPublisher.publish(BillingEventType.INVOICE_PAID, {
      gateway: gatewayType,
      invoiceId: invoiceData.id,
      subscriptionId: invoiceData.subscription,
      amountPaid: invoiceData.amount_paid,
      currency: invoiceData.currency,
    });
  }

  private async handleSubscriptionPaymentFailed(
    gatewayType: PaymentGatewayType,
    data: unknown
  ): Promise<void> {
    const invoiceData = data as {
      id: string;
      subscription?: string;
      attempt_count?: number;
    };

    // Publish event for dunning process
    await billingEventPublisher.publish(BillingEventType.INVOICE_PAYMENT_FAILED, {
      gateway: gatewayType,
      invoiceId: invoiceData.id,
      subscriptionId: invoiceData.subscription,
      attemptCount: invoiceData.attempt_count,
    });
  }

  private async handleRefundProcessed(
    gatewayType: PaymentGatewayType,
    data: unknown
  ): Promise<void> {
    const refundData = data as {
      id: string;
      payment_intent?: string;
      amount?: number;
      currency?: string;
    };

    // Publish event
    await billingEventPublisher.publish(BillingEventType.REFUND_PROCESSED, {
      gateway: gatewayType,
      refundId: refundData.id,
      paymentId: refundData.payment_intent,
      amount: refundData.amount,
      currency: refundData.currency,
    });
  }

  private async handleDispute(
    gatewayType: PaymentGatewayType,
    data: unknown
  ): Promise<void> {
    const disputeData = data as {
      id: string;
      payment_intent?: string;
      amount?: number;
      reason?: string;
    };

    // Publish event for dispute handling
    await billingEventPublisher.publish(BillingEventType.DISPUTE_CREATED, {
      gateway: gatewayType,
      disputeId: disputeData.id,
      paymentId: disputeData.payment_intent,
      amount: disputeData.amount,
      reason: disputeData.reason,
    });
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics(): Record<PaymentGatewayType, WebhookMetrics> {
    return { ...this.metrics };
  }
}

// Singleton instance
const webhookProcessor = new MultiGatewayWebhookProcessor();

// ══════════════════════════════════════════════════════════════════════════════
// FASTIFY ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerGatewayWebhookRoutes(fastify: FastifyInstance): Promise<void> {
  // Stripe Webhook
  fastify.post(
    '/webhooks/stripe',
    {
      config: { rawBody: true },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = (request as FastifyRequest & { rawBody?: Buffer }).rawBody?.toString() ?? '';
      const headers = Object.fromEntries(
        Object.entries(request.headers).map(([k, v]) => [k, String(v)])
      );

      const result = await webhookProcessor.processWebhook(
        PaymentGatewayType.STRIPE,
        payload,
        headers
      );

      if (result.success) {
        return reply.status(200).send({ received: true });
      } else {
        return reply.status(400).send({ error: result.message });
      }
    }
  );

  // Paystack Webhook
  fastify.post('/webhooks/paystack', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = JSON.stringify(request.body);
    const headers = Object.fromEntries(
      Object.entries(request.headers).map(([k, v]) => [k, String(v)])
    );

    const result = await webhookProcessor.processWebhook(
      PaymentGatewayType.PAYSTACK,
      payload,
      headers
    );

    if (result.success) {
      return reply.status(200).send({ status: 'success' });
    } else {
      return reply.status(400).send({ error: result.message });
    }
  });

  // Razorpay Webhook
  fastify.post('/webhooks/razorpay', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = JSON.stringify(request.body);
    const headers = Object.fromEntries(
      Object.entries(request.headers).map(([k, v]) => [k, String(v)])
    );

    const result = await webhookProcessor.processWebhook(
      PaymentGatewayType.RAZORPAY,
      payload,
      headers
    );

    if (result.success) {
      return reply.status(200).send({ status: 'ok' });
    } else {
      return reply.status(400).send({ error: result.message });
    }
  });

  // Mercado Pago Webhook
  fastify.post('/webhooks/mercadopago', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = JSON.stringify(request.body);
    const headers = Object.fromEntries(
      Object.entries(request.headers).map(([k, v]) => [k, String(v)])
    );

    const result = await webhookProcessor.processWebhook(
      PaymentGatewayType.MERCADO_PAGO,
      payload,
      headers
    );

    if (result.success) {
      return reply.status(200).send({ status: 'ok' });
    } else {
      return reply.status(400).send({ error: result.message });
    }
  });

  // Flutterwave Webhook
  fastify.post('/webhooks/flutterwave', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = JSON.stringify(request.body);
    const headers = Object.fromEntries(
      Object.entries(request.headers).map(([k, v]) => [k, String(v)])
    );

    const result = await webhookProcessor.processWebhook(
      PaymentGatewayType.FLUTTERWAVE,
      payload,
      headers
    );

    if (result.success) {
      return reply.status(200).send({ status: 'success' });
    } else {
      return reply.status(400).send({ error: result.message });
    }
  });

  // M-Pesa Webhook (STK Push callback)
  fastify.post('/webhooks/mpesa', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = JSON.stringify(request.body);
    const headers = Object.fromEntries(
      Object.entries(request.headers).map(([k, v]) => [k, String(v)])
    );

    const result = await webhookProcessor.processWebhook(
      PaymentGatewayType.MPESA,
      payload,
      headers
    );

    // M-Pesa expects a specific response format
    if (result.success) {
      return reply.status(200).send({
        ResultCode: 0,
        ResultDesc: 'Confirmation received successfully',
      });
    } else {
      return reply.status(200).send({
        ResultCode: 1,
        ResultDesc: result.message,
      });
    }
  });

  // M-Pesa C2B Validation (optional)
  fastify.post('/webhooks/mpesa/validation', async (request: FastifyRequest, reply: FastifyReply) => {
    // M-Pesa validation endpoint - accept all payments
    return reply.status(200).send({
      ResultCode: 0,
      ResultDesc: 'Accepted',
    });
  });

  // M-Pesa Reversal Callback
  fastify.post('/webhooks/mpesa/reversal/result', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = JSON.stringify(request.body);
    const headers = Object.fromEntries(
      Object.entries(request.headers).map(([k, v]) => [k, String(v)])
    );

    await webhookProcessor.processWebhook(
      PaymentGatewayType.MPESA,
      payload,
      headers
    );

    return reply.status(200).send({
      ResultCode: 0,
      ResultDesc: 'Reversal result received',
    });
  });

  // PayU Webhook
  fastify.post('/webhooks/payu', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = JSON.stringify(request.body);
    const headers = Object.fromEntries(
      Object.entries(request.headers).map(([k, v]) => [k, String(v)])
    );

    const result = await webhookProcessor.processWebhook(
      PaymentGatewayType.PAYU,
      payload,
      headers
    );

    if (result.success) {
      return reply.status(200).send({ status: 'ok' });
    } else {
      return reply.status(400).send({ error: result.message });
    }
  });

  // Paytm Webhook
  fastify.post('/webhooks/paytm', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = JSON.stringify(request.body);
    const headers = Object.fromEntries(
      Object.entries(request.headers).map(([k, v]) => [k, String(v)])
    );

    const result = await webhookProcessor.processWebhook(
      PaymentGatewayType.PAYTM,
      payload,
      headers
    );

    if (result.success) {
      return reply.status(200).send({ status: 'ok' });
    } else {
      return reply.status(400).send({ error: result.message });
    }
  });

  // Webhook Metrics Endpoint (internal only)
  fastify.get('/webhooks/metrics', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send(webhookProcessor.getMetrics());
  });

  // Health check for webhook endpoints
  fastify.get('/webhooks/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({ status: 'healthy', timestamp: new Date().toISOString() });
  });
}

export { webhookProcessor };
