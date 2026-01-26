-- ============================================================================
-- Brain Memory System Schema
-- Migration: 0001_brain_memory_system.sql
--
-- Purpose:
--   1. Episodic Memory - Stores specific learning events with importance scoring
--   2. Semantic Knowledge - Stores generalized knowledge extracted from episodes
--   3. Learner Beliefs - Bayesian belief tracking for knowledge states
--
-- Multi-tenancy:
--   All tables are scoped by tenant_id for data isolation
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- For embedding storage (pgvector)

-- ============================================================================
-- TABLE: episodic_memories
--
-- Stores specific learning events with importance scoring.
-- Primary storage is Redis for fast access; this is for persistence/backup.
-- ============================================================================

CREATE TABLE IF NOT EXISTS episodic_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id TEXT NOT NULL UNIQUE,

    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    learner_id UUID NOT NULL,

    -- Event classification
    event_type TEXT NOT NULL,

    -- Event content (JSON for flexibility)
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Scoring and importance
    emotional_valence NUMERIC(4,3) NOT NULL DEFAULT 0.0,
    importance_score NUMERIC(4,3) NOT NULL DEFAULT 0.5,
    decay_factor NUMERIC(4,3) NOT NULL DEFAULT 1.0,

    -- Access tracking
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed TIMESTAMPTZ NULL,

    -- Consolidation status
    consolidated BOOLEAN NOT NULL DEFAULT FALSE,
    consolidated_at TIMESTAMPTZ NULL,

    -- Related skills
    skill_ids TEXT[] NOT NULL DEFAULT '{}',
    session_id UUID NULL,

    -- Vector embedding for similarity search (384 dimensions for MiniLM)
    embedding vector(384) NULL,

    -- Timestamps
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT chk_episodic_emotional_valence
        CHECK (emotional_valence >= -1.0 AND emotional_valence <= 1.0),
    CONSTRAINT chk_episodic_importance_score
        CHECK (importance_score >= 0.0 AND importance_score <= 1.0),
    CONSTRAINT chk_episodic_decay_factor
        CHECK (decay_factor >= 0.0 AND decay_factor <= 1.0),
    CONSTRAINT chk_episodic_event_type
        CHECK (event_type IN (
            'success', 'struggle', 'breakthrough', 'misconception',
            'preference', 'engagement', 'frustration', 'curiosity',
            'help_seeking', 'mastery'
        ))
);

COMMENT ON TABLE episodic_memories IS
'Episodic memory storage for specific learning events.

Event Types:
- success: Correct response or achievement
- struggle: Difficulty with content
- breakthrough: Sudden understanding
- misconception: Identified wrong understanding
- preference: Learning preference observed
- engagement: High engagement detected
- frustration: Frustration signals
- curiosity: Curiosity/interest signals
- help_seeking: Asked for help
- mastery: Demonstrated mastery

Embeddings: Uses sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)';

