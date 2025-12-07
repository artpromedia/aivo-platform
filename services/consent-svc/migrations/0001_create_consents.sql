CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  learner_id TEXT NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('BASELINE_ASSESSMENT', 'AI_TUTOR', 'RESEARCH_ANALYTICS')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'GRANTED', 'REVOKED', 'EXPIRED')),
  granted_by_parent_id TEXT NULL,
  granted_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate consent records for the same learner/type within a tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_consents_unique ON consents(tenant_id, learner_id, consent_type);

CREATE INDEX IF NOT EXISTS idx_consents_tenant_learner ON consents(tenant_id, learner_id);
CREATE INDEX IF NOT EXISTS idx_consents_tenant_type ON consents(tenant_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_consents_status ON consents(status);

CREATE TABLE consent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id UUID NOT NULL REFERENCES consents(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL CHECK (previous_status IN ('PENDING', 'GRANTED', 'REVOKED', 'EXPIRED')),
  new_status TEXT NOT NULL CHECK (new_status IN ('PENDING', 'GRANTED', 'REVOKED', 'EXPIRED')),
  changed_by_user_id TEXT NULL,
  change_reason TEXT NOT NULL,
  metadata_json JSONB NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_audit_log_consent ON consent_audit_log(consent_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_log_time ON consent_audit_log(changed_at);
