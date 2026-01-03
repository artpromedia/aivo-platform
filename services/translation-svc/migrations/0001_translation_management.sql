-- Translation Management System Migration
-- Comprehensive tables for translation storage, memory, and workflow

-- ============================================
-- Translation Entries Table
-- ============================================
CREATE TABLE translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL,
    locale VARCHAR(10) NOT NULL,
    namespace VARCHAR(50) NOT NULL DEFAULT 'common',
    value TEXT NOT NULL,
    context TEXT,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    plural_form VARCHAR(20),
    max_length INTEGER,
    screenshot_url TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    CONSTRAINT translations_status_check CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'published')),
    CONSTRAINT translations_source_check CHECK (source IN ('manual', 'machine', 'imported', 'memory')),
    CONSTRAINT translations_unique_key UNIQUE (locale, namespace, key)
);

-- Indexes for translations
CREATE INDEX idx_translations_locale ON translations(locale);
CREATE INDEX idx_translations_namespace ON translations(namespace);
CREATE INDEX idx_translations_status ON translations(status);
CREATE INDEX idx_translations_locale_namespace ON translations(locale, namespace);
CREATE INDEX idx_translations_key ON translations(key);
CREATE INDEX idx_translations_updated_at ON translations(updated_at);

-- Enable row-level security
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Translation History Table
-- ============================================
CREATE TABLE translation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    translation_id UUID NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
    previous_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_reason TEXT
);

-- Index for history lookups
CREATE INDEX idx_translation_history_translation_id ON translation_history(translation_id);
CREATE INDEX idx_translation_history_changed_at ON translation_history(changed_at);

-- ============================================
-- Translation Memory Table
-- ============================================
CREATE TABLE translation_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_locale VARCHAR(10) NOT NULL,
    source_text TEXT NOT NULL,
    target_locale VARCHAR(10) NOT NULL,
    target_text TEXT NOT NULL,
    context TEXT,
    quality INTEGER NOT NULL DEFAULT 70,
    usage_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT tm_quality_check CHECK (quality >= 0 AND quality <= 100)
);

-- Indexes for translation memory
CREATE INDEX idx_tm_source_locale ON translation_memory(source_locale);
CREATE INDEX idx_tm_target_locale ON translation_memory(target_locale);
CREATE INDEX idx_tm_source_text ON translation_memory USING gin(to_tsvector('simple', source_text));
CREATE INDEX idx_tm_locale_pair ON translation_memory(source_locale, target_locale);
CREATE INDEX idx_tm_quality ON translation_memory(quality);

-- Unique constraint for exact matches
CREATE UNIQUE INDEX idx_tm_unique_entry ON translation_memory(
    source_locale, 
    target_locale, 
    md5(source_text), 
    md5(COALESCE(context, ''))
);

-- ============================================
-- Glossary Terms Table
-- ============================================
CREATE TABLE glossary_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term VARCHAR(255) NOT NULL,
    base_locale VARCHAR(10) NOT NULL DEFAULT 'en',
    definition TEXT NOT NULL,
    category VARCHAR(100),
    do_not_translate BOOLEAN NOT NULL DEFAULT FALSE,
    case_sensitive BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Index for glossary
CREATE INDEX idx_glossary_term ON glossary_terms(term);
CREATE INDEX idx_glossary_category ON glossary_terms(category);
CREATE INDEX idx_glossary_term_search ON glossary_terms USING gin(to_tsvector('simple', term));

-- ============================================
-- Glossary Translations Table
-- ============================================
CREATE TABLE glossary_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID NOT NULL REFERENCES glossary_terms(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    translation VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT glossary_trans_unique UNIQUE (term_id, locale)
);

-- Index for glossary translations
CREATE INDEX idx_glossary_trans_term_id ON glossary_translations(term_id);
CREATE INDEX idx_glossary_trans_locale ON glossary_translations(locale);

-- ============================================
-- Translation Requests Table
-- ============================================
CREATE TABLE translation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_locale VARCHAR(10) NOT NULL,
    target_locales VARCHAR(10)[] NOT NULL,
    namespace VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority VARCHAR(10) NOT NULL DEFAULT 'normal',
    requested_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    
    CONSTRAINT tr_status_check CHECK (status IN ('pending', 'in_progress', 'review', 'completed', 'cancelled')),
    CONSTRAINT tr_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Index for translation requests
CREATE INDEX idx_tr_status ON translation_requests(status);
CREATE INDEX idx_tr_assigned_to ON translation_requests(assigned_to);
CREATE INDEX idx_tr_due_date ON translation_requests(due_date);

