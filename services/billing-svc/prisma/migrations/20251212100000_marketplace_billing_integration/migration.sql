-- ══════════════════════════════════════════════════════════════════════════════
-- MARKETPLACE BILLING INTEGRATION MIGRATION
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Adds marketplace billing support to the billing service:
-- - Marketplace SKU products
-- - Marketplace entitlements
-- - Vendor revenue tracking view
--
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED: Marketplace Product Category and Sample SKUs
-- ══════════════════════════════════════════════════════════════════════════════

-- Add marketplace category to products if not exists
-- (Products are managed by application code, this is just for reference)

-- Sample marketplace SKUs:
-- MPK_FRACTIONS_PACK_G3_5   - Content pack: Fractions for grades 3-5
-- MPK_SEL_ACTIVITIES_ALL    - Content pack: SEL activities all grades
-- MPT_TOOL_MATH_GAME        - Embedded tool: Math game integration
-- MPT_TOOL_READING_HELPER   - Embedded tool: Reading assistance tool

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: marketplace_entitlements
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Entitlements specific to marketplace items. Similar to contract_entitlements
-- but tracks marketplace item installation entitlements.
--

CREATE TABLE IF NOT EXISTS marketplace_entitlements (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL,
  contract_id             UUID REFERENCES contracts(id) ON DELETE CASCADE,
  line_item_id            UUID REFERENCES contract_line_items(id) ON DELETE CASCADE,
  
  -- Marketplace reference (cross-service FK)
  marketplace_item_id     UUID NOT NULL,
  marketplace_installation_id UUID NOT NULL,
  
  -- SKU and feature
  sku                     TEXT NOT NULL,
  feature_key             TEXT NOT NULL,  -- e.g., "MARKETPLACE_ITEM:{item_id}"
  
  -- Entitlement details
  is_active               BOOLEAN NOT NULL DEFAULT true,
  quantity                INTEGER,  -- For PER_SEAT: seat count
  
  -- Effective dates
  start_date              DATE NOT NULL,
  end_date                DATE NOT NULL,
  
  -- Metadata
  metadata_json           JSONB,
  
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_entitlements_tenant 
  ON marketplace_entitlements(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_marketplace_entitlements_contract 
  ON marketplace_entitlements(contract_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_entitlements_item 
  ON marketplace_entitlements(marketplace_item_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_entitlements_sku 
  ON marketplace_entitlements(sku);
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_entitlements_unique
  ON marketplace_entitlements(tenant_id, marketplace_item_id, contract_id);

COMMENT ON TABLE marketplace_entitlements IS 'Entitlements for marketplace items installed by tenants';
COMMENT ON COLUMN marketplace_entitlements.marketplace_item_id IS 'FK to marketplace-svc marketplace_items';
COMMENT ON COLUMN marketplace_entitlements.marketplace_installation_id IS 'FK to marketplace-svc marketplace_installations';

-- ══════════════════════════════════════════════════════════════════════════════
-- VIEW: vw_vendor_revenue
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Revenue reporting view for vendor payouts.
-- Aggregates paid invoice line items by vendor SKU and period.
--
-- Note: This view joins data from billing-svc (invoices, line items) with
-- marketplace-svc data (vendor revenue shares). In production, the vendor
-- share data would be replicated or fetched via API call.
--

-- First, create a table to hold replicated vendor revenue share data
-- (This is synced from marketplace-svc for reporting purposes)
CREATE TABLE IF NOT EXISTS vendor_revenue_share_cache (
  id                    UUID PRIMARY KEY,
  vendor_id             UUID NOT NULL,
  vendor_name           TEXT NOT NULL,
  sku                   TEXT NOT NULL,
  share_percent         NUMERIC(5,2) NOT NULL,
  effective_start_date  DATE NOT NULL,
  effective_end_date    DATE,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_revenue_cache_sku 
  ON vendor_revenue_share_cache(sku, effective_start_date, effective_end_date);
CREATE INDEX IF NOT EXISTS idx_vendor_revenue_cache_vendor 
  ON vendor_revenue_share_cache(vendor_id);

-- Create the revenue view
CREATE OR REPLACE VIEW vw_vendor_revenue AS
WITH invoice_periods AS (
  -- Get all paid invoice line items with marketplace SKUs
  SELECT 
    ili.id AS line_item_id,
    i.id AS invoice_id,
    i.billing_account_id,
    i.period_start,
    i.period_end,
    i.paid_at,
    DATE_TRUNC('month', i.paid_at) AS revenue_month,
    ili.description,
    ili.unit_price_cents,
    ili.quantity,
    ili.amount_cents,
    -- Extract SKU from metadata or description
    COALESCE(
      ili.metadata_json->>'sku',
      CASE 
        WHEN ili.description LIKE 'Marketplace:%' 
        THEN SUBSTRING(ili.description FROM 'SKU: ([A-Z0-9_]+)')
        ELSE NULL
      END
    ) AS sku
  FROM invoice_line_items ili
  JOIN invoices i ON i.id = ili.invoice_id
  WHERE i.status = 'PAID'
    AND i.paid_at IS NOT NULL
    AND (
      ili.metadata_json->>'isMarketplaceItem' = 'true'
      OR ili.description LIKE 'Marketplace:%'
      OR ili.metadata_json->>'sku' LIKE 'MP%'
    )
)
SELECT 
  vrsc.vendor_id,
  vrsc.vendor_name,
  vrsc.sku,
  ip.revenue_month AS period,
  COUNT(DISTINCT ip.invoice_id) AS invoice_count,
  SUM(ip.quantity) AS total_quantity,
  SUM(ip.amount_cents) AS gross_amount_cents,
  vrsc.share_percent,
  ROUND(SUM(ip.amount_cents) * vrsc.share_percent / 100) AS vendor_amount_cents,
  ROUND(SUM(ip.amount_cents) * (100 - vrsc.share_percent) / 100) AS aivo_amount_cents
FROM invoice_periods ip
JOIN vendor_revenue_share_cache vrsc ON vrsc.sku = ip.sku
  AND ip.paid_at >= vrsc.effective_start_date
  AND (vrsc.effective_end_date IS NULL OR ip.paid_at < vrsc.effective_end_date)
WHERE ip.sku IS NOT NULL
GROUP BY 
  vrsc.vendor_id,
  vrsc.vendor_name,
  vrsc.sku,
  ip.revenue_month,
  vrsc.share_percent
ORDER BY 
  ip.revenue_month DESC,
  vrsc.vendor_name,
  vrsc.sku;

COMMENT ON VIEW vw_vendor_revenue IS 'Revenue report by vendor/SKU/period for vendor payouts';

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: vendor_payouts
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Tracks vendor payout records for reconciliation and audit.
--

CREATE TABLE IF NOT EXISTS vendor_payouts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id             UUID NOT NULL,
  vendor_name           TEXT NOT NULL,
  
  -- Payout period
  period_start          DATE NOT NULL,
  period_end            DATE NOT NULL,
  
  -- Financial details
  gross_revenue_cents   BIGINT NOT NULL,
  vendor_share_percent  NUMERIC(5,2) NOT NULL,
  vendor_amount_cents   BIGINT NOT NULL,
  
  -- Status
  status                TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, PAID, DISPUTED
  
  -- Audit
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at           TIMESTAMPTZ,
  approved_by           UUID,
  paid_at               TIMESTAMPTZ,
  payment_reference     TEXT,  -- External payment reference
  
  -- Details
  line_items_json       JSONB,  -- Breakdown by SKU
  notes                 TEXT,
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor ON vendor_payouts(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_period ON vendor_payouts(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_status ON vendor_payouts(status, created_at DESC);

COMMENT ON TABLE vendor_payouts IS 'Vendor payout records for revenue sharing';

-- ══════════════════════════════════════════════════════════════════════════════
-- Trigger: Update updated_at timestamp
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_marketplace_entitlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_marketplace_entitlements_updated_at
  BEFORE UPDATE ON marketplace_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_entitlements_updated_at();

CREATE OR REPLACE FUNCTION update_vendor_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vendor_payouts_updated_at
  BEFORE UPDATE ON vendor_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_payouts_updated_at();
