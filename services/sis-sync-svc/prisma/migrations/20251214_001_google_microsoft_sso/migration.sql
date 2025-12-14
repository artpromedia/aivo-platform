-- ═══════════════════════════════════════════════════════════════════════════════
-- EPIC 12: District-grade SIS/SSO & Rostering Integrations
-- Migration: Add Google Workspace, Microsoft Entra ID support + External ID Mappings
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────
-- EXTEND SIS PROVIDER TYPE ENUM
-- ─────────────────────────────────────────────────────────────────────────────────

-- Add new provider types for Google and Microsoft
ALTER TYPE "SisProviderType" ADD VALUE IF NOT EXISTS 'GOOGLE_WORKSPACE';
ALTER TYPE "SisProviderType" ADD VALUE IF NOT EXISTS 'MICROSOFT_ENTRA';

-- ─────────────────────────────────────────────────────────────────────────────────
-- INTEGRATION STATUS ENUM
-- ─────────────────────────────────────────────────────────────────────────────────

CREATE TYPE integration_status AS ENUM (
  'DISCONNECTED',    -- No OAuth tokens, not connected
  'CONNECTING',      -- OAuth flow in progress
  'CONNECTED',       -- Successfully connected, ready to sync
  'ERROR',           -- Connection error (token expired, revoked, etc.)
  'SUSPENDED'        -- Manually suspended by admin
);

-- ─────────────────────────────────────────────────────────────────────────────────
-- ADD NEW COLUMNS TO SIS_PROVIDERS
-- ─────────────────────────────────────────────────────────────────────────────────

-- Integration status for OAuth-based providers
ALTER TABLE sis_providers
ADD COLUMN IF NOT EXISTS integration_status integration_status DEFAULT 'DISCONNECTED';

-- Reference to secrets in Vault/KMS (OAuth tokens, client secrets)
ALTER TABLE sis_providers
ADD COLUMN IF NOT EXISTS secrets_ref VARCHAR(512);

-- SSO configuration: link to IdpConfig in auth-svc for unified login
ALTER TABLE sis_providers
ADD COLUMN IF NOT EXISTS sso_enabled BOOLEAN DEFAULT false;

-- Domain filter: only sync users from these email domains
ALTER TABLE sis_providers
ADD COLUMN IF NOT EXISTS domain_filter TEXT[];

-- Auto-provisioning settings
ALTER TABLE sis_providers
ADD COLUMN IF NOT EXISTS auto_provision_users BOOLEAN DEFAULT false;
ALTER TABLE sis_providers
ADD COLUMN IF NOT EXISTS auto_provision_learners BOOLEAN DEFAULT false;
ALTER TABLE sis_providers
ADD COLUMN IF NOT EXISTS default_role VARCHAR(50) DEFAULT 'TEACHER';

-- OAuth metadata (stored encrypted or minimal non-sensitive data)
ALTER TABLE sis_providers
ADD COLUMN IF NOT EXISTS oauth_metadata JSONB;

-- Last connection check timestamp
ALTER TABLE sis_providers
ADD COLUMN IF NOT EXISTS last_connection_check TIMESTAMPTZ;
ALTER TABLE sis_providers
ADD COLUMN IF NOT EXISTS connection_error TEXT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- EXTERNAL ID MAPPING TABLES
-- Map external SIS identities to Aivo canonical entities
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────
-- EXTERNAL SCHOOL MAPPING
-- ─────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS external_school_mappings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  provider_id       VARCHAR(255) NOT NULL,
  
  -- External identifier from the SIS provider
  external_school_id VARCHAR(512) NOT NULL,
  
  -- Aivo internal School ID (FK to tenant-svc)
  aivo_school_id    UUID NOT NULL,
  
  -- Additional metadata from provider
  external_name     TEXT,
  external_metadata JSONB,
  
  -- Sync tracking
  first_synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_run_id  VARCHAR(255),
  
  -- Audit
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one external school maps to one Aivo school per provider
  CONSTRAINT uq_ext_school_provider_external 
    UNIQUE (tenant_id, provider_id, external_school_id),
  CONSTRAINT uq_ext_school_aivo 
    UNIQUE (tenant_id, provider_id, aivo_school_id)
);

CREATE INDEX IF NOT EXISTS idx_ext_school_tenant ON external_school_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ext_school_provider ON external_school_mappings(provider_id);
CREATE INDEX IF NOT EXISTS idx_ext_school_external_id ON external_school_mappings(external_school_id);
CREATE INDEX IF NOT EXISTS idx_ext_school_aivo_id ON external_school_mappings(aivo_school_id);

COMMENT ON TABLE external_school_mappings IS 'Maps external SIS school IDs to Aivo School entities';

