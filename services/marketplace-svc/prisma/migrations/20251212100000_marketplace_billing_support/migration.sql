-- ══════════════════════════════════════════════════════════════════════════════
-- MARKETPLACE BILLING SUPPORT MIGRATION
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Extends marketplace items with billing metadata and revenue sharing.
--
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- ENUM: Marketplace Billing Model
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE marketplace_billing_model AS ENUM (
  'FREE',          -- No charge, included with core license
  'TENANT_FLAT',   -- Flat fee per tenant/organization
  'PER_SEAT'       -- Per-seat/per-learner pricing
);

-- ══════════════════════════════════════════════════════════════════════════════
-- ALTER: marketplace_items - Add billing metadata
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE marketplace_items
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS billing_model marketplace_billing_model NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS billing_metadata_json JSONB;

-- Index for billing queries
CREATE INDEX IF NOT EXISTS idx_marketplace_items_billing 
  ON marketplace_items(is_free, billing_model) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_marketplace_items_sku 
  ON marketplace_items(sku) 
  WHERE sku IS NOT NULL;

COMMENT ON COLUMN marketplace_items.is_free IS 'Whether the item is free (no billing required)';
COMMENT ON COLUMN marketplace_items.billing_model IS 'Billing model: FREE, TENANT_FLAT, or PER_SEAT';
COMMENT ON COLUMN marketplace_items.sku IS 'Reference to billing SKU in billing-svc (e.g., MPK_FRACTIONS_G3_5)';
COMMENT ON COLUMN marketplace_items.billing_metadata_json IS 'Additional billing config: { "trialDays": 30, "minSeats": 10 }';

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: vendor_revenue_shares
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Revenue sharing configuration for third-party vendors.
-- Tracks what percentage of revenue goes to the vendor for each SKU.
--

CREATE TABLE vendor_revenue_shares (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id           UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  sku                 TEXT NOT NULL,
  share_percent       NUMERIC(5,2) NOT NULL,  -- e.g., 30.00 for 30%
  effective_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_end_date  DATE,  -- NULL = no end date (ongoing)
  
  -- Audit fields
  created_by_user_id  UUID,
  notes               TEXT,
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT chk_share_percent CHECK (share_percent >= 0 AND share_percent <= 100),
  CONSTRAINT chk_date_range CHECK (effective_end_date IS NULL OR effective_end_date > effective_start_date)
);

-- Indexes
CREATE INDEX idx_vendor_revenue_shares_vendor ON vendor_revenue_shares(vendor_id);
CREATE INDEX idx_vendor_revenue_shares_sku ON vendor_revenue_shares(sku);
CREATE INDEX idx_vendor_revenue_shares_effective ON vendor_revenue_shares(effective_start_date, effective_end_date);

-- Unique constraint: only one active share agreement per vendor/SKU at a time
CREATE UNIQUE INDEX idx_vendor_revenue_shares_unique_active 
  ON vendor_revenue_shares(vendor_id, sku, effective_start_date) 
  WHERE effective_end_date IS NULL;

COMMENT ON TABLE vendor_revenue_shares IS 'Revenue sharing configuration for third-party vendors';
COMMENT ON COLUMN vendor_revenue_shares.share_percent IS 'Vendor share percentage (e.g., 30.00 = 30%)';
COMMENT ON COLUMN vendor_revenue_shares.effective_start_date IS 'When this share agreement becomes effective';
COMMENT ON COLUMN vendor_revenue_shares.effective_end_date IS 'When this share agreement ends (NULL = ongoing)';

-- ══════════════════════════════════════════════════════════════════════════════
-- ALTER: marketplace_installations - Add billing linkage
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE marketplace_installations
  ADD COLUMN IF NOT EXISTS contract_line_item_id UUID,
  ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS billing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seat_quantity INT,
  ADD COLUMN IF NOT EXISTS billing_metadata_json JSONB;

-- Index for billing queries
CREATE INDEX IF NOT EXISTS idx_marketplace_installations_billing 
  ON marketplace_installations(billing_status, billing_started_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_installations_contract_line 
  ON marketplace_installations(contract_line_item_id) 
  WHERE contract_line_item_id IS NOT NULL;

COMMENT ON COLUMN marketplace_installations.contract_line_item_id IS 'FK to billing-svc contract_line_items (cross-service reference)';
COMMENT ON COLUMN marketplace_installations.billing_status IS 'Billing status: PENDING, ACTIVE, CANCELED, EXPIRED';
COMMENT ON COLUMN marketplace_installations.billing_started_at IS 'When billing started for this installation';
COMMENT ON COLUMN marketplace_installations.billing_ended_at IS 'When billing ended (cancellation/expiry)';
COMMENT ON COLUMN marketplace_installations.seat_quantity IS 'Number of seats for PER_SEAT billing model';
COMMENT ON COLUMN marketplace_installations.billing_metadata_json IS 'Additional billing info: { "priceAtInstall": 1000, "contractId": "..." }';

-- ══════════════════════════════════════════════════════════════════════════════
-- Trigger: Update updated_at timestamp
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_vendor_revenue_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vendor_revenue_shares_updated_at
  BEFORE UPDATE ON vendor_revenue_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_revenue_shares_updated_at();
