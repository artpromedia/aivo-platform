-- ══════════════════════════════════════════════════════════════════════════════
-- Audit Events Schema
-- Migration: 20241210200000_audit_events
--
-- Purpose:
--   Creates a unified audit trail for tracking changes to:
--   - Learner difficulty levels
--   - Today Plans
--   - Policy documents
--
-- Design Principles:
--   - Unified actor model (USER, SYSTEM, AGENT)
--   - JSONB diff structure for flexible before/after tracking
--   - Links to explanation_events for AI decision context
--   - Multi-tenant isolation via tenant_id
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────────────────────

-- Who/what performed the action
CREATE TYPE audit_actor_type AS ENUM (
  'USER',    -- Human user (admin, teacher, parent)
  'SYSTEM',  -- System automation (scheduled job, migration)
  'AGENT'    -- AI agent (Virtual Brain, Lesson Planner)
);

-- Type of action performed
CREATE TYPE audit_action_type AS ENUM (
  'CREATED',
  'UPDATED',
  'DELETED',
  'ACTIVATED',
  'DEACTIVATED'
);

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE: audit_events
--
-- Core table storing audit trail for all tracked changes.
-- Each row represents one auditable change with before/after state.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Tenant Context
  -- ═══════════════════════════════════════════════════════════════════════════
  
  -- Multi-tenant isolation (REQUIRED)
  tenant_id UUID NOT NULL,
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Actor Information
  -- ═══════════════════════════════════════════════════════════════════════════
  
  -- Type of actor that made the change
  actor_type audit_actor_type NOT NULL,
  
  -- Actor identifier:
  -- - USER: userId (UUID)
  -- - SYSTEM: system component name (e.g., 'RETENTION_JOB', 'MIGRATION')
  -- - AGENT: agent name (e.g., 'VIRTUAL_BRAIN', 'LESSON_PLANNER')
  actor_id TEXT,
  
  -- Human-readable actor display name for UI
  actor_display_name TEXT,
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Entity Information
  -- ═══════════════════════════════════════════════════════════════════════════
  
  -- Type of entity being changed
  -- Examples: 'LEARNER_DIFFICULTY', 'TODAY_PLAN', 'POLICY_DOCUMENT'
  entity_type TEXT NOT NULL,
  
  -- Primary identifier of the entity
  -- Format varies by entity_type:
  -- - LEARNER_DIFFICULTY: learnerId:subject (e.g., 'uuid:MATH')
  -- - TODAY_PLAN: sessionId or planId
  -- - POLICY_DOCUMENT: policyDocumentId
  entity_id TEXT NOT NULL,
  
  -- Human-readable entity label for UI
  entity_display_name TEXT,
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Change Details
  -- ═══════════════════════════════════════════════════════════════════════════
  
  -- What action was performed
  action audit_action_type NOT NULL,
  
  -- Diff structure with before/after values
  -- Schema varies by entity_type:
  --
  -- LEARNER_DIFFICULTY:
  -- {
  --   "before": { "level": 2, "band": "K5" },
  --   "after": { "level": 3, "band": "K5" },
  --   "delta": { "level": "+1" }
  -- }
  --
  -- TODAY_PLAN:
  -- {
  --   "before": { "activities": ["lo-1", "lo-2"] },
  --   "after": { "activities": ["lo-1", "lo-3", "lo-4"] },
  --   "added": ["lo-3", "lo-4"],
  --   "removed": ["lo-2"]
  -- }
  --
  -- POLICY_DOCUMENT:
  -- {
  --   "before": { "name": "v1", "is_active": false },
  --   "after": { "name": "v2", "is_active": true },
  --   "changed_fields": ["name", "is_active", "policy_json.safety.min_severity_for_incident"]
  -- }
  change_json JSONB NOT NULL DEFAULT '{}',
  
  -- Human-readable summary of the change for timeline display
  -- e.g., "Math difficulty adjusted from Level 2 → Level 3"
  summary TEXT NOT NULL,
  
  -- Optional additional context/reason for the change
  reason TEXT,
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Relationships
  -- ═══════════════════════════════════════════════════════════════════════════
  
  -- Link to explanation event (for AI-driven changes)
  related_explanation_id UUID,
  
  -- Link to session (if change occurred within a session)
  session_id UUID,
  
  -- Link to learner (for learner-specific changes)
  learner_id UUID,
  
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Timestamps
  -- ═══════════════════════════════════════════════════════════════════════════
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────────────────────

-- Primary query pattern: by tenant + entity + time
CREATE INDEX idx_audit_events_tenant_entity 
  ON audit_events(tenant_id, entity_type, entity_id, created_at DESC);

-- Learner audit timeline: by tenant + learner + time
CREATE INDEX idx_audit_events_learner 
  ON audit_events(tenant_id, learner_id, created_at DESC)
  WHERE learner_id IS NOT NULL;

-- Actor audit: who made what changes
CREATE INDEX idx_audit_events_actor 
  ON audit_events(tenant_id, actor_type, actor_id, created_at DESC);

-- Session-scoped audit
CREATE INDEX idx_audit_events_session 
  ON audit_events(session_id, created_at DESC)
  WHERE session_id IS NOT NULL;

-- Entity type filter (for platform admin views)
CREATE INDEX idx_audit_events_entity_type 
  ON audit_events(entity_type, tenant_id, created_at DESC);

-- Explanation join
CREATE INDEX idx_audit_events_explanation 
  ON audit_events(related_explanation_id)
  WHERE related_explanation_id IS NOT NULL;

-- Time-based queries (e.g., "last 7 days")
CREATE INDEX idx_audit_events_created_at 
  ON audit_events(created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- COMMENTS
-- ────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE audit_events IS 
'Unified audit trail for tracking changes to learner difficulty, today plans, and policy documents. Supports both human and AI actors.';

COMMENT ON COLUMN audit_events.actor_type IS 
'USER = human user, SYSTEM = automated process, AGENT = AI agent';

COMMENT ON COLUMN audit_events.entity_type IS 
'Type of entity: LEARNER_DIFFICULTY, TODAY_PLAN, POLICY_DOCUMENT, etc.';

COMMENT ON COLUMN audit_events.change_json IS 
'JSONB diff with before/after values. Schema varies by entity_type.';

COMMENT ON COLUMN audit_events.related_explanation_id IS 
'Links to explanation_events for AI-driven changes. Enables "View explanation" in UI.';
