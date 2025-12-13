-- Migration: 0001_enhanced_dsr
-- Description: Enhanced DSR functionality with grace period and rate limiting

-- ════════════════════════════════════════════════════════════════════════════════
-- ADD GRACE PERIOD AND SCHEDULING FIELDS
-- ════════════════════════════════════════════════════════════════════════════════

ALTER TABLE dsr_requests 
    ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS cancelled_by_user_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL;

-- ════════════════════════════════════════════════════════════════════════════════
-- RATE LIMITING TABLE
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dsr_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('EXPORT', 'DELETE')),
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_count INTEGER NOT NULL DEFAULT 1,
    
    UNIQUE (tenant_id, user_id, request_type, request_date)
);

CREATE INDEX IF NOT EXISTS idx_dsr_rate_limits_lookup 
    ON dsr_rate_limits(tenant_id, user_id, request_type, request_date);

-- ════════════════════════════════════════════════════════════════════════════════
-- DSR AUDIT LOG
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dsr_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dsr_request_id UUID NOT NULL REFERENCES dsr_requests(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN (
        'CREATED',
        'APPROVED',
        'REJECTED',
        'STARTED',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
        'DOWNLOADED'
    )),
    performed_by_user_id TEXT NULL,
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    details_json JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dsr_audit_request 
    ON dsr_audit_log(dsr_request_id);

CREATE INDEX IF NOT EXISTS idx_dsr_audit_action 
    ON dsr_audit_log(action);

-- ════════════════════════════════════════════════════════════════════════════════
-- NOTIFICATION PREFERENCES FOR DSR
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dsr_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dsr_request_id UUID NOT NULL REFERENCES dsr_requests(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'CONFIRMATION',
        'GRACE_PERIOD_REMINDER',
        'COMPLETION',
        'CANCELLATION'
    )),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    email_to TEXT NOT NULL,
    email_subject TEXT NOT NULL,
    metadata_json JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_dsr_notifications_request 
    ON dsr_notifications(dsr_request_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS FOR GRACE PERIOD
-- ════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_deletion_dates(grace_days INTEGER DEFAULT 30)
RETURNS TABLE (grace_period_ends_at TIMESTAMPTZ, scheduled_deletion_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY SELECT 
        (now() + (grace_days || ' days')::INTERVAL)::TIMESTAMPTZ,
        (now() + (grace_days || ' days')::INTERVAL + '1 day'::INTERVAL)::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ════════════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN dsr_requests.grace_period_ends_at IS 
'End of grace period during which deletion can be cancelled. Typically 30 days from request.';

COMMENT ON COLUMN dsr_requests.scheduled_deletion_at IS 
'When the actual deletion will occur. Set to 1 day after grace period ends.';

COMMENT ON TABLE dsr_rate_limits IS 
'Rate limiting for DSR requests. Typically 1 export request per user per day.';

COMMENT ON TABLE dsr_audit_log IS 
'Immutable audit trail of all DSR request actions for compliance.';