-- ─────────────────────────────────────────────────────────────────────────────────
-- EXTERNAL CLASS/SECTION MAPPING
-- ─────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS external_class_mappings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  provider_id         VARCHAR(255) NOT NULL,
  
  -- External identifier from the SIS provider
  external_class_id   VARCHAR(512) NOT NULL,
  
  -- Aivo internal Classroom ID (FK to tenant-svc)
  aivo_classroom_id   UUID NOT NULL,
  
  -- Link to school mapping
  external_school_id  VARCHAR(512),
  
  -- Additional metadata from provider
  external_name       TEXT,
  external_metadata   JSONB,
  
  -- Sync tracking
  first_synced_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_run_id    VARCHAR(255),
  
  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint
  CONSTRAINT uq_ext_class_provider_external 
    UNIQUE (tenant_id, provider_id, external_class_id),
  CONSTRAINT uq_ext_class_aivo 
    UNIQUE (tenant_id, provider_id, aivo_classroom_id)
);

CREATE INDEX IF NOT EXISTS idx_ext_class_tenant ON external_class_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ext_class_provider ON external_class_mappings(provider_id);
CREATE INDEX IF NOT EXISTS idx_ext_class_external_id ON external_class_mappings(external_class_id);
CREATE INDEX IF NOT EXISTS idx_ext_class_aivo_id ON external_class_mappings(aivo_classroom_id);
CREATE INDEX IF NOT EXISTS idx_ext_class_school ON external_class_mappings(external_school_id);

COMMENT ON TABLE external_class_mappings IS 'Maps external SIS class/section IDs to Aivo Classroom entities';

-- ─────────────────────────────────────────────────────────────────────────────────
-- EXTERNAL USER MAPPING
-- ─────────────────────────────────────────────────────────────────────────────────

CREATE TYPE external_user_role_hint AS ENUM (
  'STUDENT',
  'TEACHER',
  'ADMINISTRATOR',
  'AIDE',
  'PARENT',
  'GUARDIAN',
  'OTHER'
);

CREATE TABLE IF NOT EXISTS external_user_mappings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  provider_id       VARCHAR(255) NOT NULL,
  
  -- External identifier from the SIS provider
  external_user_id  VARCHAR(512) NOT NULL,
  
  -- Aivo internal User ID (FK to auth-svc)
  aivo_user_id      UUID NOT NULL,
  
  -- Role hint from the SIS provider
  role_hint         external_user_role_hint NOT NULL,
  
  -- For students, link to Learner record
  aivo_learner_id   UUID,
  
  -- External identifiers for cross-referencing
  external_email    VARCHAR(512),
  external_username VARCHAR(255),
  student_number    VARCHAR(100),
  staff_id          VARCHAR(100),
  
  -- Additional metadata from provider
  external_name     TEXT,
  external_metadata JSONB,
  
  -- Sync tracking
  first_synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_run_id  VARCHAR(255),
  
  -- Conflict tracking
  has_conflict      BOOLEAN DEFAULT false,
  conflict_type     VARCHAR(100),
  conflict_details  JSONB,
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID,
  
  -- Audit
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one external user maps to one Aivo user per provider
  CONSTRAINT uq_ext_user_provider_external 
    UNIQUE (tenant_id, provider_id, external_user_id)
);

-- Note: We don't enforce unique (tenant_id, provider_id, aivo_user_id) because
-- a user might exist in multiple providers with different external IDs

CREATE INDEX IF NOT EXISTS idx_ext_user_tenant ON external_user_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ext_user_provider ON external_user_mappings(provider_id);
CREATE INDEX IF NOT EXISTS idx_ext_user_external_id ON external_user_mappings(external_user_id);
CREATE INDEX IF NOT EXISTS idx_ext_user_aivo_id ON external_user_mappings(aivo_user_id);
CREATE INDEX IF NOT EXISTS idx_ext_user_email ON external_user_mappings(external_email);
CREATE INDEX IF NOT EXISTS idx_ext_user_role ON external_user_mappings(role_hint);
CREATE INDEX IF NOT EXISTS idx_ext_user_conflict ON external_user_mappings(has_conflict) WHERE has_conflict = true;
CREATE INDEX IF NOT EXISTS idx_ext_user_learner ON external_user_mappings(aivo_learner_id) WHERE aivo_learner_id IS NOT NULL;

COMMENT ON TABLE external_user_mappings IS 'Maps external SIS user IDs to Aivo User entities';

-- ─────────────────────────────────────────────────────────────────────────────────
-- EXTERNAL ENROLLMENT MAPPING
-- ─────────────────────────────────────────────────────────────────────────────────

CREATE TYPE external_enrollment_role AS ENUM (
  'STUDENT',
  'TEACHER',
  'AIDE'
);

CREATE TABLE IF NOT EXISTS external_enrollment_mappings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  provider_id           VARCHAR(255) NOT NULL,
  
  -- External identifiers
  external_enrollment_id VARCHAR(512),
  external_user_id       VARCHAR(512) NOT NULL,
  external_class_id      VARCHAR(512) NOT NULL,
  
  -- Role in the enrollment
  enrollment_role        external_enrollment_role NOT NULL,
  
  -- Aivo internal IDs after mapping
  aivo_user_id          UUID,
  aivo_classroom_id     UUID,
  
  -- Enrollment details
  is_primary            BOOLEAN DEFAULT true,
  start_date            DATE,
  end_date              DATE,
  
  -- Additional metadata
  external_metadata     JSONB,
  
  -- Status
  is_active             BOOLEAN DEFAULT true,
  
  -- Sync tracking
  first_synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_run_id      VARCHAR(255),
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint
  CONSTRAINT uq_ext_enroll_provider_user_class 
    UNIQUE (tenant_id, provider_id, external_user_id, external_class_id)
);

