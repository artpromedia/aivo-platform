-- ══════════════════════════════════════════════════════════════════════════════
-- MARKETPLACE SERVICE - INITIAL MIGRATION
-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: 20251212000000_marketplace_domain_model
-- 
-- Creates the core marketplace domain model:
--   - vendors
--   - marketplace_items
--   - marketplace_item_versions
--   - content_pack_items (for CONTENT_PACK type)
--   - embedded_tool_configs (for EMBEDDED_TOOL type)
--   - marketplace_installations
--   - marketplace_reviews
--   - marketplace_collections
--   - Audit/transition tables
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE vendor_type AS ENUM ('AIVO', 'THIRD_PARTY');

CREATE TYPE marketplace_item_type AS ENUM ('CONTENT_PACK', 'EMBEDDED_TOOL');

CREATE TYPE marketplace_subject AS ENUM (
    'ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 
    'STEM', 'SOCIAL_STUDIES', 'ARTS', 'FOREIGN_LANGUAGE', 'OTHER'
);

CREATE TYPE marketplace_grade_band AS ENUM (
    'PRE_K', 'K_2', 'G3_5', 'G6_8', 'G9_12', 'ALL_GRADES'
);

CREATE TYPE marketplace_modality AS ENUM (
    'GAME', 'DRILL', 'PROJECT', 'SEL_ACTIVITY', 'ASSESSMENT',
    'SIMULATION', 'VIDEO', 'READING', 'AUDIO', 'MIXED'
);

CREATE TYPE marketplace_version_status AS ENUM (
    'DRAFT', 'PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 
    'REJECTED', 'PUBLISHED', 'DEPRECATED'
);

CREATE TYPE installation_status AS ENUM (
    'PENDING_APPROVAL', 'ACTIVE', 'DISABLED', 'REVOKED'
);

CREATE TYPE embedded_tool_launch_type AS ENUM (
    'IFRAME_WEB', 'NATIVE_DEEPLINK', 'LTI_LIKE'
);

CREATE TYPE pricing_model AS ENUM (
    'FREE', 'FREE_TRIAL', 'PAID_PER_SEAT', 'PAID_FLAT_RATE', 'FREEMIUM', 'CUSTOM'
);

CREATE TYPE safety_certification AS ENUM (
    'AIVO_CERTIFIED', 'VENDOR_ATTESTED', 'PENDING_REVIEW', 'NOT_REVIEWED'
);

