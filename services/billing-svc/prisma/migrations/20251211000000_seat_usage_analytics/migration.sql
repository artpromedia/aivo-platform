-- ══════════════════════════════════════════════════════════════════════════════
-- SEAT USAGE ANALYTICS & ALERTS
-- ══════════════════════════════════════════════════════════════════════════════
-- 
-- This migration adds:
--   1. vw_seat_usage - Materialized view for seat utilization metrics
--   2. seat_usage_alerts - Table for threshold-based alerts
--   3. Supporting indexes and triggers
--
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- SEAT USAGE ALERT STATUS ENUM
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE "SeatUsageAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- ══════════════════════════════════════════════════════════════════════════════
-- SEAT USAGE ALERTS TABLE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE "seat_usage_alerts" (
    "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"     UUID NOT NULL,
    "sku"           TEXT NOT NULL,
    "grade_band"    "GradeBand" NOT NULL,
    "threshold"     DECIMAL(4,2) NOT NULL,  -- e.g., 0.80, 1.00, 1.10
    "status"        "SeatUsageAlertStatus" NOT NULL DEFAULT 'OPEN',
    "context_json"  JSONB,  -- Snapshot of usage values at alert time
    "acknowledged_at"       TIMESTAMPTZ,
    "acknowledged_by"       UUID,
    "resolved_at"           TIMESTAMPTZ,
    "resolved_by"           UUID,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seat_usage_alerts_pkey" PRIMARY KEY ("id")
);

-- Indexes for efficient querying
CREATE INDEX "seat_usage_alerts_tenant_status_idx" ON "seat_usage_alerts"("tenant_id", "status");
CREATE INDEX "seat_usage_alerts_tenant_sku_threshold_idx" ON "seat_usage_alerts"("tenant_id", "sku", "threshold");
CREATE INDEX "seat_usage_alerts_status_created_idx" ON "seat_usage_alerts"("status", "created_at" DESC);

-- Unique constraint: only one open alert per tenant/sku/threshold
CREATE UNIQUE INDEX "seat_usage_alerts_unique_open_idx" 
    ON "seat_usage_alerts"("tenant_id", "sku", "threshold") 
    WHERE "status" = 'OPEN';

-- ══════════════════════════════════════════════════════════════════════════════
-- SEAT USAGE VIEW (Materialized)
-- ══════════════════════════════════════════════════════════════════════════════
-- 
-- Aggregates seat entitlements with license assignments for reporting.
-- Uses COALESCE and NULLIF for safe division handling.
--

CREATE MATERIALIZED VIEW "vw_seat_usage" AS
SELECT
    se.tenant_id,
    se.sku,
    se.grade_band,
    se.quantity_committed AS committed_seats,
    COALESCE(la_counts.allocated_seats, 0) AS allocated_seats,
    se.overage_allowed,
    se.overage_limit,
    GREATEST(0, COALESCE(la_counts.allocated_seats, 0) - se.quantity_committed) AS overage_used,
    CASE 
        WHEN se.quantity_committed = 0 THEN 0.00
        ELSE ROUND(
            (COALESCE(la_counts.allocated_seats, 0)::DECIMAL / se.quantity_committed::DECIMAL) * 100, 
            2
        )
    END AS utilization_percent,
    se.contract_id,
    se.start_date,
    se.end_date,
    se.is_active,
    se.enforcement,
    CURRENT_TIMESTAMP AS calculated_at
FROM 
    seat_entitlements se
LEFT JOIN (
    -- Count distinct active license assignments per entitlement
    SELECT
        entitlement_id,
        COUNT(DISTINCT id) FILTER (WHERE status = 'ACTIVE') AS allocated_seats
    FROM 
        license_assignments
    GROUP BY 
        entitlement_id
) la_counts ON la_counts.entitlement_id = se.id
WHERE 
    se.is_active = true
    AND se.end_date >= CURRENT_DATE;

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX "vw_seat_usage_unique_idx" 
    ON "vw_seat_usage"("tenant_id", "sku", "grade_band");

-- Additional indexes for common query patterns
CREATE INDEX "vw_seat_usage_tenant_idx" ON "vw_seat_usage"("tenant_id");
CREATE INDEX "vw_seat_usage_utilization_idx" ON "vw_seat_usage"("utilization_percent" DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- REFRESH FUNCTION
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION refresh_seat_usage_view()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY "vw_seat_usage";
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════════════════════
-- SEAT USAGE ALERT NOTIFICATION TABLE (for in-app notifications)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE "seat_usage_notifications" (
    "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
    "alert_id"      UUID NOT NULL,
    "tenant_id"     UUID NOT NULL,
    "user_id"       UUID,  -- Null for system-wide notifications
    "title"         TEXT NOT NULL,
    "message"       TEXT NOT NULL,
    "severity"      TEXT NOT NULL DEFAULT 'WARNING',  -- INFO, WARNING, CRITICAL
    "is_read"       BOOLEAN NOT NULL DEFAULT FALSE,
    "read_at"       TIMESTAMPTZ,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seat_usage_notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seat_usage_notifications_alert_fkey" FOREIGN KEY ("alert_id") 
        REFERENCES "seat_usage_alerts"("id") ON DELETE CASCADE
);

CREATE INDEX "seat_usage_notifications_tenant_user_idx" 
    ON "seat_usage_notifications"("tenant_id", "user_id", "is_read");
CREATE INDEX "seat_usage_notifications_alert_idx" 
    ON "seat_usage_notifications"("alert_id");

-- ══════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON MATERIALIZED VIEW "vw_seat_usage" IS 
    'Aggregated seat usage metrics per tenant, SKU, and grade band. Refresh with refresh_seat_usage_view().';

COMMENT ON TABLE "seat_usage_alerts" IS 
    'Threshold-based alerts for seat utilization. Generated by daily job when thresholds exceeded.';

COMMENT ON TABLE "seat_usage_notifications" IS 
    'In-app notifications for seat usage alerts. Displayed to district and platform admins.';
