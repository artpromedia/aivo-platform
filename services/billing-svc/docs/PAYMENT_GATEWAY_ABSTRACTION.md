# Payment Gateway Abstraction Layer

## Overview

The AIVO platform now supports multiple payment gateways to provide optimal payment experiences for users worldwide. This abstraction layer enables region-specific payment processing with local payment methods while maintaining a unified API.

## Supported Gateways

| Gateway | Regions | Key Features |
|---------|---------|--------------|
| **Stripe** | Global (190+ countries) | Cards, Bank transfers, SEPA, ACH, Apple Pay, Google Pay |
| **Paystack** | Nigeria, Ghana, South Africa | Cards, Bank transfers, USSD, Mobile money |
| **Flutterwave** | 34+ African countries | Cards, Mobile money, Bank transfers, USSD, QR |
| **M-Pesa** | Kenya, Tanzania | Mobile money (STK Push), C2B, B2C |
| **Razorpay** | India | Cards, UPI, Net banking, Wallets, EMI |
| **Paytm** | India | Paytm Wallet, Cards, UPI, Net banking, Postpaid |
| **PayU** | India, Latin America, Europe | Cards, Bank transfers, BLIK, Installments |
| **Mercado Pago** | Argentina, Brazil, Chile, Colombia, Mexico, Peru, Uruguay | Cards, Pix, Boleto, OXXO, PSE |

## Regional Coverage

### Africa
- **West Africa**: Paystack (NG, GH), Flutterwave (all)
- **East Africa**: M-Pesa (KE, TZ), Flutterwave (UG, RW, ZM)
- **Francophone Africa**: Flutterwave (CI, SN, CM, BJ, TG, BF, ML, NE)
- **Southern Africa**: Paystack (ZA), Flutterwave

### India
- **Primary**: Razorpay (best UPI coverage)
- **Secondary**: Paytm (wallet payments), PayU (installments)

### Latin America
- **All Countries**: Mercado Pago (AR, BR, CL, CO, MX, PE, UY, PA)

### Europe
- **Eastern Europe**: PayU (PL, CZ, RO, TR)
- **Western Europe**: Stripe (all)

### Rest of World
- **Global**: Stripe (190+ countries)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UnifiedPaymentService                     │
├─────────────────────────────────────────────────────────────┤
│  • Automatic gateway selection                              │
│  • Transaction logging                                       │
│  • Error handling                                            │
│  • Retry logic                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  PaymentGatewayFactory                       │
├─────────────────────────────────────────────────────────────┤
│  • Country-based routing                                     │
│  • Currency-based routing                                    │
│  • Fallback handling                                         │
│  • Capability checking                                       │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  StripeGateway  │ │ PaystackGateway │ │ RazorpayGateway │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
               ┌─────────────────────────┐
               │  PaymentGateway         │
               │  Interface              │
               │  ────────────────────── │
               │  • createCustomer()     │
               │  • createPayment()      │
               │  • createSubscription() │
               │  • createRefund()       │
               │  • verifyWebhook()      │
               └─────────────────────────┘
```

## Configuration

### Environment Variables

```bash
# Stripe (Global - Required)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Paystack (West Africa: Nigeria, Ghana, South Africa)
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_PUBLIC_KEY=pk_live_xxx

# Flutterwave (Pan-Africa: 34+ countries)
FLUTTERWAVE_SECRET_KEY=FLWSECK_xxx
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_xxx
FLUTTERWAVE_ENCRYPTION_KEY=xxx

# M-Pesa (East Africa: Kenya, Tanzania)
MPESA_CONSUMER_KEY=xxx
MPESA_CONSUMER_SECRET=xxx
MPESA_SHORT_CODE=174379
MPESA_PASS_KEY=xxx
MPESA_CALLBACK_URL=https://api.aivo.com/billing/webhooks/mpesa
MPESA_SANDBOX=false