-- ══════════════════════════════════════════════════════════════════════════════
-- VENDORS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE vendors (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    type            vendor_type NOT NULL,
    contact_email   TEXT NOT NULL,
    website_url     TEXT,
    logo_url        TEXT,
    description     TEXT,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    metadata_json   JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendors_type_active ON vendors(type, is_active);
CREATE INDEX idx_vendors_verified ON vendors(is_verified);

COMMENT ON TABLE vendors IS 'Content and tool publishers in the marketplace';
COMMENT ON COLUMN vendors.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN vendors.type IS 'AIVO for first-party, THIRD_PARTY for external';
COMMENT ON COLUMN vendors.is_verified IS 'Whether vendor has been verified by Aivo';

-- ══════════════════════════════════════════════════════════════════════════════
-- MARKETPLACE ITEMS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE marketplace_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id           UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    slug                TEXT NOT NULL UNIQUE,
    item_type           marketplace_item_type NOT NULL,
    title               TEXT NOT NULL,
    short_description   TEXT NOT NULL,
    long_description    TEXT NOT NULL,
    subjects            marketplace_subject[] NOT NULL DEFAULT '{}',
    grade_bands         marketplace_grade_band[] NOT NULL DEFAULT '{}',
    modalities          marketplace_modality[] NOT NULL DEFAULT '{}',
    icon_url            TEXT,
    screenshots_json    JSONB,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
    pricing_model       pricing_model NOT NULL DEFAULT 'FREE',
    price_cents         INTEGER,
    safety_cert         safety_certification NOT NULL DEFAULT 'NOT_REVIEWED',
    metadata_json       JSONB,
    search_keywords     TEXT[] NOT NULL DEFAULT '{}',
    avg_rating          DECIMAL(3,2),
    total_installs      INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marketplace_items_vendor ON marketplace_items(vendor_id);
CREATE INDEX idx_marketplace_items_type_active ON marketplace_items(item_type, is_active);
CREATE INDEX idx_marketplace_items_active_featured ON marketplace_items(is_active, is_featured);
CREATE INDEX idx_marketplace_items_subjects ON marketplace_items USING GIN(subjects);
CREATE INDEX idx_marketplace_items_grade_bands ON marketplace_items USING GIN(grade_bands);
CREATE INDEX idx_marketplace_items_modalities ON marketplace_items USING GIN(modalities);
CREATE INDEX idx_marketplace_items_pricing ON marketplace_items(pricing_model);
CREATE INDEX idx_marketplace_items_safety ON marketplace_items(safety_cert);
CREATE INDEX idx_marketplace_items_search ON marketplace_items USING GIN(search_keywords);

COMMENT ON TABLE marketplace_items IS 'Catalog listings for content packs and embedded tools';
COMMENT ON COLUMN marketplace_items.item_type IS 'CONTENT_PACK or EMBEDDED_TOOL';
COMMENT ON COLUMN marketplace_items.subjects IS 'Array of applicable subjects';
COMMENT ON COLUMN marketplace_items.grade_bands IS 'Array of applicable grade bands';
COMMENT ON COLUMN marketplace_items.pricing_model IS 'How the item is priced';
COMMENT ON COLUMN marketplace_items.safety_cert IS 'Safety review/certification status';

-- ══════════════════════════════════════════════════════════════════════════════
-- MARKETPLACE ITEM VERSIONS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE marketplace_item_versions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marketplace_item_id     UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    version                 TEXT NOT NULL,
    status                  marketplace_version_status NOT NULL DEFAULT 'DRAFT',
    changelog               TEXT,
    review_notes            TEXT,
    submitted_by_user_id    UUID,
    reviewed_by_user_id     UUID,
    approved_by_user_id     UUID,
    submitted_at            TIMESTAMPTZ,
    reviewed_at             TIMESTAMPTZ,
    published_at            TIMESTAMPTZ,
    deprecated_at           TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(marketplace_item_id, version)
);

CREATE INDEX idx_versions_item_status ON marketplace_item_versions(marketplace_item_id, status);
CREATE INDEX idx_versions_status_published ON marketplace_item_versions(status, published_at DESC);

COMMENT ON TABLE marketplace_item_versions IS 'Versioned releases with review workflow';
COMMENT ON COLUMN marketplace_item_versions.version IS 'Semantic version string (e.g., 1.0.0)';
COMMENT ON COLUMN marketplace_item_versions.status IS 'Review workflow status';

-- ══════════════════════════════════════════════════════════════════════════════
-- VERSION STATUS TRANSITIONS (Audit Trail)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE version_status_transitions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id              UUID NOT NULL REFERENCES marketplace_item_versions(id) ON DELETE CASCADE,
    from_status             marketplace_version_status NOT NULL,
    to_status               marketplace_version_status NOT NULL,
    transitioned_by_user_id UUID NOT NULL,
    reason                  TEXT,
    transitioned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_version_transitions_version ON version_status_transitions(version_id, transitioned_at DESC);

COMMENT ON TABLE version_status_transitions IS 'Audit trail for version review workflow';

-- ══════════════════════════════════════════════════════════════════════════════
-- CONTENT PACK ITEMS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE content_pack_items (
    id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marketplace_item_version_id     UUID NOT NULL REFERENCES marketplace_item_versions(id) ON DELETE CASCADE,
    lo_version_id                   UUID NOT NULL,
    lo_id                           UUID,
    position                        INTEGER NOT NULL DEFAULT 0,
    is_highlight                    BOOLEAN NOT NULL DEFAULT FALSE,
    metadata_json                   JSONB,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(marketplace_item_version_id, lo_version_id)
);

CREATE INDEX idx_content_pack_items_version ON content_pack_items(marketplace_item_version_id, position);
CREATE INDEX idx_content_pack_items_lo ON content_pack_items(lo_version_id);

COMMENT ON TABLE content_pack_items IS 'Learning Objects included in a content pack version';
COMMENT ON COLUMN content_pack_items.lo_version_id IS 'Reference to LO version in content-svc';
COMMENT ON COLUMN content_pack_items.position IS 'Display order within the pack';

