-- Migration: Add international payment gateways
-- Description: Extends the PaymentProvider enum to support regional payment providers
-- for international expansion (Paystack for Africa, Razorpay for India, Mercado Pago for LATAM)

-- Step 1: Add new values to PaymentProvider enum
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'PAYSTACK';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'RAZORPAY';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'MERCADO_PAGO';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'FLUTTERWAVE';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'PAYU';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'MPESA';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'PAYTM';

-- Step 2: Create PaymentGatewayRegion table for region-specific configuration
CREATE TABLE IF NOT EXISTS "payment_gateway_regions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "country_code" VARCHAR(2) NOT NULL,
  "currency_code" VARCHAR(3) NOT NULL,
  "primary_gateway" "PaymentProvider" NOT NULL,
  "fallback_gateway" "PaymentProvider",
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "local_payment_methods" JSONB,
  "gateway_config" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "payment_gateway_regions_country_currency_key" UNIQUE ("country_code", "currency_code")
);

-- Step 3: Create PaymentTransaction table for tracking all gateway transactions
CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "billing_account_id" UUID NOT NULL REFERENCES "billing_accounts"("id") ON DELETE CASCADE,
  "gateway" "PaymentProvider" NOT NULL,
  "gateway_transaction_id" VARCHAR(255),
  "gateway_customer_id" VARCHAR(255),
  "type" VARCHAR(50) NOT NULL, -- 'payment', 'subscription', 'refund'
  "status" VARCHAR(50) NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "country_code" VARCHAR(2),
  "payment_method" VARCHAR(50), -- 'card', 'bank_transfer', 'mobile_money', 'upi', etc.
  "metadata" JSONB,
  "error_code" VARCHAR(100),
  "error_message" TEXT,
  "gateway_response" JSONB,
  "idempotency_key" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  
  CONSTRAINT "payment_transactions_idempotency_key" UNIQUE ("idempotency_key")
);

-- Step 4: Create GatewayWebhookEvent table for webhook tracking/deduplication
CREATE TABLE IF NOT EXISTS "gateway_webhook_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "gateway" "PaymentProvider" NOT NULL,
  "event_id" VARCHAR(255) NOT NULL,
  "event_type" VARCHAR(100) NOT NULL,
  "payload" JSONB NOT NULL,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "processed_at" TIMESTAMP(3),
  "error" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "gateway_webhook_events_gateway_event_id_key" UNIQUE ("gateway", "event_id")
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS "payment_gateway_regions_country_idx" ON "payment_gateway_regions"("country_code");
CREATE INDEX IF NOT EXISTS "payment_gateway_regions_currency_idx" ON "payment_gateway_regions"("currency_code");
CREATE INDEX IF NOT EXISTS "payment_gateway_regions_gateway_idx" ON "payment_gateway_regions"("primary_gateway");

CREATE INDEX IF NOT EXISTS "payment_transactions_account_idx" ON "payment_transactions"("billing_account_id");
CREATE INDEX IF NOT EXISTS "payment_transactions_gateway_idx" ON "payment_transactions"("gateway");
CREATE INDEX IF NOT EXISTS "payment_transactions_status_idx" ON "payment_transactions"("status");
CREATE INDEX IF NOT EXISTS "payment_transactions_created_idx" ON "payment_transactions"("created_at");
CREATE INDEX IF NOT EXISTS "payment_transactions_gateway_tx_idx" ON "payment_transactions"("gateway_transaction_id");

CREATE INDEX IF NOT EXISTS "gateway_webhook_events_gateway_idx" ON "gateway_webhook_events"("gateway");
CREATE INDEX IF NOT EXISTS "gateway_webhook_events_type_idx" ON "gateway_webhook_events"("event_type");
CREATE INDEX IF NOT EXISTS "gateway_webhook_events_processed_idx" ON "gateway_webhook_events"("processed");

-- Step 6: Seed initial gateway region configurations
INSERT INTO "payment_gateway_regions" ("country_code", "currency_code", "primary_gateway", "fallback_gateway", "local_payment_methods") VALUES
-- Africa - Paystack (primary)
('NG', 'NGN', 'PAYSTACK', 'FLUTTERWAVE', '["card", "bank_transfer", "ussd", "mobile_money", "qr"]'),
('GH', 'GHS', 'PAYSTACK', 'FLUTTERWAVE', '["card", "bank_transfer", "mobile_money"]'),
('ZA', 'ZAR', 'PAYSTACK', 'STRIPE', '["card", "bank_transfer", "eft"]'),

-- East Africa - M-Pesa (primary), Flutterwave (fallback)
('KE', 'KES', 'MPESA', 'FLUTTERWAVE', '["mpesa", "card", "bank_transfer"]'),
('TZ', 'TZS', 'FLUTTERWAVE', 'MPESA', '["mobile_money", "card", "bank_transfer"]'),
('UG', 'UGX', 'FLUTTERWAVE', NULL, '["mobile_money", "card", "bank_transfer"]'),
('RW', 'RWF', 'FLUTTERWAVE', NULL, '["mobile_money", "card", "bank_transfer"]'),
('ZM', 'ZMW', 'FLUTTERWAVE', NULL, '["mobile_money", "card", "bank_transfer"]'),

