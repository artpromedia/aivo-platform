CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS ai_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NULL,
    agent_type TEXT NOT NULL,
    model_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    version TEXT NOT NULL,
    request_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    latency_ms INTEGER NOT NULL,
    tokens_prompt INTEGER NOT NULL DEFAULT 0,
    tokens_completion INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
    safety_status TEXT NOT NULL,
    status TEXT NOT NULL,
    error_code TEXT NULL,
    error_message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ai_call_logs_safety_status_check CHECK (safety_status IN ('OK', 'BLOCKED', 'NEEDS_REVIEW')),
    CONSTRAINT ai_call_logs_status_check CHECK (status IN ('SUCCESS', 'ERROR'))
);

CREATE INDEX IF NOT EXISTS idx_ai_call_logs_tenant_agent ON ai_call_logs(tenant_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_created_at ON ai_call_logs(created_at DESC);