-- ══════════════════════════════════════════════════════════════════════════════
-- EMBEDDED TOOL CONFIGS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE embedded_tool_configs (
    id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marketplace_item_version_id     UUID NOT NULL UNIQUE REFERENCES marketplace_item_versions(id) ON DELETE CASCADE,
    launch_url                      TEXT NOT NULL,
    launch_type                     embedded_tool_launch_type NOT NULL,
    required_scopes                 TEXT[] NOT NULL DEFAULT '{}',
    optional_scopes                 TEXT[] NOT NULL DEFAULT '{}',
    config_schema_json              JSONB,
    default_config_json             JSONB,
    webhook_url                     TEXT,
    webhook_secret                  TEXT,
    oauth_client_id                 TEXT,
    oauth_callback_url              TEXT,
    csp_directives                  TEXT,
    sandbox_attributes              TEXT[] NOT NULL DEFAULT '{}',
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE embedded_tool_configs IS 'Configuration for embedded third-party tools';
COMMENT ON COLUMN embedded_tool_configs.launch_url IS 'URL template for launching the tool';
COMMENT ON COLUMN embedded_tool_configs.launch_type IS 'How the tool is launched (iframe, deeplink, LTI-like)';
COMMENT ON COLUMN embedded_tool_configs.required_scopes IS 'Data access scopes required by the tool';
COMMENT ON COLUMN embedded_tool_configs.config_schema_json IS 'JSON Schema for tenant-customizable settings';

-- ══════════════════════════════════════════════════════════════════════════════
-- MARKETPLACE INSTALLATIONS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE marketplace_installations (
    id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marketplace_item_id             UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE RESTRICT,
    marketplace_item_version_id     UUID NOT NULL REFERENCES marketplace_item_versions(id) ON DELETE RESTRICT,
    tenant_id                       UUID NOT NULL,
    school_id                       UUID,
    classroom_id                    UUID,
    installed_by_user_id            UUID NOT NULL,
    approved_by_user_id             UUID,
    status                          installation_status NOT NULL DEFAULT 'PENDING_APPROVAL',
    config_json                     JSONB,
    install_reason                  TEXT,
    approval_notes                  TEXT,
    installed_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at                     TIMESTAMPTZ,
    disabled_at                     TIMESTAMPTZ,
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique per scope level (tenant, school, classroom)
    UNIQUE(marketplace_item_id, tenant_id, school_id, classroom_id)
);

CREATE INDEX idx_installations_tenant ON marketplace_installations(tenant_id, status);
CREATE INDEX idx_installations_school ON marketplace_installations(school_id, status);
CREATE INDEX idx_installations_classroom ON marketplace_installations(classroom_id, status);
CREATE INDEX idx_installations_item ON marketplace_installations(marketplace_item_id, status);
CREATE INDEX idx_installations_installer ON marketplace_installations(installed_by_user_id);

COMMENT ON TABLE marketplace_installations IS 'Item installations at tenant/school/classroom level';
COMMENT ON COLUMN marketplace_installations.tenant_id IS 'Always required - the owning tenant';
COMMENT ON COLUMN marketplace_installations.school_id IS 'If set, installation is school-scoped';
COMMENT ON COLUMN marketplace_installations.classroom_id IS 'If set, installation is classroom-scoped';
COMMENT ON COLUMN marketplace_installations.status IS 'PENDING_APPROVAL → ACTIVE → DISABLED/REVOKED';

-- ══════════════════════════════════════════════════════════════════════════════
-- INSTALLATION STATUS TRANSITIONS (Audit Trail)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE installation_status_transitions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    installation_id         UUID NOT NULL REFERENCES marketplace_installations(id) ON DELETE CASCADE,
    from_status             installation_status NOT NULL,
    to_status               installation_status NOT NULL,
    transitioned_by_user_id UUID NOT NULL,
    reason                  TEXT,
    transitioned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_installation_transitions ON installation_status_transitions(installation_id, transitioned_at DESC);

COMMENT ON TABLE installation_status_transitions IS 'Audit trail for installation approvals/changes';

-- ══════════════════════════════════════════════════════════════════════════════
-- MARKETPLACE REVIEWS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE marketplace_reviews (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marketplace_item_id     UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    reviewer_user_id        UUID NOT NULL,
    reviewer_tenant_id      UUID NOT NULL,
    rating                  INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title                   TEXT,
    body                    TEXT,
    is_verified_install     BOOLEAN NOT NULL DEFAULT FALSE,
    is_approved             BOOLEAN NOT NULL DEFAULT TRUE,
    is_flagged              BOOLEAN NOT NULL DEFAULT FALSE,
    helpful_count           INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(marketplace_item_id, reviewer_user_id)
);

CREATE INDEX idx_reviews_item ON marketplace_reviews(marketplace_item_id, is_approved, rating);
CREATE INDEX idx_reviews_tenant ON marketplace_reviews(reviewer_tenant_id);

COMMENT ON TABLE marketplace_reviews IS 'User reviews and ratings';
COMMENT ON COLUMN marketplace_reviews.is_verified_install IS 'Whether reviewer has actually installed the item';

-- ══════════════════════════════════════════════════════════════════════════════
-- MARKETPLACE COLLECTIONS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE marketplace_collections (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug                TEXT NOT NULL UNIQUE,
    title               TEXT NOT NULL,
    description         TEXT,
    cover_image_url     TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    display_order       INTEGER NOT NULL DEFAULT 0,
    target_audience     TEXT[] NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_collections_active ON marketplace_collections(is_active, display_order);

COMMENT ON TABLE marketplace_collections IS 'Curated collections for discovery';

CREATE TABLE marketplace_collection_items (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id           UUID NOT NULL REFERENCES marketplace_collections(id) ON DELETE CASCADE,
    marketplace_item_id     UUID NOT NULL,
    position                INTEGER NOT NULL DEFAULT 0,
    custom_headline         TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(collection_id, marketplace_item_id)
);

CREATE INDEX idx_collection_items ON marketplace_collection_items(collection_id, position);

COMMENT ON TABLE marketplace_collection_items IS 'Items within a curated collection';

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS FOR UPDATED_AT
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_marketplace_items_updated_at
    BEFORE UPDATE ON marketplace_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_marketplace_item_versions_updated_at
    BEFORE UPDATE ON marketplace_item_versions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_embedded_tool_configs_updated_at
    BEFORE UPDATE ON embedded_tool_configs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_marketplace_installations_updated_at
    BEFORE UPDATE ON marketplace_installations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_marketplace_reviews_updated_at
    BEFORE UPDATE ON marketplace_reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_marketplace_collections_updated_at
    BEFORE UPDATE ON marketplace_collections
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGER TO UPDATE TOTAL INSTALLS COUNT
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_marketplace_item_install_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'ACTIVE' THEN
        UPDATE marketplace_items 
        SET total_installs = total_installs + 1 
        WHERE id = NEW.marketplace_item_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Transitioning TO active
        IF OLD.status != 'ACTIVE' AND NEW.status = 'ACTIVE' THEN
            UPDATE marketplace_items 
            SET total_installs = total_installs + 1 
            WHERE id = NEW.marketplace_item_id;
        -- Transitioning FROM active
        ELSIF OLD.status = 'ACTIVE' AND NEW.status != 'ACTIVE' THEN
            UPDATE marketplace_items 
            SET total_installs = GREATEST(0, total_installs - 1) 
            WHERE id = NEW.marketplace_item_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'ACTIVE' THEN
        UPDATE marketplace_items 
        SET total_installs = GREATEST(0, total_installs - 1) 
        WHERE id = OLD.marketplace_item_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_install_count
    AFTER INSERT OR UPDATE OR DELETE ON marketplace_installations
    FOR EACH ROW EXECUTE FUNCTION update_marketplace_item_install_count();

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGER TO UPDATE AVERAGE RATING
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_marketplace_item_avg_rating()
RETURNS TRIGGER AS $$
DECLARE
    item_id UUID;
BEGIN
    item_id := COALESCE(NEW.marketplace_item_id, OLD.marketplace_item_id);
    
    UPDATE marketplace_items 
    SET avg_rating = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM marketplace_reviews 
        WHERE marketplace_item_id = item_id AND is_approved = TRUE
    )
    WHERE id = item_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_avg_rating
    AFTER INSERT OR UPDATE OR DELETE ON marketplace_reviews
    FOR EACH ROW EXECUTE FUNCTION update_marketplace_item_avg_rating();

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED DATA: AIVO AS DEFAULT VENDOR
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO vendors (slug, name, type, contact_email, description, is_verified, is_active)
VALUES (
    'aivo',
    'Aivo Learning',
    'AIVO',
    'marketplace@aivolearning.com',
    'First-party content packs and tools from the Aivo team',
    TRUE,
    TRUE
);
