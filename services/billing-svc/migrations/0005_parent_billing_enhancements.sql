-- Migration: Add Parent Billing Enhancements
-- Adds: limitedMode, Coupon, TrialRecord, SubscriptionAnalyticsDaily tables
-- and enhances existing subscription/invoice models

-- ═══════════════════════════════════════════════════════════════════════════════
-- SUBSCRIPTION ENHANCEMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add limitedMode flag to subscriptions for dunning enforcement
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS limited_mode BOOLEAN NOT NULL DEFAULT false;

-- Add Stripe subscription item IDs for per-item management
ALTER TABLE subscription_items
    ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS stripe_price_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_subscription_items_stripe
    ON subscription_items(stripe_subscription_item_id);

CREATE INDEX IF NOT EXISTS idx_subscription_items_trial
    ON subscription_items(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIAL TRACKING TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
-- Tracks trial usage per tenant/learner/SKU to prevent multiple free trials

CREATE TABLE IF NOT EXISTS trial_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    learner_id UUID NOT NULL,
    sku TEXT NOT NULL,
    
    -- Trial lifecycle
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at TIMESTAMPTZ NOT NULL,
    converted_at TIMESTAMPTZ NULL,
    canceled_at TIMESTAMPTZ NULL,
    
    -- Associated subscription item (for tracking)
    subscription_item_id UUID NULL REFERENCES subscription_items(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure one trial per tenant/learner/SKU
    UNIQUE(tenant_id, learner_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_trial_records_tenant_learner
    ON trial_records(tenant_id, learner_id);

CREATE INDEX IF NOT EXISTS idx_trial_records_ends_at
    ON trial_records(ends_at) WHERE converted_at IS NULL AND canceled_at IS NULL;

COMMENT ON TABLE trial_records IS 
'Tracks 30-day free trial usage per tenant/learner/SKU combination. Prevents multiple free trials for same SKU.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- COUPON TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Coupon code (unique, uppercase)
    code TEXT NOT NULL UNIQUE,
    
    -- Discount configuration
    discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED')),
    percent_off DECIMAL(5,2) NULL CHECK (percent_off IS NULL OR (percent_off > 0 AND percent_off <= 100)),
    amount_off_cents INTEGER NULL CHECK (amount_off_cents IS NULL OR amount_off_cents > 0),
    currency TEXT NULL,
    
    -- Validity period
    valid_from TIMESTAMPTZ NULL,
    valid_to TIMESTAMPTZ NULL,
    
    -- Usage limits
    max_redemptions INTEGER NULL CHECK (max_redemptions IS NULL OR max_redemptions > 0),
    times_redeemed INTEGER NOT NULL DEFAULT 0,
    
    -- Scope
    tenant_id UUID NULL,  -- NULL for global coupons
    applicable_skus TEXT[] NULL,  -- NULL for all SKUs
    
    -- Stripe integration
    stripe_coupon_id TEXT NULL UNIQUE,
    stripe_promotion_code_id TEXT NULL,
    
    -- Metadata
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Validation constraints
    CONSTRAINT coupon_discount_check CHECK (
        (discount_type = 'PERCENT' AND percent_off IS NOT NULL AND amount_off_cents IS NULL) OR
        (discount_type = 'FIXED' AND amount_off_cents IS NOT NULL AND percent_off IS NULL AND currency IS NOT NULL)
    ),
    CONSTRAINT coupon_validity_check CHECK (
        valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to
    )
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON coupons(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_coupons_stripe ON coupons(stripe_coupon_id) WHERE stripe_coupon_id IS NOT NULL;

COMMENT ON TABLE coupons IS 
'Discount coupons for parent subscriptions. Can be global or tenant-specific. Synced with Stripe coupons.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- COUPON REDEMPTIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    billing_account_id UUID NOT NULL,
    subscription_id UUID NULL REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- Discount applied
    discount_amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    
    -- Redemption context
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    stripe_invoice_id TEXT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_tenant ON coupon_redemptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_subscription ON coupon_redemptions(subscription_id);

COMMENT ON TABLE coupon_redemptions IS 
'Tracks each coupon redemption for audit and analytics purposes.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- INVOICE ENHANCEMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add hosted invoice URL and PDF URL for Stripe
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS hosted_invoice_url TEXT NULL,
    ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SUBSCRIPTION ANALYTICS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscription_analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    tenant_id UUID NULL,  -- NULL for global aggregates
    
    -- Revenue metrics
    mrr_cents BIGINT NOT NULL DEFAULT 0,
    
    -- Subscription counts
    active_subscriptions INTEGER NOT NULL DEFAULT 0,
    
    -- Trial metrics
    trials_started INTEGER NOT NULL DEFAULT 0,
    trials_converted INTEGER NOT NULL DEFAULT 0,
    
    -- Churn metrics
    churned_subscriptions INTEGER NOT NULL DEFAULT 0,
    
    -- New business
    new_subscriptions INTEGER NOT NULL DEFAULT 0,
    
    -- Per-SKU breakdown (JSONB)
    sku_breakdown JSONB NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(date, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON subscription_analytics_daily(date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_tenant ON subscription_analytics_daily(tenant_id, date);

COMMENT ON TABLE subscription_analytics_daily IS 
'Daily aggregated subscription analytics for MRR tracking, churn analysis, and reporting.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- DUNNING TRACKING TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dunning_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    
    -- Failure tracking
    first_failure_at TIMESTAMPTZ NOT NULL,
    latest_failure_at TIMESTAMPTZ NOT NULL,
    failure_count INTEGER NOT NULL DEFAULT 1,
    
    -- Dunning progression
    day0_notified_at TIMESTAMPTZ NULL,
    day3_notified_at TIMESTAMPTZ NULL,
    day7_notified_at TIMESTAMPTZ NULL,
    limited_mode_at TIMESTAMPTZ NULL,
    
    -- Resolution
    resolved_at TIMESTAMPTZ NULL,
    resolution_type TEXT NULL CHECK (resolution_type IN ('PAYMENT_SUCCEEDED', 'SUBSCRIPTION_CANCELED', 'MANUAL')),
    
    -- Associated invoice
    stripe_invoice_id TEXT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dunning_subscription ON dunning_records(subscription_id);
CREATE INDEX IF NOT EXISTS idx_dunning_tenant ON dunning_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dunning_unresolved ON dunning_records(resolved_at) WHERE resolved_at IS NULL;

COMMENT ON TABLE dunning_records IS 
'Tracks dunning progression for failed payments. Used for notification sequencing and limited mode enforcement.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- BILLING EVENT (IDEMPOTENCY) ENHANCEMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add more fields to payment_events for better tracking
ALTER TABLE payment_events
    ADD COLUMN IF NOT EXISTS tenant_id UUID NULL,
    ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS handler_result TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_events_tenant ON payment_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_handled ON payment_events(handled_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER: Auto-update timestamps
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to new tables
DROP TRIGGER IF EXISTS trg_trial_records_updated_at ON trial_records;
CREATE TRIGGER trg_trial_records_updated_at
    BEFORE UPDATE ON trial_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON coupons;
CREATE TRIGGER trg_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_dunning_records_updated_at ON dunning_records;
CREATE TRIGGER trg_dunning_records_updated_at
    BEFORE UPDATE ON dunning_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER: Increment coupon redemption count
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_coupon_redemption()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE coupons 
    SET times_redeemed = times_redeemed + 1, updated_at = now()
    WHERE id = NEW.coupon_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_coupon_redemption ON coupon_redemptions;
CREATE TRIGGER trg_coupon_redemption
    AFTER INSERT ON coupon_redemptions
    FOR EACH ROW EXECUTE FUNCTION increment_coupon_redemption();
