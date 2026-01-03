-- ============================================================================
-- AI Content Generation Schema
-- Migration: 0006_ai_content_generation.sql
--
-- Purpose:
--   1. AI generation request/response logging
--   2. Generated content storage and versioning
--   3. Feedback and grading records
--   4. Learning path persistence
--   5. Translation cache
--
-- Multi-tenancy:
--   All tables are scoped by tenant_id for data isolation
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: ai_generation_log
--
-- Detailed logging of all AI generation requests and responses.
-- Used for debugging, analytics, and cost tracking.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_generation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Generation type
    generation_type TEXT NOT NULL, -- 'lesson', 'question', 'explanation', 'feedback', etc.
    
    -- Request details
    request_payload JSONB NOT NULL,
    
    -- Response details
    response_payload JSONB NULL,
    
    -- LLM details
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    
    -- Token usage
    tokens_input INTEGER NOT NULL DEFAULT 0,
    tokens_output INTEGER NOT NULL DEFAULT 0,
    tokens_total INTEGER NOT NULL DEFAULT 0,
    
    -- Cost tracking
    cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    
    -- Performance
    latency_ms INTEGER NOT NULL DEFAULT 0,
    cached BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
    error_message TEXT NULL,
    
    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ NULL
);

COMMENT ON TABLE ai_generation_log IS 
'Detailed log of all AI content generation requests.