-- Indexes for episodic memories
CREATE INDEX IF NOT EXISTS idx_episodic_memories_learner
    ON episodic_memories(tenant_id, learner_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_episodic_memories_type
    ON episodic_memories(tenant_id, learner_id, event_type);

CREATE INDEX IF NOT EXISTS idx_episodic_memories_unconsolidated
    ON episodic_memories(tenant_id, learner_id, consolidated, importance_score DESC)
    WHERE consolidated = FALSE;

CREATE INDEX IF NOT EXISTS idx_episodic_memories_skills
    ON episodic_memories USING GIN(skill_ids);

CREATE INDEX IF NOT EXISTS idx_episodic_memories_session
    ON episodic_memories(session_id)
    WHERE session_id IS NOT NULL;

-- Vector similarity search index (IVFFlat for large datasets)
CREATE INDEX IF NOT EXISTS idx_episodic_memories_embedding
    ON episodic_memories USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================================================
-- TABLE: semantic_knowledge
--
-- Stores generalized knowledge extracted from episodic patterns.
-- ============================================================================

CREATE TABLE IF NOT EXISTS semantic_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_id TEXT NOT NULL UNIQUE,

    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    learner_id UUID NOT NULL,

    -- Knowledge classification
    concept TEXT NOT NULL,
    knowledge_type TEXT NOT NULL,

    -- Confidence and evidence
    confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5,
    evidence_count INTEGER NOT NULL DEFAULT 1,

    -- Related concepts
    related_concepts TEXT[] NOT NULL DEFAULT '{}',
    source_episodes TEXT[] NOT NULL DEFAULT '{}',

    -- Additional attributes
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Vector embedding for similarity search
    embedding vector(384) NULL,

    -- Timestamps
    first_observed TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique constraint per learner/concept/type
    CONSTRAINT uq_semantic_knowledge_learner_concept
        UNIQUE (tenant_id, learner_id, concept, knowledge_type),

    -- Constraints
    CONSTRAINT chk_semantic_confidence
        CHECK (confidence >= 0.0 AND confidence <= 1.0),
    CONSTRAINT chk_semantic_knowledge_type
        CHECK (knowledge_type IN (
            'skill', 'preference', 'pattern', 'misconception',
            'strength', 'weakness', 'learning_style',
            'engagement_pattern', 'optimal_difficulty', 'response_time_pattern'
        ))
);

COMMENT ON TABLE semantic_knowledge IS
'Semantic knowledge storage for generalized learner knowledge.

Knowledge Types:
- skill: Skill-related knowledge
- preference: Learning preferences
- pattern: Behavioral patterns
- misconception: Identified misconceptions
- strength: Areas of strength
- weakness: Areas needing improvement
- learning_style: Learning style preferences
- engagement_pattern: Engagement patterns over time
- optimal_difficulty: Optimal challenge level
- response_time_pattern: Response time patterns

Extracted from episodic memories through consolidation process.';

-- Indexes for semantic knowledge
CREATE INDEX IF NOT EXISTS idx_semantic_knowledge_learner
    ON semantic_knowledge(tenant_id, learner_id);

CREATE INDEX IF NOT EXISTS idx_semantic_knowledge_type
    ON semantic_knowledge(tenant_id, learner_id, knowledge_type);

CREATE INDEX IF NOT EXISTS idx_semantic_knowledge_confidence
    ON semantic_knowledge(tenant_id, learner_id, confidence DESC);

CREATE INDEX IF NOT EXISTS idx_semantic_knowledge_concept
    ON semantic_knowledge(tenant_id, concept);

CREATE INDEX IF NOT EXISTS idx_semantic_knowledge_related
    ON semantic_knowledge USING GIN(related_concepts);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_semantic_knowledge_embedding
    ON semantic_knowledge USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================================================
-- TABLE: learner_beliefs
--
-- Bayesian belief tracking for learner knowledge states.
-- ============================================================================

CREATE TABLE IF NOT EXISTS learner_beliefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    belief_id TEXT NOT NULL UNIQUE,

    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    learner_id UUID NOT NULL,

    -- Topic/skill being tracked
    topic TEXT NOT NULL,

    -- Belief state (probability of mastery)
    belief_state NUMERIC(6,5) NOT NULL DEFAULT 0.5,
    uncertainty NUMERIC(6,5) NOT NULL DEFAULT 0.5,
    prior NUMERIC(6,5) NOT NULL DEFAULT 0.5,

    -- Beta distribution parameters
    alpha NUMERIC(10,4) NOT NULL DEFAULT 1.0,
    beta NUMERIC(10,4) NOT NULL DEFAULT 1.0,

    -- Evidence tracking
    evidence_count INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    incorrect_count INTEGER NOT NULL DEFAULT 0,

    -- Evidence history (last N updates)
    evidence_history JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Timestamps
    last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique constraint per learner/topic
    CONSTRAINT uq_learner_beliefs_topic
        UNIQUE (tenant_id, learner_id, topic),

    -- Constraints
    CONSTRAINT chk_belief_state_range
        CHECK (belief_state >= 0.0 AND belief_state <= 1.0),
    CONSTRAINT chk_uncertainty_range
        CHECK (uncertainty >= 0.0 AND uncertainty <= 1.0),
    CONSTRAINT chk_prior_range
        CHECK (prior >= 0.0 AND prior <= 1.0),
    CONSTRAINT chk_alpha_positive
        CHECK (alpha > 0.0),
    CONSTRAINT chk_beta_positive
        CHECK (beta > 0.0)
);

