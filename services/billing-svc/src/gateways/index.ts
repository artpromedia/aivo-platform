/**
 * Payment Gateway Module
 *
 * This module provides a unified abstraction layer for multiple payment providers,
 * enabling AIVO to accept payments from users worldwide with region-optimized
 * payment methods.
 *
 * Supported Gateways:
 * - Stripe (Global - 190+ countries)
 * - Paystack (Africa - Nigeria, Ghana, Kenya, South Africa)
 * - Razorpay (India)
 * - Mercado Pago (Latin America - Argentina, Brazil, Chile, Colombia, Mexico, Peru, Uruguay)
 *
 * Usage:
 * ```typescript
 * import { initializePaymentGateways, getPaymentGateway, PaymentGatewayType } from './gateways';
 *
 * // Initialize once at startup
 * initializePaymentGateways({
 *   stripe: { secretKey: '...', webhookSecret: '...' },
 *   paystack: { secretKey: '...', publicKey: '...' },
 *   razorpay: { keyId: '...', keySecret: '...', webhookSecret: '...' },
 *   mercadoPago: { accessToken: '...', publicKey: '...' },
 * });
 *
 * // Get gateway based on user's location
 * const gateway = getPaymentGateway({ country: 'NG', currency: 'NGN' });
 *
 * // Create a payment
 * const payment = await gateway.createPayment({
 *   customerId: 'cus_xxx',
 *   amountCents: 5000,
 *   currency: 'NGN',
 *   metadata: { tenantId: 'tenant_xxx', userId: 'user_xxx' },
 * });
 * ```
 */

// Gateway Interface & Types
export type {
  CreateCheckoutInput,
  CreateCustomerInput,
  CreatePaymentInput,
  CreateRefundInput,
  CreateSubscriptionInput,
  GatewayAddress,
  GatewayCapabilities,
  GatewayCheckoutSession,
  GatewayCustomer,
  GatewayMetadata,
  GatewayPayment,
  GatewayRefund,
  GatewaySubscription,
  PaymentGateway,
  PaymentVerificationResult,
  UpdateCustomerInput,
  UpdateSubscriptionInput,
  VerifyPaymentInput,
  WebhookEvent,
  WebhookVerificationResult,
} from './payment-gateway.interface.js';

export {
  getGatewayCapabilities,
  PaymentGatewayType,
  PaymentStatus,
  RefundStatus,
  SubscriptionGatewayStatus,
  WebhookEventType,
} from './payment-gateway.interface.js';

// Gateway Implementations
export { StripeGateway } from './stripe.gateway.js';
export { PaystackGateway } from './paystack.gateway.js';
export { RazorpayGateway } from './razorpay.gateway.js';
export { MercadoPagoGateway } from './mercadopago.gateway.js';
export { FlutterwaveGateway } from './flutterwave.gateway.js';
export { MpesaGateway } from './mpesa.gateway.js';
export { PayUGateway } from './payu.gateway.js';
export { PaytmGateway } from './paytm.gateway.js';

// Gateway Factory
export {
  getPaymentGateway,
  getPaymentGatewayFactory,
  initializePaymentGateways,
  PaymentGatewayFactory,
} from './gateway.factory.js';