CREATE INDEX IF NOT EXISTS idx_ext_enroll_tenant ON external_enrollment_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ext_enroll_provider ON external_enrollment_mappings(provider_id);
CREATE INDEX IF NOT EXISTS idx_ext_enroll_user ON external_enrollment_mappings(external_user_id);
CREATE INDEX IF NOT EXISTS idx_ext_enroll_class ON external_enrollment_mappings(external_class_id);
CREATE INDEX IF NOT EXISTS idx_ext_enroll_role ON external_enrollment_mappings(enrollment_role);
CREATE INDEX IF NOT EXISTS idx_ext_enroll_active ON external_enrollment_mappings(is_active) WHERE is_active = true;

COMMENT ON TABLE external_enrollment_mappings IS 'Maps external SIS enrollment records to Aivo entities';

-- ═══════════════════════════════════════════════════════════════════════════════
-- IDENTITY CONFLICT LOG
-- Track and audit identity mapping conflicts for admin resolution
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TYPE identity_conflict_type AS ENUM (
  'EMAIL_MISMATCH',         -- Same external ID, different email
  'DUPLICATE_EMAIL',        -- Same email, different external IDs
  'NAME_MISMATCH',          -- Same ID, significantly different name
  'ROLE_CONFLICT',          -- User appears with conflicting roles
  'MULTI_TENANT',           -- User exists in multiple tenants
  'ORPHANED_MAPPING',       -- Mapping exists but Aivo entity deleted
  'MERGE_CANDIDATE'         -- Potential duplicate users to merge
);

CREATE TYPE identity_conflict_status AS ENUM (
  'OPEN',
  'INVESTIGATING',
  'RESOLVED_MERGED',
  'RESOLVED_KEPT_SEPARATE',
  'RESOLVED_MANUAL',
  'DISMISSED'
);

CREATE TABLE IF NOT EXISTS identity_conflicts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  provider_id         VARCHAR(255) NOT NULL,
  sync_run_id         VARCHAR(255),
  
  -- Conflict details
  conflict_type       identity_conflict_type NOT NULL,
  status              identity_conflict_status NOT NULL DEFAULT 'OPEN',
  severity            VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  
  -- The entities involved
  external_id_1       VARCHAR(512),
  external_id_2       VARCHAR(512),
  aivo_user_id_1      UUID,
  aivo_user_id_2      UUID,
  
  -- Human-readable description
  description         TEXT NOT NULL,
  details_json        JSONB,
  
  -- Resolution
  resolution_action   TEXT,
  resolved_by_user_id UUID,
  resolved_at         TIMESTAMPTZ,
  resolution_notes    TEXT,
  
  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conflict_tenant ON identity_conflicts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conflict_provider ON identity_conflicts(provider_id);
CREATE INDEX IF NOT EXISTS idx_conflict_status ON identity_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_conflict_type ON identity_conflicts(conflict_type);
CREATE INDEX IF NOT EXISTS idx_conflict_open ON identity_conflicts(tenant_id, status) WHERE status = 'OPEN';

COMMENT ON TABLE identity_conflicts IS 'Audit log of identity mapping conflicts for admin resolution';

-- ═══════════════════════════════════════════════════════════════════════════════
-- OAUTH STATE TABLE
-- Secure storage for OAuth flow state (CSRF protection)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS oauth_state (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_token     VARCHAR(255) NOT NULL UNIQUE,
  tenant_id       UUID NOT NULL,
  provider_id     VARCHAR(255),
  provider_type   VARCHAR(50) NOT NULL,
  
  -- OAuth PKCE parameters
  code_verifier   VARCHAR(255),
  
  -- Where to redirect after OAuth
  redirect_uri    TEXT,
  
  -- Anti-CSRF nonce
  nonce           VARCHAR(255),
  
  -- Initiating user (if authenticated)
  initiated_by    UUID,
  
  -- Expiry (short-lived, ~10 minutes)
  expires_at      TIMESTAMPTZ NOT NULL,
  
  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_state_token ON oauth_state(state_token);
CREATE INDEX IF NOT EXISTS idx_oauth_state_expires ON oauth_state(expires_at);

-- Auto-cleanup expired state
CREATE INDEX IF NOT EXISTS idx_oauth_state_cleanup ON oauth_state(expires_at) WHERE expires_at < NOW();

COMMENT ON TABLE oauth_state IS 'Temporary storage for OAuth flow state parameters';

-- ═══════════════════════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ext_school_mappings_updated_at
    BEFORE UPDATE ON external_school_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ext_class_mappings_updated_at
    BEFORE UPDATE ON external_class_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ext_user_mappings_updated_at
    BEFORE UPDATE ON external_user_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ext_enrollment_mappings_updated_at
    BEFORE UPDATE ON external_enrollment_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_identity_conflicts_updated_at
    BEFORE UPDATE ON identity_conflicts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
