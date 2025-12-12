-- ══════════════════════════════════════════════════════════════════════════════
-- SAFETY, MODERATION & POLICY GATES MIGRATION
-- ══════════════════════════════════════════════════════════════════════════════
-- 
-- This migration adds:
-- 1. Safety rating and data access profile enums
-- 2. Safety metadata fields on marketplace_item_versions
-- 3. Safety review tracking
-- 4. Tenant marketplace policies for enforcement
-- 5. Domain allowlist for embedded tools
-- 6. Tool launch audit logging
--
-- ══════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ──────────────────────────────────────────────────────────────────────────────

-- Safety rating enum for marketplace items/versions
CREATE TYPE safety_rating AS ENUM (
    'PENDING',          -- Awaiting safety review
    'APPROVED_K12',     -- Approved for K-12 use
    'RESTRICTED',       -- Approved with restrictions (e.g., high school only)
    'REJECTED'          -- Not approved for use
);

-- Data access profile enum (descriptive categorization)
CREATE TYPE data_access_profile AS ENUM (
    'MINIMAL',          -- Pseudonymous learner ID only
    'MODERATE',         -- Pseudonymous ID + progress data
    'HIGH'              -- Extended profile access (with consent)
);

-- Safety review action types
CREATE TYPE safety_review_action AS ENUM (
    'SUBMITTED',        -- Version submitted for safety review
    'STARTED',          -- Safety review started
    'DATA_TAGGED',      -- Data access categories tagged
    'CHECKS_COMPLETED', -- Automated checks completed
    'APPROVED',         -- Safety reviewer approved
    'REJECTED',         -- Safety reviewer rejected
    'ESCALATED'         -- Escalated for further review
);

-- ──────────────────────────────────────────────────────────────────────────────
-- SAFETY METADATA ON MARKETPLACE ITEM VERSIONS
-- ──────────────────────────────────────────────────────────────────────────────

-- Add safety fields to marketplace_item_versions
ALTER TABLE marketplace_item_versions
ADD COLUMN safety_rating safety_rating DEFAULT 'PENDING',
ADD COLUMN data_access_profile data_access_profile DEFAULT 'MINIMAL',
ADD COLUMN safety_notes TEXT,
ADD COLUMN policy_tags TEXT[] DEFAULT '{}',
ADD COLUMN data_categories_accessed TEXT[] DEFAULT '{}',
ADD COLUMN safety_reviewed_by_user_id UUID,
ADD COLUMN safety_reviewed_at TIMESTAMPTZ,
ADD COLUMN automated_checks_json JSONB,
ADD COLUMN automated_checks_passed BOOLEAN;

-- Index for filtering by safety rating
CREATE INDEX idx_marketplace_item_versions_safety_rating 
ON marketplace_item_versions(safety_rating);

-- Index for policy tags (GIN for array containment)
CREATE INDEX idx_marketplace_item_versions_policy_tags 
ON marketplace_item_versions USING GIN (policy_tags);

-- ──────────────────────────────────────────────────────────────────────────────
-- SAFETY REVIEW AUDIT LOG
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE safety_review_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to the version being reviewed
    marketplace_item_version_id UUID NOT NULL 
        REFERENCES marketplace_item_versions(id) ON DELETE CASCADE,
    
    -- Review action
    action safety_review_action NOT NULL,
    
    -- User who performed the action
    performed_by_user_id UUID NOT NULL,
    
    -- Previous and new values (for changes)
    previous_rating safety_rating,
    new_rating safety_rating,
    
    -- Notes/comments from reviewer
    notes TEXT,
    
    -- Detailed metadata (e.g., automated check results)
    metadata_json JSONB,
    
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_safety_review_logs_version 
ON safety_review_logs(marketplace_item_version_id, performed_at DESC);

CREATE INDEX idx_safety_review_logs_action 
ON safety_review_logs(action, performed_at DESC);