# Razorpay (India)
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# Paytm (India - Alternative)
PAYTM_MERCHANT_ID=xxx
PAYTM_MERCHANT_KEY=xxx
PAYTM_WEBSITE=DEFAULT
PAYTM_CALLBACK_URL=https://api.aivo.com/billing/webhooks/paytm
PAYTM_SANDBOX=false

# PayU (India, Latin America, Eastern Europe, Africa)
PAYU_MERCHANT_KEY=xxx
PAYU_MERCHANT_SALT=xxx
PAYU_REGION=india  # india | latam | europe | africa

# Mercado Pago (Latin America: AR, BR, CL, CO, MX, PE, UY)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx
MERCADOPAGO_WEBHOOK_SECRET=xxx

# Default gateway for countries without specific mapping
DEFAULT_PAYMENT_GATEWAY=STRIPE
```

### Initialization

```typescript
import { initializeGatewaysFromEnv } from './config/gateway.config.js';

// At service startup
initializeGatewaysFromEnv();
```

## Usage

### Basic Payment Flow

```typescript
import { unifiedPaymentService } from './services/unified-payment.service.js';

// Context includes user location
const context = {
  tenantId: 'tenant_xxx',
  userId: 'user_xxx',
  country: 'NG', // Nigeria
  currency: 'NGN',
  correlationId: 'req_xxx',
};

// Create customer (automatically uses Paystack for Nigeria)
const customer = await unifiedPaymentService.getOrCreateCustomer(context, {
  email: 'user@example.com',
  name: 'John Doe',
  phone: '+2348012345678',
});

// Create payment
const payment = await unifiedPaymentService.createPayment(context, {
  customerId: customer.data.id,
  amountCents: 500000, // ₦5,000.00
  currency: 'NGN',
  description: 'AIVO Subscription',
});

// Payment returns authorization URL for redirect flow
// Redirect user to: payment.data.authorizationUrl
```

### Subscription Flow

```typescript
// Create subscription (gateway handles plan creation)
const subscription = await unifiedPaymentService.createSubscription(context, {
  customerId: customer.data.id,
  planCode: 'PARENT_BASE_MONTHLY',
  amountCents: 999, // $9.99
  currency: 'USD',
  interval: 'monthly',
  trialDays: 14,
});
```

### Direct Gateway Access

```typescript
import { getPaymentGateway, PaymentGatewayType } from './gateways/index.js';

// Get gateway for specific country
const gateway = getPaymentGateway({
  country: 'IN',
  currency: 'INR',
});

