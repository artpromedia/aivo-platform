-- Migration: Agentic AI Capabilities
-- Description: Creates tables for agentic AI features including memory store,
--              autonomous decisions, and multi-agent coordination
-- Version: 0007
-- Date: 2026-01-11

-- ════════════════════════════════════════════════════════════════════════════════
-- VECTOR MEMORY STORE
-- ════════════════════════════════════════════════════════════════════════════════

-- Enable pgvector extension for embedding storage
CREATE EXTENSION IF NOT EXISTS vector;

-- Learner memories table for RAG/long-term memory
CREATE TABLE IF NOT EXISTS learner_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    learner_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('EPISODIC', 'SEMANTIC', 'PROCEDURAL', 'WORKING')),
    content TEXT NOT NULL,
    summary TEXT,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
    metadata JSONB NOT NULL DEFAULT '{}',
    importance DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

-- Indexes for memory retrieval
CREATE INDEX idx_learner_memories_tenant_learner ON learner_memories(tenant_id, learner_id);
CREATE INDEX idx_learner_memories_type ON learner_memories(type);
CREATE INDEX idx_learner_memories_importance ON learner_memories(importance DESC);
CREATE INDEX idx_learner_memories_created_at ON learner_memories(created_at DESC);
CREATE INDEX idx_learner_memories_expires_at ON learner_memories(expires_at) WHERE expires_at IS NOT NULL;

-- HNSW index for fast vector similarity search (if pgvector supports it)
-- This uses IVFFlat as a fallback if HNSW is not available
CREATE INDEX idx_learner_memories_embedding ON learner_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- GIN index for metadata search
CREATE INDEX idx_learner_memories_metadata ON learner_memories USING GIN (metadata);
CREATE INDEX idx_learner_memories_tags ON learner_memories USING GIN ((metadata->'tags'));

-- ════════════════════════════════════════════════════════════════════════════════
-- AUTONOMOUS DECISIONS
-- ════════════════════════════════════════════════════════════════════════════════

-- Learner autonomy settings
CREATE TABLE IF NOT EXISTS learner_autonomy_settings (
    tenant_id UUID NOT NULL,
    learner_id UUID NOT NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'SUGGESTION' CHECK (level IN ('NONE', 'SUGGESTION', 'SUPERVISED', 'SEMI_AUTONOMOUS', 'AUTONOMOUS')),
    category_overrides JSONB NOT NULL DEFAULT '{}',
    risk_thresholds JSONB NOT NULL DEFAULT '{"autoApproveMaxRisk": "LOW", "requireTeacherApprovalRisk": "HIGH"}',
    cooldowns JSONB NOT NULL DEFAULT '{"sameActionCooldownMs": 60000, "maxActionsPerHour": 20}',
    restrictions JSONB NOT NULL DEFAULT '{"blockedActions": ["COMMUNICATION"], "requireParentApproval": true}',
    configured_by VARCHAR(255) NOT NULL,
    configured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,

    PRIMARY KEY (tenant_id, learner_id)
);

-- Autonomous decisions table
CREATE TABLE IF NOT EXISTS autonomous_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    learner_id UUID NOT NULL,
    agent_type VARCHAR(50) NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN (
        'CONTENT_SELECTION', 'DIFFICULTY_ADJUSTMENT', 'SCHEDULE_MODIFICATION',
        'INTERVENTION', 'ASSESSMENT', 'COMMUNICATION', 'GOAL_MODIFICATION', 'ACCOMMODATION'
    )),
    action JSONB NOT NULL,
    rationale TEXT NOT NULL,
    expected_outcome TEXT NOT NULL,
    risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    risk_factors JSONB NOT NULL DEFAULT '[]',
    risk_mitigations JSONB NOT NULL DEFAULT '[]',
    reversible BOOLEAN NOT NULL DEFAULT TRUE,
    reversal_action JSONB,
    context JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN (
        'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED', 'EXPIRED', 'REVERSED'
    )),
    approval_required_from VARCHAR(20) CHECK (approval_required_from IN ('TEACHER', 'PARENT')),
    rejection_reason TEXT,
    executed_at TIMESTAMP WITH TIME ZONE,
    executed_by VARCHAR(20),
    reversed_by VARCHAR(255),
    reversed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for decision queries