-- Francophone Africa - Flutterwave
('CI', 'XOF', 'FLUTTERWAVE', NULL, '["mobile_money", "card", "bank_transfer"]'),
('SN', 'XOF', 'FLUTTERWAVE', NULL, '["mobile_money", "card", "bank_transfer"]'),
('CM', 'XAF', 'FLUTTERWAVE', NULL, '["mobile_money", "card", "bank_transfer"]'),
('BJ', 'XOF', 'FLUTTERWAVE', NULL, '["mobile_money", "card"]'),
('TG', 'XOF', 'FLUTTERWAVE', NULL, '["mobile_money", "card"]'),
('BF', 'XOF', 'FLUTTERWAVE', NULL, '["mobile_money", "card"]'),
('ML', 'XOF', 'FLUTTERWAVE', NULL, '["mobile_money", "card"]'),
('NE', 'XOF', 'FLUTTERWAVE', NULL, '["mobile_money", "card"]'),

-- India - Razorpay (primary), Paytm/PayU (secondary)
('IN', 'INR', 'RAZORPAY', 'PAYTM', '["card", "upi", "netbanking", "wallet", "emi"]'),

-- Latin America - Mercado Pago
('AR', 'ARS', 'MERCADO_PAGO', 'STRIPE', '["card", "bank_transfer", "cash", "wallet"]'),
('BR', 'BRL', 'MERCADO_PAGO', 'STRIPE', '["card", "pix", "boleto", "wallet"]'),
('CL', 'CLP', 'MERCADO_PAGO', 'STRIPE', '["card", "bank_transfer", "cash"]'),
('CO', 'COP', 'MERCADO_PAGO', 'STRIPE', '["card", "pse", "cash", "wallet"]'),
('MX', 'MXN', 'MERCADO_PAGO', 'STRIPE', '["card", "oxxo", "bank_transfer", "wallet"]'),
('PE', 'PEN', 'MERCADO_PAGO', 'STRIPE', '["card", "bank_transfer", "cash"]'),
('UY', 'UYU', 'MERCADO_PAGO', 'STRIPE', '["card", "bank_transfer"]'),
('PA', 'USD', 'MERCADO_PAGO', 'STRIPE', '["card", "bank_transfer"]'),

-- Europe - PayU for select countries
('PL', 'PLN', 'PAYU', 'STRIPE', '["card", "bank_transfer", "blik", "installments"]'),
('CZ', 'CZK', 'PAYU', 'STRIPE', '["card", "bank_transfer"]'),
('RO', 'RON', 'PAYU', 'STRIPE', '["card", "bank_transfer"]'),
('TR', 'TRY', 'PAYU', 'STRIPE', '["card", "bank_transfer"]'),

-- Global (Stripe default)
('US', 'USD', 'STRIPE', NULL, '["card", "bank_transfer", "ach"]'),
('GB', 'GBP', 'STRIPE', NULL, '["card", "bank_transfer", "bacs"]'),
('CA', 'CAD', 'STRIPE', NULL, '["card", "bank_transfer"]'),
('AU', 'AUD', 'STRIPE', NULL, '["card", "bank_transfer", "becs"]'),
('DE', 'EUR', 'STRIPE', NULL, '["card", "sepa", "giropay", "sofort"]'),
('FR', 'EUR', 'STRIPE', NULL, '["card", "sepa", "bancontact"]'),
('NL', 'EUR', 'STRIPE', NULL, '["card", "sepa", "ideal"]'),
('ES', 'EUR', 'STRIPE', NULL, '["card", "sepa"]'),
('IT', 'EUR', 'STRIPE', NULL, '["card", "sepa"]'),
('AT', 'EUR', 'STRIPE', NULL, '["card", "sepa", "eps"]'),
('BE', 'EUR', 'STRIPE', NULL, '["card", "sepa", "bancontact"]'),
('CH', 'CHF', 'STRIPE', NULL, '["card", "bank_transfer"]'),
('JP', 'JPY', 'STRIPE', NULL, '["card", "konbini", "bank_transfer"]'),
('SG', 'SGD', 'STRIPE', NULL, '["card", "bank_transfer", "paynow"]'),
('HK', 'HKD', 'STRIPE', NULL, '["card", "bank_transfer", "fps"]'),
('NZ', 'NZD', 'STRIPE', NULL, '["card", "bank_transfer"]'),
('AE', 'AED', 'STRIPE', NULL, '["card"]'),
('SA', 'SAR', 'STRIPE', NULL, '["card", "mada"]'),
('SE', 'SEK', 'STRIPE', NULL, '["card", "sepa", "klarna"]'),
('NO', 'NOK', 'STRIPE', NULL, '["card", "vipps"]'),
('DK', 'DKK', 'STRIPE', NULL, '["card", "mobilepay"]'),
('FI', 'EUR', 'STRIPE', NULL, '["card", "sepa"]'),
('IE', 'EUR', 'STRIPE', NULL, '["card", "sepa"]')

ON CONFLICT ("country_code", "currency_code") DO UPDATE SET
  "primary_gateway" = EXCLUDED."primary_gateway",
  "fallback_gateway" = EXCLUDED."fallback_gateway",
  "local_payment_methods" = EXCLUDED."local_payment_methods",
  "updated_at" = CURRENT_TIMESTAMP;
