-- ══════════════════════════════════════════════════════════════════════════════
-- SUBDOMAIN-TO-TENANT RESOLUTION MIGRATION
-- ══════════════════════════════════════════════════════════════════════════════
-- 
-- This migration adds:
-- 1. Domain configuration fields to Tenant table
-- 2. TenantDomainVerification table for custom domain verification
--
-- Supports multi-tenant access patterns:
-- - Consumer: app.aivo.ai → tenant from JWT
-- - District: springfield-schools.aivo.ai → tenant from subdomain
-- - Custom Domain: learning.springfield.edu → tenant from domain mapping
--
-- ══════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TYPE domain_verification_type AS ENUM ('TXT', 'CNAME');
CREATE TYPE domain_verification_status AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED');

-- ──────────────────────────────────────────────────────────────────────────────
-- ALTER: tenants - Add domain configuration
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "subdomain" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "customDomain" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "domain_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "domain_verified_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'us-east-1',
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "logo_url" TEXT,
  ADD COLUMN IF NOT EXISTS "primary_color" TEXT;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_tenant_subdomain ON "Tenant"("subdomain") WHERE "subdomain" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_custom_domain ON "Tenant"("customDomain") WHERE "customDomain" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_is_active ON "Tenant"("is_active");

COMMENT ON COLUMN "Tenant"."subdomain" IS 'Subdomain for district access, e.g., "springfield-schools" for springfield-schools.aivo.ai';
COMMENT ON COLUMN "Tenant"."customDomain" IS 'Custom domain for branded access, e.g., "learning.springfield.edu"';
COMMENT ON COLUMN "Tenant"."domain_verified" IS 'Whether the custom domain has been verified via DNS';
COMMENT ON COLUMN "Tenant"."domain_verified_at" IS 'Timestamp when domain was verified';
COMMENT ON COLUMN "Tenant"."region" IS 'Data residency region for compliance (e.g., us-east-1, eu-west-1)';
COMMENT ON COLUMN "Tenant"."is_active" IS 'Whether the tenant is active (for soft-delete/suspension)';
COMMENT ON COLUMN "Tenant"."logo_url" IS 'URL to tenant logo for branding';
COMMENT ON COLUMN "Tenant"."primary_color" IS 'Primary brand color hex code (e.g., #1a73e8)';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: tenant_domain_verifications
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE tenant_domain_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  
  -- DNS verification configuration
  verification_token TEXT NOT NULL,
  verification_type domain_verification_type NOT NULL,
  verification_value TEXT NOT NULL,
  
  -- Status tracking
  status domain_verification_status NOT NULL DEFAULT 'PENDING',
  last_checked TIMESTAMPTZ,
  failure_reason TEXT,
  verified_at TIMESTAMPTZ,
  
  -- Timestamps
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_tenant_domain UNIQUE (tenant_id, domain)
);

-- Indexes
CREATE INDEX idx_domain_verification_domain ON tenant_domain_verifications(domain);
CREATE INDEX idx_domain_verification_status ON tenant_domain_verifications(status);
CREATE INDEX idx_domain_verification_expires ON tenant_domain_verifications(expires_at);

COMMENT ON TABLE tenant_domain_verifications IS 'Domain verification records for custom domain DNS validation';
COMMENT ON COLUMN tenant_domain_verifications.verification_token IS 'Unique token for DNS record verification';
COMMENT ON COLUMN tenant_domain_verifications.verification_type IS 'Type of DNS record: TXT or CNAME';
COMMENT ON COLUMN tenant_domain_verifications.verification_value IS 'Expected DNS record value (e.g., _aivo-verification=<token>)';
COMMENT ON COLUMN tenant_domain_verifications.status IS 'Verification status: PENDING, VERIFIED, FAILED, EXPIRED';
COMMENT ON COLUMN tenant_domain_verifications.last_checked IS 'Last time DNS was checked for this domain';
COMMENT ON COLUMN tenant_domain_verifications.failure_reason IS 'Reason for verification failure if status is FAILED';
COMMENT ON COLUMN tenant_domain_verifications.expires_at IS 'Expiration time for pending verifications (typically 7 days)';