-- ============================================
-- Translation Request Entries Table
-- ============================================
CREATE TABLE translation_request_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES translation_requests(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    source_text TEXT NOT NULL,
    context TEXT,
    max_length INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for request entries
CREATE INDEX idx_tre_request_id ON translation_request_entries(request_id);

-- ============================================
-- Translation Request Entry Translations Table
-- ============================================
CREATE TABLE translation_request_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES translation_request_entries(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    translated_text TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    translator_id UUID REFERENCES users(id),
    translated_at TIMESTAMPTZ,
    reviewer_id UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    CONSTRAINT trt_status_check CHECK (status IN ('pending', 'translated', 'approved', 'rejected')),
    CONSTRAINT trt_unique UNIQUE (entry_id, locale)
);

-- Index for translations
CREATE INDEX idx_trt_entry_id ON translation_request_translations(entry_id);
CREATE INDEX idx_trt_locale ON translation_request_translations(locale);
CREATE INDEX idx_trt_status ON translation_request_translations(status);

-- ============================================
-- Translation Bundles Table (Cached bundles)
-- ============================================
CREATE TABLE translation_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale VARCHAR(10) NOT NULL,
    namespace VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    hash VARCHAR(64) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    CONSTRAINT tb_unique UNIQUE (locale, namespace)
);

-- Index for bundles
CREATE INDEX idx_tb_locale_namespace ON translation_bundles(locale, namespace);
CREATE INDEX idx_tb_hash ON translation_bundles(hash);

-- ============================================
-- Translation Quality Metrics Table
-- ============================================
CREATE TABLE translation_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    translation_id UUID NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    details JSONB,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evaluated_by VARCHAR(50) -- 'ai', 'human', 'automated'
);

-- Index for quality metrics
CREATE INDEX idx_tqm_translation_id ON translation_quality_metrics(translation_id);
CREATE INDEX idx_tqm_metric_type ON translation_quality_metrics(metric_type);

-- ============================================
-- Translation Comments Table
-- ============================================
CREATE TABLE translation_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    translation_id UUID NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    parent_id UUID REFERENCES translation_comments(id),
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for comments
CREATE INDEX idx_tc_translation_id ON translation_comments(translation_id);
CREATE INDEX idx_tc_parent_id ON translation_comments(parent_id);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_translations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER translations_updated
    BEFORE UPDATE ON translations
    FOR EACH ROW
    EXECUTE FUNCTION update_translations_timestamp();

-- History tracking trigger
CREATE OR REPLACE FUNCTION track_translation_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.value <> NEW.value OR OLD.status <> NEW.status THEN
        INSERT INTO translation_history (
            translation_id,
            previous_value,
            new_value,
            previous_status,
            new_status,
            changed_by
        ) VALUES (
            OLD.id,
            OLD.value,
            NEW.value,
            OLD.status,
            NEW.status,
            NEW.updated_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER translations_history
    AFTER UPDATE ON translations
    FOR EACH ROW
    EXECUTE FUNCTION track_translation_history();

-- Increment translation memory usage
CREATE OR REPLACE FUNCTION increment_tm_usage(tm_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE translation_memory
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = tm_id;
END;
$$ LANGUAGE plpgsql;

-- Get translation completion stats
CREATE OR REPLACE FUNCTION get_translation_stats(
    p_namespace VARCHAR(50) DEFAULT NULL,
    p_source_locale VARCHAR(10) DEFAULT 'en'
)
RETURNS TABLE (
    locale VARCHAR(10),
    total_keys BIGINT,
    translated_keys BIGINT,
    approved_keys BIGINT,
    completion_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH source_keys AS (
        SELECT DISTINCT key
        FROM translations
        WHERE locale = p_source_locale
        AND (p_namespace IS NULL OR namespace = p_namespace)
        AND status = 'published'
    ),
    locale_stats AS (
        SELECT 
            t.locale,
            COUNT(DISTINCT CASE WHEN t.status IN ('approved', 'published') THEN t.key END) as translated,
            COUNT(DISTINCT CASE WHEN t.status = 'published' THEN t.key END) as approved
        FROM translations t
        WHERE t.locale <> p_source_locale
        AND (p_namespace IS NULL OR t.namespace = p_namespace)
        GROUP BY t.locale
    )
    SELECT 
        ls.locale,
        (SELECT COUNT(*) FROM source_keys) as total_keys,
        ls.translated,
        ls.approved,
        CASE 
            WHEN (SELECT COUNT(*) FROM source_keys) > 0 
            THEN ROUND(ls.translated::DECIMAL / (SELECT COUNT(*) FROM source_keys) * 100, 2)
            ELSE 0
        END as completion_percentage
    FROM locale_stats ls
    ORDER BY ls.locale;
END;
$$ LANGUAGE plpgsql;