-- ──────────────────────────────────────────────────────────────────────────────
-- TENANT MARKETPLACE POLICIES
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE tenant_marketplace_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant this policy applies to
    tenant_id UUID NOT NULL UNIQUE,
    
    -- Allowed safety ratings (empty = all allowed)
    -- Example: ['APPROVED_K12'] = only K12 approved items
    allowed_safety_ratings TEXT[] DEFAULT '{"APPROVED_K12"}',
    
    -- Allowed data access profiles (empty = all allowed)
    -- Example: ['MINIMAL', 'MODERATE'] = no HIGH access tools
    allowed_data_access_profiles TEXT[] DEFAULT '{"MINIMAL", "MODERATE"}',
    
    -- Policy tags that are blocked for this tenant
    -- Example: ['NO_CHAT', 'NO_VIDEO'] = items with these tags are blocked
    blocked_policy_tags TEXT[] DEFAULT '{}',
    
    -- Policy tags that are required for this tenant
    -- Example: ['COPPA_VERIFIED'] = only items with this tag
    required_policy_tags TEXT[] DEFAULT '{}',
    
    -- Blocked vendors (by vendor ID)
    blocked_vendors UUID[] DEFAULT '{}',
    
    -- Blocked specific items (by marketplace_item ID)
    blocked_item_ids UUID[] DEFAULT '{}',
    
    -- Allowed domains for embedded tools (empty = use global allowlist)
    allowed_tool_domains TEXT[] DEFAULT '{}',
    
    -- Blocked scopes for embedded tools
    blocked_tool_scopes TEXT[] DEFAULT '{}',
    
    -- Whether to require approval for all marketplace installs
    require_install_approval BOOLEAN DEFAULT true,
    
    -- Whether to allow third-party vendors
    allow_third_party_vendors BOOLEAN DEFAULT true,
    
    -- Who created/updated this policy
    created_by_user_id UUID,
    updated_by_user_id UUID,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenant_marketplace_policies_tenant 