CREATE INDEX idx_autonomous_decisions_tenant_learner ON autonomous_decisions(tenant_id, learner_id);
CREATE INDEX idx_autonomous_decisions_status ON autonomous_decisions(status);
CREATE INDEX idx_autonomous_decisions_category ON autonomous_decisions(category);
CREATE INDEX idx_autonomous_decisions_created_at ON autonomous_decisions(created_at DESC);
CREATE INDEX idx_autonomous_decisions_pending ON autonomous_decisions(tenant_id, learner_id, status)
    WHERE status = 'PENDING_APPROVAL';

-- Audit trail for autonomous decisions
CREATE TABLE IF NOT EXISTS autonomous_decision_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES autonomous_decisions(id),
    tenant_id UUID NOT NULL,
    learner_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    result JSONB,
    performed_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_decision_audit_decision_id ON autonomous_decision_audit(decision_id);
CREATE INDEX idx_decision_audit_tenant_learner ON autonomous_decision_audit(tenant_id, learner_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- MULTI-AGENT COORDINATION
-- ════════════════════════════════════════════════════════════════════════════════

-- Agent messages for inter-agent communication
CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    session_id UUID NOT NULL,
    from_agent VARCHAR(50) NOT NULL,
    to_agent VARCHAR(50) NOT NULL,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN (
        'REQUEST', 'RESPONSE', 'HANDOFF', 'NOTIFY', 'QUERY', 'CONFLICT', 'ESCALATE'
    )),
    payload JSONB NOT NULL,
    correlation_id UUID NOT NULL,
    reply_to_message_id UUID REFERENCES agent_messages(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_messages_session ON agent_messages(session_id, created_at);
CREATE INDEX idx_agent_messages_correlation ON agent_messages(correlation_id);
CREATE INDEX idx_agent_messages_agents ON agent_messages(from_agent, to_agent);

-- Agent orchestration logs
CREATE TABLE IF NOT EXISTS agent_orchestrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    learner_id UUID,
    session_id UUID NOT NULL,
    user_input TEXT NOT NULL,
    routing_decision JSONB NOT NULL,
    agent_results JSONB NOT NULL DEFAULT '[]',
    final_response TEXT,
    recommendations JSONB DEFAULT '[]',
    success BOOLEAN NOT NULL,
    error TEXT,
    duration_ms INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_orchestrations_session ON agent_orchestrations(session_id);
CREATE INDEX idx_agent_orchestrations_tenant_learner ON agent_orchestrations(tenant_id, learner_id);
CREATE INDEX idx_agent_orchestrations_created_at ON agent_orchestrations(created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════════
-- TOOL EXECUTION AUDIT (extends existing tool_execution_audit)
-- ════════════════════════════════════════════════════════════════════════════════

-- Tool execution audit table (if not exists from previous migration)
CREATE TABLE IF NOT EXISTS tool_execution_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL,
    tool_id VARCHAR(100) NOT NULL,
    tenant_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    learner_id UUID,
    session_id UUID,
    agent_id VARCHAR(50) NOT NULL,
    autonomy_level VARCHAR(20) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('EXECUTED', 'DENIED', 'RATE_LIMITED', 'TIMEOUT', 'ERROR')),
    reason TEXT,
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_audit_tenant ON tool_execution_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tool_audit_user ON tool_execution_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_audit_tool ON tool_execution_audit(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_audit_created ON tool_execution_audit(created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════════
-- REACT LOOP TRACES
-- ════════════════════════════════════════════════════════════════════════════════

-- Store ReAct loop execution traces for debugging and analysis
CREATE TABLE IF NOT EXISTS react_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    learner_id UUID,
    session_id UUID NOT NULL,
    request_id UUID NOT NULL,
    agent_type VARCHAR(50) NOT NULL,
    user_input TEXT NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]',
    final_answer TEXT,
    termination_reason VARCHAR(20) NOT NULL CHECK (termination_reason IN (
        'COMPLETED', 'MAX_ITERATIONS', 'MAX_TIME', 'ERROR', 'NO_ACTION', 'USER_ABORT'
    )),
    total_iterations INTEGER NOT NULL,
    total_duration_ms INTEGER NOT NULL,
    total_tokens_used INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_react_traces_session ON react_traces(session_id);
CREATE INDEX idx_react_traces_tenant_learner ON react_traces(tenant_id, learner_id);
CREATE INDEX idx_react_traces_agent ON react_traces(agent_type);
CREATE INDEX idx_react_traces_created ON react_traces(created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all new tables
ALTER TABLE learner_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_autonomy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous_decision_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_orchestrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE react_traces ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (tenant isolation)
CREATE POLICY learner_memories_tenant_isolation ON learner_memories
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY learner_autonomy_tenant_isolation ON learner_autonomy_settings
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY autonomous_decisions_tenant_isolation ON autonomous_decisions
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY decision_audit_tenant_isolation ON autonomous_decision_audit
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY agent_messages_tenant_isolation ON agent_messages
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY agent_orchestrations_tenant_isolation ON agent_orchestrations
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY react_traces_tenant_isolation ON react_traces
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ════════════════════════════════════════════════════════════════════════════════
-- CLEANUP FUNCTIONS
-- ════════════════════════════════════════════════════════════════════════════════

-- Function to clean up expired memories
CREATE OR REPLACE FUNCTION cleanup_expired_memories()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM learner_memories
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired decisions
CREATE OR REPLACE FUNCTION cleanup_expired_decisions()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE autonomous_decisions
    SET status = 'EXPIRED'
    WHERE status = 'PENDING_APPROVAL' AND expires_at < NOW();
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to consolidate similar memories (called periodically)
CREATE OR REPLACE FUNCTION get_memory_stats(p_tenant_id UUID, p_learner_id UUID)
RETURNS TABLE (
    total_memories BIGINT,
    episodic_count BIGINT,
    semantic_count BIGINT,
    procedural_count BIGINT,
    working_count BIGINT,
    avg_importance NUMERIC,
    oldest_memory TIMESTAMP WITH TIME ZONE,
    newest_memory TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) AS total_memories,
        COUNT(*) FILTER (WHERE type = 'EPISODIC') AS episodic_count,
        COUNT(*) FILTER (WHERE type = 'SEMANTIC') AS semantic_count,
        COUNT(*) FILTER (WHERE type = 'PROCEDURAL') AS procedural_count,
        COUNT(*) FILTER (WHERE type = 'WORKING') AS working_count,
        AVG(importance)::NUMERIC AS avg_importance,
        MIN(created_at) AS oldest_memory,
        MAX(created_at) AS newest_memory
    FROM learner_memories
    WHERE tenant_id = p_tenant_id AND learner_id = p_learner_id;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ════════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE learner_memories IS 'Long-term memory storage for learner interactions, supports RAG with vector embeddings';
COMMENT ON TABLE learner_autonomy_settings IS 'Per-learner autonomy configuration with teacher/parent controls';
COMMENT ON TABLE autonomous_decisions IS 'Decisions made by AI agents with approval workflows';
COMMENT ON TABLE autonomous_decision_audit IS 'Audit trail for all autonomous decision actions';
COMMENT ON TABLE agent_messages IS 'Inter-agent communication log for multi-agent coordination';
COMMENT ON TABLE agent_orchestrations IS 'Log of multi-agent orchestration runs';
COMMENT ON TABLE react_traces IS 'Detailed traces of ReAct loop executions for debugging';
COMMENT ON TABLE tool_execution_audit IS 'Audit log for all tool executions by agents';
