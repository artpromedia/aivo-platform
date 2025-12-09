-- Migration: Learning Objects Data Model
-- Version: 20251209_001
-- Description: Versioned, reviewable Learning Object model with skill alignment,
--              accessibility metadata, and publication workflow.
--
-- Design Philosophy:
-- - Learning Objects (LOs) are logical content identities
-- - Versions contain actual content and move through review workflow
-- - Only one PUBLISHED version per LO per tenant at a time
-- - Supports both global (tenant_id NULL) and tenant-specific content
-- - Skill alignment connects to Virtual Brain for content selection
--
-- Integration Points:
-- - Skills: primary_skill_id and learning_object_skills for alignment
-- - Sessions: Published versions used in learning sessions
-- - Ingestion: metadata_json supports external content IDs
--
-- ══════════════════════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ══════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ══════════════════════════════════════════════════════════════════════════════

-- Subject areas
CREATE TYPE learning_object_subject AS ENUM (
  'ELA',
  'MATH',
  'SCIENCE',
  'SEL',
  'SPEECH',
  'OTHER'
);

COMMENT ON TYPE learning_object_subject IS 'Subject area classification for learning objects.';

-- Grade bands
CREATE TYPE learning_object_grade_band AS ENUM (
  'K_2',    -- Kindergarten - 2nd grade
  'G3_5',   -- 3rd - 5th grade
  'G6_8',   -- 6th - 8th grade (middle school)
  'G9_12'   -- 9th - 12th grade (high school)
);

COMMENT ON TYPE learning_object_grade_band IS 'Target grade band for age-appropriate content.';

-- Version workflow states
CREATE TYPE learning_object_version_state AS ENUM (
  'DRAFT',      -- Being authored/edited
  'IN_REVIEW',  -- Submitted for review
  'APPROVED',   -- Reviewed and approved, ready to publish
  'PUBLISHED',  -- Live and usable in learner sessions
  'RETIRED'     -- Archived, no longer in active use
);

COMMENT ON TYPE learning_object_version_state IS 'Workflow state for version lifecycle: DRAFT → IN_REVIEW → APPROVED → PUBLISHED → RETIRED';

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────────
-- learning_objects
-- ──────────────────────────────────────────────────────────────────────────────
-- Logical identity of a learning content unit.
-- Examples: "ELA G3 reading passage: Dogs in Winter"

CREATE TABLE learning_objects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant scope: NULL = global/shared content available to all
  tenant_id           UUID,
  
  -- URL-safe unique identifier within tenant scope
  slug                TEXT NOT NULL,
  
  -- Human-readable title
  title               TEXT NOT NULL,
  
  -- Classification
  subject             learning_object_subject NOT NULL,
  grade_band          learning_object_grade_band NOT NULL,
  
  -- Primary skill alignment (FK to skills table - enforced at app level)
  primary_skill_id    UUID,
  
  -- Soft-delete flag
  is_active           BOOLEAN NOT NULL DEFAULT true,
  
  -- Authorship
  created_by_user_id  UUID NOT NULL,
  
  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique slug per tenant (including global with NULL tenant_id)
  CONSTRAINT uq_learning_objects_tenant_slug UNIQUE NULLS NOT DISTINCT (tenant_id, slug)
);

COMMENT ON TABLE learning_objects IS 'Logical identity of learning content units. Actual content is in versions.';
COMMENT ON COLUMN learning_objects.tenant_id IS 'NULL = global/shared content available to all tenants.';
COMMENT ON COLUMN learning_objects.slug IS 'URL-safe identifier, unique per tenant scope.';
COMMENT ON COLUMN learning_objects.primary_skill_id IS 'FK to skills table for primary skill alignment.';

-- ──────────────────────────────────────────────────────────────────────────────
-- learning_object_versions
-- ──────────────────────────────────────────────────────────────────────────────
-- Concrete version of content with workflow state.
-- Only one PUBLISHED version per LO per tenant at a time.