COMMENT ON TABLE learner_beliefs IS
'Bayesian belief tracking for learner knowledge states.

Uses Beta-Bernoulli conjugate prior for efficient Bayesian updates:
- alpha: Pseudo-count of correct responses
- beta: Pseudo-count of incorrect responses
- belief_state: Mean of Beta(alpha, beta) = alpha / (alpha + beta)
- uncertainty: Standard deviation of Beta distribution

Mastery Levels (based on belief_state):
- not_started: No evidence
- beginning: 0.0 - 0.3
- developing: 0.3 - 0.5
- proficient: 0.5 - 0.7
- mastered: 0.7 - 1.0';

-- Indexes for learner beliefs
CREATE INDEX IF NOT EXISTS idx_learner_beliefs_learner
    ON learner_beliefs(tenant_id, learner_id);

CREATE INDEX IF NOT EXISTS idx_learner_beliefs_topic
    ON learner_beliefs(tenant_id, learner_id, topic);

CREATE INDEX IF NOT EXISTS idx_learner_beliefs_mastery
    ON learner_beliefs(tenant_id, learner_id, belief_state DESC);

CREATE INDEX IF NOT EXISTS idx_learner_beliefs_low_mastery
    ON learner_beliefs(tenant_id, learner_id, belief_state)
    WHERE belief_state < 0.4;

CREATE INDEX IF NOT EXISTS idx_learner_beliefs_high_mastery
    ON learner_beliefs(tenant_id, learner_id)
    WHERE belief_state >= 0.7;

-- ============================================================================
-- TABLE: memory_consolidation_logs
--
-- Tracks memory consolidation operations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS memory_consolidation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    learner_id UUID NOT NULL,

    -- Consolidation results
    episodes_processed INTEGER NOT NULL DEFAULT 0,
    episodes_consolidated INTEGER NOT NULL DEFAULT 0,
    knowledge_created INTEGER NOT NULL DEFAULT 0,
    knowledge_updated INTEGER NOT NULL DEFAULT 0,

    -- Patterns found (summary)
    patterns_found JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Errors (if any)
    errors TEXT[] NOT NULL DEFAULT '{}',

    -- Performance
    duration_ms INTEGER NOT NULL DEFAULT 0,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE memory_consolidation_logs IS
'Tracks memory consolidation operations for monitoring and debugging.';

CREATE INDEX IF NOT EXISTS idx_consolidation_logs_learner
    ON memory_consolidation_logs(tenant_id, learner_id, created_at DESC);

-- ============================================================================
-- VIEWS: Useful aggregations
-- ============================================================================

-- View: Learner memory overview
CREATE OR REPLACE VIEW v_learner_memory_overview AS
SELECT
    em.tenant_id,
    em.learner_id,
    COUNT(*) as total_episodic_memories,
    COUNT(*) FILTER (WHERE em.consolidated = FALSE) as unconsolidated_memories,
    AVG(em.importance_score) as avg_importance,
    AVG(em.decay_factor) as avg_decay,
    MAX(em.event_timestamp) as last_memory_timestamp,
    sk.semantic_count,
    sk.avg_confidence,
    lb.belief_count,
    lb.avg_mastery
FROM episodic_memories em
LEFT JOIN (
    SELECT
        tenant_id,
        learner_id,
        COUNT(*) as semantic_count,
        AVG(confidence) as avg_confidence
    FROM semantic_knowledge
    GROUP BY tenant_id, learner_id
) sk ON em.tenant_id = sk.tenant_id AND em.learner_id = sk.learner_id
LEFT JOIN (
    SELECT
        tenant_id,
        learner_id,
        COUNT(*) as belief_count,
        AVG(belief_state) as avg_mastery
    FROM learner_beliefs
    GROUP BY tenant_id, learner_id
) lb ON em.tenant_id = lb.tenant_id AND em.learner_id = lb.learner_id
GROUP BY
    em.tenant_id,
    em.learner_id,
    sk.semantic_count,
    sk.avg_confidence,
    lb.belief_count,
    lb.avg_mastery;