// Use gateway directly
const customer = await gateway.createCustomer({
  email: 'user@example.in',
  metadata: { tenantId: 'xxx', userId: 'xxx' },
});
```

## Gateway Selection Logic

1. **Preferred Gateway**: If explicitly specified, use that gateway
2. **Country-Based**: Check `COUNTRY_GATEWAY_MAP` for regional optimization
3. **Currency-Based**: Use `CURRENCY_GATEWAY_MAP` as fallback
4. **Default Gateway**: Fall back to Stripe for global coverage

### Country to Gateway Mapping

| Countries | Gateway | Currencies |
|-----------|---------|------------|
| NG, GH, KE, ZA | Paystack | NGN, GHS, KES, ZAR |
| IN | Razorpay | INR |
| AR, BR, CL, CO, MX, PE, UY | Mercado Pago | ARS, BRL, CLP, COP, MXN, PEN, UYU |
| All Others | Stripe | USD, EUR, GBP, etc. |

## Webhooks

Each gateway has a dedicated webhook endpoint:

- **Stripe**: `POST /webhooks/stripe`
- **Paystack**: `POST /webhooks/paystack`
- **Razorpay**: `POST /webhooks/razorpay`
- **Mercado Pago**: `POST /webhooks/mercadopago`

### Webhook Processing

1. Signature verification
2. Event deduplication (24-hour window)
3. Unified event mapping
4. Internal event publishing
5. Transaction status updates

### Supported Webhook Events

| Gateway Event | Internal Event |
|--------------|----------------|
| payment.succeeded | PAYMENT_SUCCEEDED |
| payment.failed | PAYMENT_FAILED |
| subscription.created | SUBSCRIPTION_CREATED |
| subscription.activated | SUBSCRIPTION_ACTIVATED |
| subscription.canceled | SUBSCRIPTION_CANCELLED |
| invoice.paid | INVOICE_PAID |
| refund.processed | REFUND_PROCESSED |

## Local Payment Methods

### Nigeria (Paystack)
- **Cards**: Visa, Mastercard, Verve
- **Bank Transfer**: Direct bank payment
- **USSD**: Dial-in payments (*737#, etc.)
- **Mobile Money**: OPay, PalmPay, etc.
- **QR Code**: Scan to pay

### India (Razorpay)
- **Cards**: Visa, Mastercard, RuPay
- **UPI**: Google Pay, PhonePe, Paytm
- **Net Banking**: 50+ banks
- **Wallets**: Paytm, Amazon Pay
- **EMI**: Card-based installments

### Brazil (Mercado Pago)
- **Cards**: Visa, Mastercard, Elo, Hipercard
- **Pix**: Instant bank transfer (QR/key)
- **Boleto**: Bank slip payment
- **Wallet**: Mercado Pago balance

### Mexico (Mercado Pago)
- **Cards**: Visa, Mastercard
- **OXXO**: Cash payment at convenience stores
- **Bank Transfer**: SPEI
- **Wallet**: Mercado Pago balance

## Database Schema

### New Tables

```sql
-- Gateway region configuration
payment_gateway_regions (
  country_code VARCHAR(2),
  currency_code VARCHAR(3),
  primary_gateway PaymentProvider,
  fallback_gateway PaymentProvider,
  local_payment_methods JSONB,
  is_active BOOLEAN
)

-- Transaction tracking
payment_transactions (
  id UUID,
  billing_account_id UUID,
  gateway PaymentProvider,
  gateway_transaction_id VARCHAR,
  type VARCHAR, -- payment, subscription, refund
  status VARCHAR,
  amount_cents INTEGER,
  currency VARCHAR(3),
  country_code VARCHAR(2),
  payment_method VARCHAR,
  metadata JSONB,
  error_code VARCHAR,
  error_message TEXT
)

-- Webhook event deduplication
gateway_webhook_events (
  gateway PaymentProvider,
  event_id VARCHAR,
  event_type VARCHAR,
  payload JSONB,
  processed BOOLEAN,
  retry_count INTEGER
)
```

## Testing

### Test Mode

Each gateway provides test credentials:

- **Stripe**: Use `sk_test_` keys
- **Paystack**: Use test secret key
- **Razorpay**: Use test mode keys
- **Mercado Pago**: Use test access token

### Test Cards

| Gateway | Card Number | Expiry | CVV |
|---------|-------------|--------|-----|
| Stripe | 4242424242424242 | Any future | Any 3 |
| Paystack | 4084084084084081 | Any future | 408 |
| Razorpay | 4111111111111111 | Any future | Any 3 |
| Mercado Pago | 5031433215406351 | 11/25 | 123 |

## Monitoring

### Metrics Endpoint

```
GET /webhooks/metrics
```

Returns:
```json
{
  "STRIPE": { "received": 100, "processed": 98, "failed": 2, "duplicates": 5 },
  "PAYSTACK": { "received": 50, "processed": 49, "failed": 1, "duplicates": 2 }
}
```

### Health Check

```
GET /webhooks/health
```

## Error Handling

All gateway operations return a standardized result:

```typescript
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
```

### Retry Logic

Transient errors (network, rate limits) are marked as `retryable: true`. Implement exponential backoff for these cases.

## Future Gateways

Planned additions:
- **Flutterwave** (Africa expansion)
- **PayU** (India, Latin America, Europe)
- **M-Pesa** (East Africa mobile money)
- **Paytm** (India wallets)

## Support

For gateway-specific issues:
- Stripe: https://stripe.com/docs
- Paystack: https://paystack.com/docs
- Razorpay: https://razorpay.com/docs
- Mercado Pago: https://www.mercadopago.com.br/developers
