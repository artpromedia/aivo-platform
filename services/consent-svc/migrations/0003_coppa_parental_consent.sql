-- Migration: 0003_coppa_parental_consent
-- Description: COPPA parental consent flow with verifiable consent methods
-- Adds tables for consent links, verification methods, and enhanced audit trails

-- ════════════════════════════════════════════════════════════════════════════════
-- PARENTAL CONSENT LINKS TABLE
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS parental_consent_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    learner_id TEXT NOT NULL,
    parent_email TEXT NOT NULL,
    
    -- The specific consent being requested
    consent_id UUID NOT NULL REFERENCES consents(id) ON DELETE CASCADE,
    
    -- Secure token for email link (hashed for storage)
    token_hash TEXT NOT NULL UNIQUE,
    
    -- Link lifecycle
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    
    -- Tracking
    resend_count INTEGER NOT NULL DEFAULT 0,
    last_resend_at TIMESTAMPTZ NULL,
    
    -- IP of requester (for audit)
    requested_by_ip TEXT NULL,
    requested_by_user_agent TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_parental_consent_links_token 
    ON parental_consent_links(token_hash);

CREATE INDEX IF NOT EXISTS idx_parental_consent_links_consent 
    ON parental_consent_links(consent_id);

CREATE INDEX IF NOT EXISTS idx_parental_consent_links_expires 
    ON parental_consent_links(expires_at) WHERE used_at IS NULL;

-- ════════════════════════════════════════════════════════════════════════════════
-- VERIFIABLE CONSENT METHODS TABLE
-- ════════════════════════════════════════════════════════════════════════════════
-- Stores evidence of COPPA-compliant parental verification

CREATE TABLE IF NOT EXISTS consent_verification_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consent_id UUID NOT NULL REFERENCES consents(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    parent_user_id TEXT NOT NULL,
    
    -- Verification method type
    method_type TEXT NOT NULL CHECK (method_type IN (
        'CREDIT_CARD_MICRO_CHARGE',
        'SIGNED_CONSENT_FORM',
        'VIDEO_CALL',
        'KNOWLEDGE_BASED_AUTH',
        'GOVERNMENT_ID',
        'FACE_MATCH'
    )),
    
    -- Verification status
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'VERIFIED',
        'FAILED',
        'EXPIRED'
    )),
    
    -- Evidence storage (no PII, only references)
    -- For credit card: last4, tokenized reference, charge ID
    -- For signed form: document hash, storage URI
    -- For video call: call ID, verification agent
    evidence_json JSONB NOT NULL,
    
    -- Timestamps
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NULL,
    
    -- Audit metadata
    ip_address TEXT NULL,
    user_agent TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_consent_verification_consent 
    ON consent_verification_methods(consent_id);

CREATE INDEX IF NOT EXISTS idx_consent_verification_tenant_parent 
    ON consent_verification_methods(tenant_id, parent_user_id);

CREATE INDEX IF NOT EXISTS idx_consent_verification_status 
    ON consent_verification_methods(status);

-- ════════════════════════════════════════════════════════════════════════════════
-- ENHANCED CONSENT AUDIT LOG
-- ════════════════════════════════════════════════════════════════════════════════
-- Add network-level audit fields for compliance

ALTER TABLE consent_audit_log 
    ADD COLUMN IF NOT EXISTS ip_address TEXT NULL,
    ADD COLUMN IF NOT EXISTS user_agent TEXT NULL,
    ADD COLUMN IF NOT EXISTS verification_method_id UUID NULL 
        REFERENCES consent_verification_methods(id) ON DELETE SET NULL;

-- ════════════════════════════════════════════════════════════════════════════════
-- CONSENT GATING CACHE TABLE
-- ════════════════════════════════════════════════════════════════════════════════
-- Materialized view-like table for fast consent checks

