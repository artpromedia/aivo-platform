-- ══════════════════════════════════════════════════════════════════════════════
-- BILLING SERVICE - INITIAL MIGRATION
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Creates the billing & subscription data model for the Aivo platform.
--
-- Supports:
--   - Parent (consumer) subscriptions with base + add-on modules
--   - District contracts with seat-based licensing
--   - Payment provider abstraction (Stripe, manual invoice, etc.)
--   - Trials, proration, and invoice management
--
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ══════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ══════════════════════════════════════════════════════════════════════════════

-- Type of billing account
CREATE TYPE billing_account_type AS ENUM (
  'PARENT_CONSUMER',   -- Individual parent paying for their children
  'DISTRICT',          -- School district with seat-based licensing
  'PLATFORM_INTERNAL'  -- Internal/free accounts (e.g., demo, testing)
);

-- Subscription status
CREATE TYPE subscription_status AS ENUM (
  'IN_TRIAL',   -- Active trial period, no charges yet
  'ACTIVE',     -- Paid and in good standing
  'PAST_DUE',   -- Payment failed, grace period
  'CANCELED',   -- User canceled, may have access until period end
  'EXPIRED'     -- Subscription ended, no access
);

-- Plan type
CREATE TYPE plan_type AS ENUM (
  'PARENT_BASE',    -- Core ELA + Math for parent subscribers
  'PARENT_ADDON',   -- Add-on modules (SEL, Speech, Science, etc.)
  'DISTRICT_BASE',  -- Base district licensing
  'DISTRICT_ADDON'  -- District add-on modules
);

-- Billing period
CREATE TYPE billing_period AS ENUM (
  'MONTHLY',
  'YEARLY'
);

-- Payment provider
CREATE TYPE payment_provider AS ENUM (
  'STRIPE',          -- Stripe payment processor
  'MANUAL_INVOICE',  -- Manual invoicing (for districts)
  'TEST_FAKE'        -- Test/fake provider for development
);