Used for:
- Debugging and troubleshooting
- Cost tracking and analytics
- Performance monitoring
- Audit trail';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_gen_log_tenant_user 
    ON ai_generation_log(tenant_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_gen_log_type 
    ON ai_generation_log(generation_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_gen_log_status 
    ON ai_generation_log(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_gen_log_provider_model 
    ON ai_generation_log(provider, model, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: ai_generated_lessons
--
-- Storage for AI-generated lesson content.
-- Supports versioning and editing.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_generated_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    created_by UUID NOT NULL,
    
    -- Generation log reference
    generation_log_id UUID REFERENCES ai_generation_log(id),
    
    -- Lesson metadata
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    
    -- Content
    objectives JSONB NOT NULL DEFAULT '[]',
    blocks JSONB NOT NULL DEFAULT '[]', -- Lesson content blocks
    vocabulary JSONB NOT NULL DEFAULT '[]',
    assessment_questions JSONB NOT NULL DEFAULT '[]',
    
    -- Standards alignment
    standards JSONB NOT NULL DEFAULT '[]',
    
    -- Generation settings
    generation_params JSONB NOT NULL DEFAULT '{}',
    
    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    parent_version_id UUID NULL REFERENCES ai_generated_lessons(id),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'archived'
    
    -- AI metadata
    model_used TEXT NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    
    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ NULL
);

COMMENT ON TABLE ai_generated_lessons IS 
'AI-generated lesson content with versioning support.

Content stored as JSONB blocks for flexible rendering.
Supports iteration through parent_version_id.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_lessons_tenant_user 
    ON ai_generated_lessons(tenant_id, created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_lessons_subject_topic 
    ON ai_generated_lessons(subject, topic);

CREATE INDEX IF NOT EXISTS idx_ai_lessons_status 
    ON ai_generated_lessons(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_lessons_grade 
    ON ai_generated_lessons(grade_level);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: ai_generated_questions
--
-- Storage for AI-generated assessment questions.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_generated_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    created_by UUID NOT NULL,
    
    -- Generation log reference
    generation_log_id UUID REFERENCES ai_generation_log(id),
    
    -- Parent content (optional)
    lesson_id UUID NULL REFERENCES ai_generated_lessons(id),
    
    -- Question content
    question_type TEXT NOT NULL, -- 'multipleChoice', 'shortAnswer', 'trueFalse', etc.
    question_text TEXT NOT NULL,
    
    -- Answer options (for multiple choice)
    options JSONB NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT NULL,
    
    -- Hints (progressive difficulty)
    hints JSONB NOT NULL DEFAULT '[]',
    
    -- Classification
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    skill_id TEXT NULL,
    blooms_level TEXT NOT NULL, -- 'remember', 'understand', 'apply', etc.
    difficulty INTEGER NOT NULL DEFAULT 3, -- 1-5
    
    -- Metadata
    standards JSONB NOT NULL DEFAULT '[]',
    tags JSONB NOT NULL DEFAULT '[]',
    
    -- Usage tracking
    use_count INTEGER NOT NULL DEFAULT 0,
    avg_score NUMERIC(5, 4) NULL,
    
    -- AI metadata
    model_used TEXT NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'archived', 'flagged'
    
    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_generated_questions IS 
'AI-generated assessment questions with classification and usage tracking.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_questions_tenant_user 
    ON ai_generated_questions(tenant_id, created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_questions_lesson 
    ON ai_generated_questions(lesson_id);

CREATE INDEX IF NOT EXISTS idx_ai_questions_type 
    ON ai_generated_questions(question_type);

CREATE INDEX IF NOT EXISTS idx_ai_questions_difficulty 
    ON ai_generated_questions(subject, difficulty, blooms_level);

CREATE INDEX IF NOT EXISTS idx_ai_questions_skill 
    ON ai_generated_questions(skill_id);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: ai_feedback
--
-- Storage for AI-generated feedback and grading.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    
    -- User context
    student_id UUID NOT NULL,
    graded_by_user_id UUID NULL, -- NULL if auto-graded
    
    -- Generation log reference
    generation_log_id UUID REFERENCES ai_generation_log(id),
    
    -- Submission context
    assignment_id UUID NULL,
    question_id UUID NULL REFERENCES ai_generated_questions(id),
    submission_type TEXT NOT NULL, -- 'essay', 'shortAnswer', 'code', etc.
    
    -- Original submission
    submission_content TEXT NOT NULL,
    
    -- AI feedback
    overall_score NUMERIC(5, 2) NULL, -- Percentage score (0-100)
    rubric_scores JSONB NOT NULL DEFAULT '{}', -- Per-criterion scores
    
    feedback_text TEXT NOT NULL,
    strengths JSONB NOT NULL DEFAULT '[]',
    improvements JSONB NOT NULL DEFAULT '[]',
    suggestions JSONB NOT NULL DEFAULT '[]',
    
    -- Detailed analysis
    grammar_score NUMERIC(5, 2) NULL,
    structure_score NUMERIC(5, 2) NULL,
    content_score NUMERIC(5, 2) NULL,
    
    -- AI metadata
    model_used TEXT NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.8,
    
    -- Review status
    needs_human_review BOOLEAN NOT NULL DEFAULT FALSE,
    human_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    human_adjusted_score NUMERIC(5, 2) NULL,
    
    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ NULL
);

COMMENT ON TABLE ai_feedback IS 
'AI-generated feedback and grading for student submissions.

Supports:
- Essay grading
- Short answer evaluation
- Code review
- Human review workflow';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_feedback_tenant_student 
    ON ai_feedback(tenant_id, student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_assignment 
    ON ai_feedback(assignment_id);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_review 
    ON ai_feedback(needs_human_review, human_reviewed);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: ai_learning_paths
--
-- Storage for AI-generated personalized learning paths.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    
    -- User context
    learner_id UUID NOT NULL,
    created_by UUID NOT NULL, -- Teacher or system
    
    -- Generation log reference
    generation_log_id UUID REFERENCES ai_generation_log(id),
    
    -- Path metadata
    title TEXT NOT NULL,
    description TEXT NULL,
    subject TEXT NOT NULL,
    
    -- Goal
    target_skill TEXT NULL,
    target_mastery_level NUMERIC(3, 2) NOT NULL DEFAULT 0.8,
    
    -- Path content
    path_nodes JSONB NOT NULL DEFAULT '[]', -- Array of learning steps
    milestones JSONB NOT NULL DEFAULT '[]',
    prerequisites JSONB NOT NULL DEFAULT '[]',
    
    -- Progress tracking
    current_node_index INTEGER NOT NULL DEFAULT 0,
    completed_nodes JSONB NOT NULL DEFAULT '[]',
    
    -- Timing
    estimated_hours NUMERIC(5, 2) NULL,
    actual_hours NUMERIC(5, 2) NULL,
    
    -- Adaptivity
    adaptation_history JSONB NOT NULL DEFAULT '[]', -- Track path adjustments
    
    -- AI metadata
    model_used TEXT NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'paused', 'abandoned'
    
    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL
);

COMMENT ON TABLE ai_learning_paths IS 
'AI-generated personalized learning paths for students.

Tracks progress through learning nodes and adapts based on performance.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_paths_tenant_learner 
    ON ai_learning_paths(tenant_id, learner_id, status);

CREATE INDEX IF NOT EXISTS idx_ai_paths_status 
    ON ai_learning_paths(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_paths_subject 
    ON ai_learning_paths(subject);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: ai_translations
--
-- Cache for AI-generated translations.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    
    -- Content identification
    content_type TEXT NOT NULL, -- 'lesson', 'question', 'ui', etc.
    content_id UUID NULL, -- Reference to original content
    content_hash TEXT NOT NULL, -- Hash of source content for cache lookup
    
    -- Languages
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    
    -- Content
    source_content TEXT NOT NULL,
    translated_content TEXT NOT NULL,
    
    -- Glossary (key terms)
    glossary JSONB NOT NULL DEFAULT '[]',
    
    -- AI metadata
    model_used TEXT NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    
    -- Quality
    quality_score NUMERIC(3, 2) NULL, -- Optional quality rating
    human_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NULL -- For cache invalidation
);

COMMENT ON TABLE ai_translations IS 
'Cache for AI-generated translations.

Uses content_hash for efficient cache lookup.
Supports human review workflow.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_translations_lookup 
    ON ai_translations(tenant_id, content_hash, source_language, target_language);

CREATE INDEX IF NOT EXISTS idx_ai_translations_content 
    ON ai_translations(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_ai_translations_expires 
    ON ai_translations(expires_at) 
    WHERE expires_at IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: ai_generated_images
--
-- Storage for AI-generated educational images.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    created_by UUID NOT NULL,
    
    -- Generation log reference
    generation_log_id UUID REFERENCES ai_generation_log(id),
    
    -- Image metadata
    prompt TEXT NOT NULL,
    enhanced_prompt TEXT NULL, -- AI-enhanced version
    image_type TEXT NOT NULL, -- 'diagram', 'illustration', 'chart', etc.
    
    -- Image details
    image_url TEXT NOT NULL,
    thumbnail_url TEXT NULL,
    alt_text TEXT NOT NULL,
    
    -- Dimensions
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    
    -- Educational context
    subject TEXT NOT NULL,
    topic TEXT NULL,
    grade_level TEXT NULL,
    
    -- AI metadata
    model_used TEXT NOT NULL, -- 'dall-e-3', etc.
    quality TEXT NOT NULL DEFAULT 'standard', -- 'standard', 'hd'
    style TEXT NULL, -- 'vivid', 'natural', etc.
    
    -- Cost
    cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    
    -- Usage tracking
    use_count INTEGER NOT NULL DEFAULT 0,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'archived', 'flagged'
    
    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_generated_images IS 
'AI-generated educational images with metadata.

Stores DALL-E and other AI-generated images for reuse.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_images_tenant_user 
    ON ai_generated_images(tenant_id, created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_images_type 
    ON ai_generated_images(image_type, subject);

CREATE INDEX IF NOT EXISTS idx_ai_images_status 
    ON ai_generated_images(status);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: ai_budget_configs
--
-- Per-tenant AI budget configuration.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_budget_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant isolation
    tenant_id UUID NOT NULL UNIQUE,
    
    -- Budget settings
    monthly_budget_usd NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Alert settings
    alert_thresholds JSONB NOT NULL DEFAULT '[50, 75, 90, 95, 100]',
    alert_emails JSONB NOT NULL DEFAULT '[]',
    
    -- Usage tracking
    current_month_spend_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    last_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_budget_configs IS 
'Per-tenant AI budget configuration and tracking.';

-- ────────────────────────────────────────────────────────────────────────────
-- FUNCTION: Reset monthly AI budget tracking
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION reset_monthly_ai_budgets()
RETURNS void AS $$
BEGIN
    UPDATE ai_budget_configs
    SET 
        current_month_spend_usd = 0,
        last_reset_at = now(),
        updated_at = now()
    WHERE date_trunc('month', last_reset_at) < date_trunc('month', now());
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_monthly_ai_budgets IS 
'Resets monthly AI spend tracking. Run on first day of each month.';

-- ────────────────────────────────────────────────────────────────────────────
-- TRIGGER: Update timestamps
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'ai_generated_lessons',
            'ai_generated_questions',
            'ai_learning_paths',
            'ai_translations',
            'ai_budget_configs'
        ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$;