CREATE TABLE IF NOT EXISTS consent_status_cache (
    tenant_id TEXT NOT NULL,
    learner_id TEXT NOT NULL,
    consent_type TEXT NOT NULL,
    status TEXT NOT NULL,
    granted_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    PRIMARY KEY (tenant_id, learner_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_consent_cache_tenant_learner 
    ON consent_status_cache(tenant_id, learner_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- COPPA AGE THRESHOLD SETTINGS
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tenant_coppa_settings (
    tenant_id TEXT PRIMARY KEY,
    coppa_age_threshold INTEGER NOT NULL DEFAULT 13,
    require_verifiable_consent BOOLEAN NOT NULL DEFAULT true,
    allowed_verification_methods TEXT[] NOT NULL DEFAULT ARRAY['CREDIT_CARD_MICRO_CHARGE', 'SIGNED_CONSENT_FORM'],
    consent_link_expiry_hours INTEGER NOT NULL DEFAULT 72,
    max_resend_attempts INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- TRIGGER: Update consent_status_cache on consent changes
-- ════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sync_consent_status_cache()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO consent_status_cache (
        tenant_id, learner_id, consent_type, status, granted_at, expires_at, updated_at
    )
    VALUES (
        NEW.tenant_id, NEW.learner_id, NEW.consent_type, NEW.status, NEW.granted_at, NEW.expires_at, now()
    )
    ON CONFLICT (tenant_id, learner_id, consent_type)
    DO UPDATE SET
        status = EXCLUDED.status,
        granted_at = EXCLUDED.granted_at,
        expires_at = EXCLUDED.expires_at,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_consent_cache ON consents;
CREATE TRIGGER trg_sync_consent_cache
    AFTER INSERT OR UPDATE ON consents
    FOR EACH ROW
    EXECUTE FUNCTION sync_consent_status_cache();

-- ════════════════════════════════════════════════════════════════════════════════
-- ADD NEW CONSENT TYPES
-- ════════════════════════════════════════════════════════════════════════════════

ALTER TABLE consents DROP CONSTRAINT IF EXISTS consents_consent_type_check;
ALTER TABLE consents ADD CONSTRAINT consents_consent_type_check 
    CHECK (consent_type IN (
        'BASELINE_ASSESSMENT',
        'DATA_PROCESSING',
        'RESEARCH',
        'AI_TUTOR',
        'AI_PERSONALIZATION',
        'MARKETING',
        'THIRD_PARTY_SHARING',
        'BIOMETRIC_DATA',
        'VOICE_RECORDING'
    ));

-- Update consent_logs too
ALTER TABLE consent_logs DROP CONSTRAINT IF EXISTS consent_logs_consent_type_check;
ALTER TABLE consent_logs ADD CONSTRAINT consent_logs_consent_type_check 
    CHECK (consent_type IN (
        'BASELINE_ASSESSMENT',
        'DATA_PROCESSING',
        'RESEARCH',
        'AI_TUTOR',
        'AI_PERSONALIZATION',
        'MARKETING',
        'THIRD_PARTY_SHARING',
        'BIOMETRIC_DATA',
        'VOICE_RECORDING'
    ));

-- ════════════════════════════════════════════════════════════════════════════════
-- COMMENTS FOR DOCUMENTATION
-- ════════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE parental_consent_links IS 
'Secure links sent to parents for COPPA consent. Links expire after configurable period (default 72 hours).';

COMMENT ON TABLE consent_verification_methods IS 
'COPPA-compliant verification evidence. Stores only tokenized/hashed references, never raw PII like full card numbers.';

COMMENT ON COLUMN consent_verification_methods.evidence_json IS 
'JSON evidence blob. For credit cards: {last4, chargeId, tokenRef}. For forms: {documentHash, storageUri}. For video: {callId, agentId}.';

COMMENT ON TABLE consent_status_cache IS 
'Denormalized consent status for fast API gateway lookups. Updated via trigger on consents table.';

COMMENT ON TABLE tenant_coppa_settings IS 
'Per-tenant COPPA configuration. Allows customization of age thresholds and verification requirements.';