ON tenant_marketplace_policies(tenant_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- GLOBAL DOMAIN ALLOWLIST FOR EMBEDDED TOOLS
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE embedded_tool_domain_allowlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Domain pattern (e.g., 'mathgames.com', '*.trusted-vendor.edu')
    domain_pattern TEXT NOT NULL UNIQUE,
    
    -- Whether this domain is currently allowed
    is_active BOOLEAN DEFAULT true,
    
    -- Vendor this domain belongs to (optional)
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    
    -- Notes about this domain
    notes TEXT,
    
    -- Who approved this domain
    approved_by_user_id UUID,
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_embedded_tool_domain_allowlist_active 
ON embedded_tool_domain_allowlist(is_active, domain_pattern);

-- ──────────────────────────────────────────────────────────────────────────────
-- ALLOWED/DISALLOWED SCOPES CONFIGURATION
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE embedded_tool_scope_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Scope identifier (e.g., 'LEARNER_PROFILE_MIN', 'SESSION_EVENTS_WRITE')
    scope TEXT NOT NULL UNIQUE,
    
    -- Human-readable name
    display_name TEXT NOT NULL,
    
    -- Description of what this scope allows
    description TEXT,
    
    -- Data access level this scope implies
    data_access_level data_access_profile DEFAULT 'MINIMAL',
    
    -- Whether this scope is allowed globally
    is_allowed BOOLEAN DEFAULT true,
    
    -- Whether this scope requires explicit tenant approval
    requires_tenant_approval BOOLEAN DEFAULT false,
    
    -- Whether this scope is considered PII-sensitive
    is_pii_sensitive BOOLEAN DEFAULT false,
    
    -- Category for grouping (e.g., 'learner_data', 'analytics', 'communication')
    category TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial scope configuration
INSERT INTO embedded_tool_scope_config (scope, display_name, description, data_access_level, is_allowed, requires_tenant_approval, is_pii_sensitive, category) VALUES
-- Minimal scopes (always allowed)
('LEARNER_ID_PSEUDONYMOUS', 'Pseudonymous Learner ID', 'Access to a non-identifiable learner identifier for session tracking', 'MINIMAL', true, false, false, 'learner_data'),
('SESSION_CONTEXT', 'Session Context', 'Basic session information (grade, subject, activity type)', 'MINIMAL', true, false, false, 'session'),
('PROGRESS_WRITE', 'Write Progress', 'Ability to record learning progress and completion', 'MINIMAL', true, false, false, 'analytics'),

-- Moderate scopes (allowed, may need approval)
('LEARNER_PROFILE_MIN', 'Minimal Learner Profile', 'Grade level, learning preferences (no PII)', 'MODERATE', true, false, false, 'learner_data'),
('SESSION_EVENTS_WRITE', 'Write Session Events', 'Ability to log learning events and interactions', 'MODERATE', true, false, false, 'analytics'),
('PROGRESS_READ', 'Read Progress', 'Access to historical progress data for personalization', 'MODERATE', true, true, false, 'analytics'),

-- High access scopes (restricted)
('LEARNER_PROFILE_FULL', 'Full Learner Profile', 'Extended profile including name, grade, school', 'HIGH', true, true, true, 'learner_data'),
('COMMUNICATION_PARENT', 'Parent Communication', 'Ability to send notifications to parents', 'HIGH', true, true, true, 'communication'),

-- Disallowed scopes (never permitted)
('PII_EXPORT', 'PII Export', 'Direct export of personally identifiable information', 'HIGH', false, true, true, 'learner_data'),
('EXTERNAL_TRACKING', 'External Tracking', 'Third-party analytics and tracking', 'HIGH', false, true, true, 'analytics'),
('DIRECT_LEARNER_CONTACT', 'Direct Learner Contact', 'Direct messaging or chat with learners', 'HIGH', false, true, true, 'communication');

-- ──────────────────────────────────────────────────────────────────────────────
-- EMBEDDED TOOL LAUNCH AUDIT LOG
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE embedded_tool_launch_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session identifier for this tool launch
    tool_session_id UUID NOT NULL,
    
    -- References
    tenant_id UUID NOT NULL,
    marketplace_item_id UUID NOT NULL,
    marketplace_item_version_id UUID NOT NULL,
    installation_id UUID NOT NULL,
    
    -- Who launched the tool
    launched_by_user_id UUID NOT NULL,
    learner_id UUID,  -- If launched in learner context
    
    -- Scopes granted for this launch
    scopes_granted TEXT[] NOT NULL DEFAULT '{}',
    
    -- Launch context
    school_id UUID,
    classroom_id UUID,
    session_id UUID,  -- Learning session if applicable
    
    -- Safety state at launch time
    safety_rating_at_launch safety_rating NOT NULL,
    
    -- Launch result
    launch_successful BOOLEAN NOT NULL DEFAULT true,
    launch_error TEXT,
    
    -- Metadata
    launch_url TEXT,
    user_agent TEXT,
    ip_address INET,
    
    launched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_embedded_tool_launch_logs_tenant 
ON embedded_tool_launch_logs(tenant_id, launched_at DESC);

CREATE INDEX idx_embedded_tool_launch_logs_item 
ON embedded_tool_launch_logs(marketplace_item_id, launched_at DESC);

CREATE INDEX idx_embedded_tool_launch_logs_session 
ON embedded_tool_launch_logs(tool_session_id);

CREATE INDEX idx_embedded_tool_launch_logs_learner 
ON embedded_tool_launch_logs(learner_id, launched_at DESC);

-- ──────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ──────────────────────────────────────────────────────────────────────────────

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marketplace_policy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tenant_marketplace_policies
CREATE TRIGGER trigger_tenant_marketplace_policies_updated_at
BEFORE UPDATE ON tenant_marketplace_policies
FOR EACH ROW EXECUTE FUNCTION update_marketplace_policy_updated_at();

-- Trigger for embedded_tool_domain_allowlist
CREATE TRIGGER trigger_embedded_tool_domain_allowlist_updated_at
BEFORE UPDATE ON embedded_tool_domain_allowlist
FOR EACH ROW EXECUTE FUNCTION update_marketplace_policy_updated_at();

-- Trigger for embedded_tool_scope_config
CREATE TRIGGER trigger_embedded_tool_scope_config_updated_at
BEFORE UPDATE ON embedded_tool_scope_config
FOR EACH ROW EXECUTE FUNCTION update_marketplace_policy_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- COMMENTS
-- ──────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE tenant_marketplace_policies IS 
'Per-tenant policies for marketplace item visibility and installation restrictions';

COMMENT ON TABLE embedded_tool_domain_allowlist IS 
'Global allowlist of approved domains for embedded tool launch URLs';

COMMENT ON TABLE embedded_tool_scope_config IS 
'Configuration and metadata for embedded tool data scopes';

COMMENT ON TABLE embedded_tool_launch_logs IS 
'Audit log of all embedded tool launches for compliance and debugging';

COMMENT ON TABLE safety_review_logs IS 
'Audit trail of safety review actions on marketplace item versions';

COMMENT ON COLUMN marketplace_item_versions.safety_rating IS 
'Safety classification: PENDING (awaiting review), APPROVED_K12 (safe for all K-12), RESTRICTED (limited use), REJECTED (not approved)';

COMMENT ON COLUMN marketplace_item_versions.data_access_profile IS 
'Categorization of data access: MINIMAL (pseudonymous only), MODERATE (progress data), HIGH (extended profile)';

COMMENT ON COLUMN marketplace_item_versions.policy_tags IS 
'Tags describing content/feature policies, e.g., NO_CHAT, NO_VIDEO, NO_USER_GENERATED_CONTENT';