CREATE TABLE learning_object_versions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parent learning object
  learning_object_id    UUID NOT NULL REFERENCES learning_objects(id) ON DELETE CASCADE,
  
  -- Monotonically increasing version number (1, 2, 3...)
  version_number        INTEGER NOT NULL,
  
  -- Workflow state
  state                 learning_object_version_state NOT NULL DEFAULT 'DRAFT',
  
  -- Authorship and review tracking
  created_by_user_id    UUID NOT NULL,
  reviewed_by_user_id   UUID,
  approved_by_user_id   UUID,
  
  -- Change tracking
  change_summary        TEXT,
  
  -- ── Content Payload ────────────────────────────────────────────────────────
  -- Structured content discriminated by "type" field
  -- Types: reading_passage, reading_passage_with_questions, math_problem,
  --        math_problem_set, sel_check_in, sel_scenario, video_lesson,
  --        interactive_game, speech_exercise, assessment_item
  content_json          JSONB NOT NULL,
  
  -- ── Accessibility Metadata ─────────────────────────────────────────────────
  -- Alt text, reading level, supports (dyslexia, ADHD, etc.)
  accessibility_json    JSONB NOT NULL DEFAULT '{}',
  
  -- ── Standards Alignment ────────────────────────────────────────────────────
  -- CCSS, NGSS, state standards, etc.
  standards_json        JSONB NOT NULL DEFAULT '{}',
  
  -- ── Additional Metadata ────────────────────────────────────────────────────
  -- Tags, duration, modality, external IDs, license, etc.
  metadata_json         JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at          TIMESTAMPTZ,
  
  -- Unique version number per learning object
  CONSTRAINT uq_lov_lo_version UNIQUE (learning_object_id, version_number),
  
  -- Version numbers must be positive
  CONSTRAINT chk_lov_version_positive CHECK (version_number > 0)
);

COMMENT ON TABLE learning_object_versions IS 'Versioned content with review workflow. Only one PUBLISHED version per LO at a time.';
COMMENT ON COLUMN learning_object_versions.version_number IS 'Monotonically increasing: 1, 2, 3... per learning object.';
COMMENT ON COLUMN learning_object_versions.content_json IS 'Structured content payload. Discriminated by "type" field.';
COMMENT ON COLUMN learning_object_versions.accessibility_json IS 'Accessibility: alt text, reading level, supports for dyslexia/ADHD/etc.';
COMMENT ON COLUMN learning_object_versions.standards_json IS 'Standards alignment: CCSS, NGSS, state-specific standards.';
COMMENT ON COLUMN learning_object_versions.metadata_json IS 'Additional: duration, modality, keywords, license, external IDs.';

-- ──────────────────────────────────────────────────────────────────────────────
-- learning_object_tags
-- ──────────────────────────────────────────────────────────────────────────────
-- Flexible tagging for discovery and filtering.

CREATE TABLE learning_object_tags (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_object_id  UUID NOT NULL REFERENCES learning_objects(id) ON DELETE CASCADE,
  tag                 TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique tag per learning object
  CONSTRAINT uq_lot_lo_tag UNIQUE (learning_object_id, tag)
);

COMMENT ON TABLE learning_object_tags IS 'Flexible tags for content discovery and filtering.';

-- ──────────────────────────────────────────────────────────────────────────────
-- learning_object_skills
-- ──────────────────────────────────────────────────────────────────────────────
-- Version-specific skill alignments (beyond primary skill).

CREATE TABLE learning_object_skills (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- FK to specific version (skills can change between versions)
  learning_object_version_id  UUID NOT NULL REFERENCES learning_object_versions(id) ON DELETE CASCADE,
  
  -- FK to skills table (enforced at app level for cross-service)
  skill_id                    UUID NOT NULL,
  
  -- Relevance weight (0.0 - 1.0), higher = more relevant
  weight                      NUMERIC(4, 3) CHECK (weight >= 0 AND weight <= 1),
  
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique skill per version
  CONSTRAINT uq_los_version_skill UNIQUE (learning_object_version_id, skill_id)
);

COMMENT ON TABLE learning_object_skills IS 'Version-specific skill alignments beyond the primary skill.';
COMMENT ON COLUMN learning_object_skills.weight IS 'Relevance weight 0.0-1.0. Higher = more strongly aligned.';

-- ──────────────────────────────────────────────────────────────────────────────
-- learning_object_version_transitions
-- ──────────────────────────────────────────────────────────────────────────────
-- Audit trail for workflow state transitions.

CREATE TABLE learning_object_version_transitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id      UUID NOT NULL REFERENCES learning_object_versions(id) ON DELETE CASCADE,
  from_state      learning_object_version_state NOT NULL,
  to_state        learning_object_version_state NOT NULL,
  user_id         UUID NOT NULL,
  comment         TEXT,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE learning_object_version_transitions IS 'Audit trail for all workflow state changes.';

-- ══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