-- Invoice status
CREATE TYPE invoice_status AS ENUM (
  'DRAFT',         -- Being prepared, not yet finalized
  'OPEN',          -- Finalized and awaiting payment
  'PAID',          -- Successfully paid
  'VOID',          -- Canceled/voided
  'UNCOLLECTIBLE'  -- Payment failed, written off
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────────
-- billing_accounts
-- ──────────────────────────────────────────────────────────────────────────────
-- A billing account represents a paying entity - either a parent or a district.

CREATE TABLE billing_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  account_type          billing_account_type NOT NULL,
  owner_user_id         UUID,  -- For parent accounts; null for district/internal
  display_name          TEXT NOT NULL,
  provider              payment_provider NOT NULL DEFAULT 'STRIPE',
  provider_customer_id  TEXT,  -- e.g., Stripe customer ID (cus_xxx)
  default_currency      VARCHAR(3) NOT NULL DEFAULT 'USD',
  billing_email         TEXT,
  metadata_json         JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for billing_accounts
CREATE INDEX idx_billing_accounts_tenant_type ON billing_accounts(tenant_id, account_type);
CREATE INDEX idx_billing_accounts_provider_customer ON billing_accounts(provider_customer_id) WHERE provider_customer_id IS NOT NULL;

COMMENT ON TABLE billing_accounts IS 'Billing accounts - paying entities (parents or districts)';
COMMENT ON COLUMN billing_accounts.tenant_id IS 'FK to tenants table (enforced at app level)';
COMMENT ON COLUMN billing_accounts.owner_user_id IS 'FK to users table for parent accounts';
COMMENT ON COLUMN billing_accounts.provider_customer_id IS 'External customer ID in payment provider';

-- ──────────────────────────────────────────────────────────────────────────────
-- plans
-- ──────────────────────────────────────────────────────────────────────────────
-- Plans define available products and pricing.

CREATE TABLE plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku              TEXT NOT NULL UNIQUE,  -- e.g., 'PARENT_BASE', 'ADDON_SEL'
  plan_type        plan_type NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  unit_price_cents INTEGER NOT NULL,  -- Price per unit per billing period
  billing_period   billing_period NOT NULL DEFAULT 'MONTHLY',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  trial_days       INTEGER NOT NULL DEFAULT 0,
  metadata_json    JSONB,  -- { "modules": ["ELA", "MATH"], "maxLearners": 5 }
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for plans
CREATE INDEX idx_plans_type_active ON plans(plan_type, is_active);

COMMENT ON TABLE plans IS 'Subscription plans and pricing';
COMMENT ON COLUMN plans.sku IS 'Unique product identifier';
COMMENT ON COLUMN plans.unit_price_cents IS 'Price per unit (learner/seat) per billing period';
COMMENT ON COLUMN plans.metadata_json IS 'Features, limits, modules included';

-- ──────────────────────────────────────────────────────────────────────────────
-- subscriptions
-- ──────────────────────────────────────────────────────────────────────────────
-- Active or historical subscriptions linking accounts to plans.

CREATE TABLE subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_account_id        UUID NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,
  plan_id                   UUID NOT NULL REFERENCES plans(id),
  status                    subscription_status NOT NULL DEFAULT 'IN_TRIAL',
  quantity                  INTEGER NOT NULL DEFAULT 1,  -- # children or seats
  trial_start_at            TIMESTAMPTZ,
  trial_end_at              TIMESTAMPTZ,
  current_period_start      TIMESTAMPTZ NOT NULL,
  current_period_end        TIMESTAMPTZ NOT NULL,
  cancel_at_period_end      BOOLEAN NOT NULL DEFAULT false,
  canceled_at               TIMESTAMPTZ,
  ended_at                  TIMESTAMPTZ,
  provider_subscription_id  TEXT,  -- e.g., Stripe sub_xxx
  metadata_json             JSONB,  -- { "modules": [...], "contractNumber": "..." }
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_account_status ON subscriptions(billing_account_id, status);
CREATE INDEX idx_subscriptions_provider ON subscriptions(provider_subscription_id) WHERE provider_subscription_id IS NOT NULL;
CREATE INDEX idx_subscriptions_status_period ON subscriptions(status, current_period_end);

COMMENT ON TABLE subscriptions IS 'Customer subscriptions to plans';
COMMENT ON COLUMN subscriptions.quantity IS 'Number of learners (parent) or seats (district)';
COMMENT ON COLUMN subscriptions.trial_start_at IS 'Start of trial period (null if no trial)';
COMMENT ON COLUMN subscriptions.trial_end_at IS 'End of trial period - triggers conversion or expiration';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'If true, subscription ends at current_period_end';

-- ──────────────────────────────────────────────────────────────────────────────
-- subscription_items
-- ──────────────────────────────────────────────────────────────────────────────
-- Line items within a subscription (e.g., base + multiple add-ons).

CREATE TABLE subscription_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  plan_id         UUID NOT NULL REFERENCES plans(id),
  sku             TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  learner_id      UUID,  -- Optional: specific learner this item is for
  metadata_json   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for subscription_items
CREATE INDEX idx_subscription_items_subscription ON subscription_items(subscription_id);
CREATE INDEX idx_subscription_items_learner ON subscription_items(learner_id) WHERE learner_id IS NOT NULL;

COMMENT ON TABLE subscription_items IS 'Individual items within a subscription';
COMMENT ON COLUMN subscription_items.learner_id IS 'FK to learners table - tracks which child has which module';

-- ──────────────────────────────────────────────────────────────────────────────
-- billing_instruments
-- ──────────────────────────────────────────────────────────────────────────────
-- Payment methods (tokenized - no raw card data stored).

CREATE TABLE billing_instruments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_account_id          UUID NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,
  provider_payment_method_id  TEXT NOT NULL,  -- e.g., Stripe pm_xxx
  brand                       TEXT,           -- visa, mastercard, amex
  last4                       VARCHAR(4),
  expiry_month                SMALLINT,
  expiry_year                 SMALLINT,
  is_default                  BOOLEAN NOT NULL DEFAULT false,
  instrument_type             TEXT NOT NULL DEFAULT 'card',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for billing_instruments
CREATE INDEX idx_billing_instruments_account ON billing_instruments(billing_account_id);
CREATE INDEX idx_billing_instruments_provider ON billing_instruments(provider_payment_method_id);

COMMENT ON TABLE billing_instruments IS 'Stored payment methods (tokenized references only)';
COMMENT ON COLUMN billing_instruments.provider_payment_method_id IS 'Payment method ID in payment provider';

-- ──────────────────────────────────────────────────────────────────────────────
-- invoices
-- ──────────────────────────────────────────────────────────────────────────────
-- Invoice records for charges and payments.

CREATE TABLE invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_account_id  UUID NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,
  provider_invoice_id TEXT,          -- e.g., Stripe in_xxx
  invoice_number      TEXT UNIQUE,   -- Human-readable: INV-2024-00001
  amount_due_cents    INTEGER NOT NULL,
  amount_paid_cents   INTEGER NOT NULL DEFAULT 0,
  currency            VARCHAR(3) NOT NULL DEFAULT 'USD',
  status              invoice_status NOT NULL DEFAULT 'DRAFT',
  period_start        TIMESTAMPTZ NOT NULL,
  period_end          TIMESTAMPTZ NOT NULL,
  issued_at           TIMESTAMPTZ,
  due_at              TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,
  pdf_url             TEXT,
  metadata_json       JSONB,  -- { "prorationInfo": {...}, "notes": "..." }
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for invoices
CREATE INDEX idx_invoices_account_issued ON invoices(billing_account_id, issued_at DESC);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_provider ON invoices(provider_invoice_id) WHERE provider_invoice_id IS NOT NULL;

COMMENT ON TABLE invoices IS 'Billing invoices';
COMMENT ON COLUMN invoices.amount_due_cents IS 'Total amount due in cents';
COMMENT ON COLUMN invoices.metadata_json IS 'Proration details, adjustments, credits';

-- ──────────────────────────────────────────────────────────────────────────────
-- invoice_line_items
-- ──────────────────────────────────────────────────────────────────────────────
-- Individual line items on invoices.

CREATE TABLE invoice_line_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  subscription_id  UUID REFERENCES subscriptions(id),
  description      TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity         INTEGER NOT NULL DEFAULT 1,
  amount_cents     INTEGER NOT NULL,
  line_item_type   TEXT NOT NULL DEFAULT 'subscription',  -- subscription, proration, credit, one_time
  metadata_json    JSONB,  -- { "prorationFactor": 0.5, "reason": "mid-cycle upgrade" }
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for invoice_line_items
CREATE INDEX idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_subscription ON invoice_line_items(subscription_id) WHERE subscription_id IS NOT NULL;

COMMENT ON TABLE invoice_line_items IS 'Line items on invoices';
COMMENT ON COLUMN invoice_line_items.line_item_type IS 'Type: subscription, proration, credit, one_time';
COMMENT ON COLUMN invoice_line_items.metadata_json IS 'Proration details, period adjustments';

-- ──────────────────────────────────────────────────────────────────────────────
-- usage_records
-- ──────────────────────────────────────────────────────────────────────────────
-- Usage tracking for metered billing (future).

CREATE TABLE usage_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL,  -- FK to subscriptions (not enforced for flexibility)
  metric          TEXT NOT NULL,  -- e.g., 'learner_count', 'api_calls'
  quantity        INTEGER NOT NULL,
  timestamp       TIMESTAMPTZ NOT NULL,
  invoiced        BOOLEAN NOT NULL DEFAULT false,
  metadata_json   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for usage_records
CREATE INDEX idx_usage_records_subscription_metric ON usage_records(subscription_id, metric, timestamp);
CREATE INDEX idx_usage_records_invoiced ON usage_records(invoiced) WHERE invoiced = false;

COMMENT ON TABLE usage_records IS 'Metered usage for future billing models';

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ══════════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_billing_accounts_updated_at
  BEFORE UPDATE ON billing_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_items_updated_at
  BEFORE UPDATE ON subscription_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_instruments_updated_at
  BEFORE UPDATE ON billing_instruments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED DATA - Default Plans
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO plans (sku, plan_type, name, description, unit_price_cents, billing_period, trial_days, metadata_json) VALUES
  -- Parent Plans
  ('PARENT_BASE_MONTHLY', 'PARENT_BASE', 'Aivo Base (Monthly)', 'Core ELA & Math curriculum per child', 1999, 'MONTHLY', 30, '{"modules": ["ELA", "MATH"], "maxLearners": 1}'),
  ('PARENT_BASE_YEARLY', 'PARENT_BASE', 'Aivo Base (Yearly)', 'Core ELA & Math curriculum per child - annual', 16999, 'YEARLY', 30, '{"modules": ["ELA", "MATH"], "maxLearners": 1}'),
  
  -- Parent Add-ons
  ('ADDON_SEL_MONTHLY', 'PARENT_ADDON', 'SEL Module (Monthly)', 'Social-Emotional Learning add-on', 499, 'MONTHLY', 30, '{"modules": ["SEL"]}'),
  ('ADDON_SPEECH_MONTHLY', 'PARENT_ADDON', 'Speech Module (Monthly)', 'Speech & Communication add-on', 799, 'MONTHLY', 30, '{"modules": ["SPEECH"]}'),
  ('ADDON_SCIENCE_MONTHLY', 'PARENT_ADDON', 'Science Module (Monthly)', 'Science curriculum add-on', 499, 'MONTHLY', 30, '{"modules": ["SCIENCE"]}'),
  ('ADDON_CODING_MONTHLY', 'PARENT_ADDON', 'Coding Module (Monthly)', 'Coding & computational thinking', 699, 'MONTHLY', 30, '{"modules": ["CODING"]}'),
  
  -- District Plans
  ('DISTRICT_BASE_MONTHLY', 'DISTRICT_BASE', 'District License (Monthly)', 'Per-learner per-month licensing', 800, 'MONTHLY', 0, '{"modules": ["ELA", "MATH"], "minSeats": 50}'),
  ('DISTRICT_BASE_YEARLY', 'DISTRICT_BASE', 'District License (Annual)', 'Per-learner annual licensing', 7200, 'YEARLY', 0, '{"modules": ["ELA", "MATH"], "minSeats": 50}'),
  
  -- District Add-ons
  ('DISTRICT_ADDON_SEL', 'DISTRICT_ADDON', 'District SEL Module', 'SEL add-on per learner per month', 200, 'MONTHLY', 0, '{"modules": ["SEL"]}'),
  ('DISTRICT_ADDON_SPEECH', 'DISTRICT_ADDON', 'District Speech Module', 'Speech add-on per learner per month', 300, 'MONTHLY', 0, '{"modules": ["SPEECH"]}');
