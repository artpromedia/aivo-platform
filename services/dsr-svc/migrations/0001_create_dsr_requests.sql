CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS dsr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  parent_id TEXT NOT NULL,
  learner_id TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('EXPORT', 'DELETE')),
  status TEXT NOT NULL CHECK (status IN ('RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED')),
  reason TEXT,
  export_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT fk_parent_learner UNIQUE (tenant_id, parent_id, learner_id, request_type, created_at)
);

CREATE INDEX IF NOT EXISTS idx_dsr_requests_parent ON dsr_requests(tenant_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_dsr_requests_learner ON dsr_requests(tenant_id, learner_id);