-- ── learning_objects indexes ─────────────────────────────────────────────────

-- Primary discovery: find LOs by tenant, subject, grade
CREATE INDEX idx_lo_tenant_subject_grade 
  ON learning_objects(tenant_id, subject, grade_band)
  WHERE is_active = true;

-- Find LOs by primary skill
CREATE INDEX idx_lo_primary_skill 
  ON learning_objects(primary_skill_id)
  WHERE primary_skill_id IS NOT NULL AND is_active = true;

-- Find global content (tenant_id IS NULL)
CREATE INDEX idx_lo_global 
  ON learning_objects(subject, grade_band)
  WHERE tenant_id IS NULL AND is_active = true;

-- ── learning_object_versions indexes ─────────────────────────────────────────

-- Primary lookup: versions for an LO by state, ordered by version descending
CREATE INDEX idx_lov_lo_state_version 
  ON learning_object_versions(learning_object_id, state, version_number DESC);

-- Find published versions (for runtime content fetching)
CREATE INDEX idx_lov_published 
  ON learning_object_versions(learning_object_id)
  WHERE state = 'PUBLISHED';

-- Find versions in review (for review queue)
CREATE INDEX idx_lov_in_review 
  ON learning_object_versions(created_at DESC)
  WHERE state = 'IN_REVIEW';

-- Find approved versions ready to publish
CREATE INDEX idx_lov_approved 
  ON learning_object_versions(learning_object_id, created_at DESC)
  WHERE state = 'APPROVED';

-- Content type lookup (JSONB path)
CREATE INDEX idx_lov_content_type 
  ON learning_object_versions((content_json->>'type'));

-- ── learning_object_tags indexes ─────────────────────────────────────────────

-- Find LOs by tag
CREATE INDEX idx_lot_tag 
  ON learning_object_tags(tag);

-- Find tags for an LO (covered by unique constraint, but explicit for clarity)
CREATE INDEX idx_lot_lo 
  ON learning_object_tags(learning_object_id);

-- ── learning_object_skills indexes ───────────────────────────────────────────

-- Find versions targeting a skill
CREATE INDEX idx_los_skill 
  ON learning_object_skills(skill_id);

-- ── learning_object_version_transitions indexes ──────────────────────────────

-- Audit history for a version
CREATE INDEX idx_lovt_version 
  ON learning_object_version_transitions(version_id, transitioned_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Auto-update updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lo_updated_at
  BEFORE UPDATE ON learning_objects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_lov_updated_at
  BEFORE UPDATE ON learning_object_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ── Auto-set published_at when state changes to PUBLISHED ────────────────────

CREATE OR REPLACE FUNCTION set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state = 'PUBLISHED' AND (OLD.state IS NULL OR OLD.state != 'PUBLISHED') THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lov_published_at
  BEFORE UPDATE ON learning_object_versions
  FOR EACH ROW
  EXECUTE FUNCTION set_published_at();

-- ── Auto-increment version_number ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_version_number()
RETURNS TRIGGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) INTO max_version
  FROM learning_object_versions
  WHERE learning_object_id = NEW.learning_object_id;
  
  NEW.version_number = max_version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lov_version_number
  BEFORE INSERT ON learning_object_versions
  FOR EACH ROW
  WHEN (NEW.version_number IS NULL)
  EXECUTE FUNCTION set_version_number();

-- ══════════════════════════════════════════════════════════════════════════════
-- COMMENTS ON INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON INDEX idx_lo_tenant_subject_grade IS 'Primary discovery: find active LOs by tenant, subject, grade band.';
COMMENT ON INDEX idx_lo_primary_skill IS 'Find LOs aligned to a specific skill for content selection.';
COMMENT ON INDEX idx_lo_global IS 'Efficiently find global (shared) content by subject/grade.';
COMMENT ON INDEX idx_lov_lo_state_version IS 'Primary version lookup: versions for an LO by state, latest first.';
COMMENT ON INDEX idx_lov_published IS 'Fast lookup of published versions for runtime content fetching.';
COMMENT ON INDEX idx_lov_in_review IS 'Review queue: versions awaiting review, newest first.';
COMMENT ON INDEX idx_lov_content_type IS 'Filter versions by content type (reading_passage, math_problem, etc.).';
COMMENT ON INDEX idx_los_skill IS 'Find all versions targeting a specific skill.';
COMMENT ON INDEX idx_lovt_version IS 'Audit history for a version, most recent transition first.';