COMMENT ON VIEW v_learner_memory_overview IS
'Aggregated memory statistics per learner.';

-- View: Event type distribution
CREATE OR REPLACE VIEW v_event_type_distribution AS
SELECT
    tenant_id,
    learner_id,
    event_type,
    COUNT(*) as event_count,
    AVG(importance_score) as avg_importance,
    AVG(emotional_valence) as avg_valence
FROM episodic_memories
WHERE event_timestamp > now() - INTERVAL '30 days'
GROUP BY tenant_id, learner_id, event_type;

COMMENT ON VIEW v_event_type_distribution IS
'Distribution of event types per learner (last 30 days).';

-- View: Knowledge type distribution
CREATE OR REPLACE VIEW v_knowledge_type_distribution AS
SELECT
    tenant_id,
    learner_id,
    knowledge_type,
    COUNT(*) as knowledge_count,
    AVG(confidence) as avg_confidence
FROM semantic_knowledge
GROUP BY tenant_id, learner_id, knowledge_type;

COMMENT ON VIEW v_knowledge_type_distribution IS
'Distribution of semantic knowledge types per learner.';

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- episodic_memories
DROP TRIGGER IF EXISTS trg_episodic_memories_updated_at ON episodic_memories;
CREATE TRIGGER trg_episodic_memories_updated_at
    BEFORE UPDATE ON episodic_memories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- semantic_knowledge
DROP TRIGGER IF EXISTS trg_semantic_knowledge_updated_at ON semantic_knowledge;
CREATE TRIGGER trg_semantic_knowledge_updated_at
    BEFORE UPDATE ON semantic_knowledge
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- learner_beliefs
DROP TRIGGER IF EXISTS trg_learner_beliefs_updated_at ON learner_beliefs;
CREATE TRIGGER trg_learner_beliefs_updated_at
    BEFORE UPDATE ON learner_beliefs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS: Utility functions
-- ============================================================================

-- Function to calculate effective importance (importance * decay)
CREATE OR REPLACE FUNCTION get_effective_importance(
    importance_score NUMERIC,
    decay_factor NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
    RETURN importance_score * decay_factor;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_effective_importance IS
'Calculates effective importance as importance_score * decay_factor.';

-- Function to find similar memories by embedding
CREATE OR REPLACE FUNCTION find_similar_memories(
    p_tenant_id UUID,
    p_learner_id UUID,
    p_embedding vector(384),
    p_limit INTEGER DEFAULT 10,
    p_min_importance NUMERIC DEFAULT 0.3
) RETURNS TABLE (
    memory_id TEXT,
    similarity NUMERIC,
    event_type TEXT,
    importance_score NUMERIC,
    event_timestamp TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        em.memory_id,
        (1 - (em.embedding <=> p_embedding))::NUMERIC as similarity,
        em.event_type,
        em.importance_score,
        em.event_timestamp
    FROM episodic_memories em
    WHERE em.tenant_id = p_tenant_id
      AND em.learner_id = p_learner_id
      AND em.embedding IS NOT NULL
      AND get_effective_importance(em.importance_score, em.decay_factor) >= p_min_importance
    ORDER BY em.embedding <=> p_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_similar_memories IS
'Find episodic memories similar to a query embedding using cosine similarity.';

-- Function to get mastery level category
CREATE OR REPLACE FUNCTION get_mastery_level(belief_state NUMERIC)
RETURNS TEXT AS $$
BEGIN
    IF belief_state >= 0.7 THEN
        RETURN 'mastered';
    ELSIF belief_state >= 0.5 THEN
        RETURN 'proficient';
    ELSIF belief_state >= 0.3 THEN
        RETURN 'developing';
    ELSE
        RETURN 'beginning';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_mastery_level IS
'Returns categorical mastery level based on belief state.';
