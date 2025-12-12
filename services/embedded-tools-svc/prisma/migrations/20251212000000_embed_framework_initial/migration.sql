-- ══════════════════════════════════════════════════════════════════════════════
-- EMBEDDED TOOLS SERVICE - INITIAL MIGRATION
-- ══════════════════════════════════════════════════════════════════════════════
-- 
-- Creates the embed framework schema for safe third-party tool integration.
-- Implements COPPA/FERPA-aware data minimization with scoped access.
--
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE tool_session_status AS ENUM (
  'ACTIVE',
  'COMPLETED',
  'EXPIRED',
  'REVOKED'
);

CREATE TYPE session_event_type AS ENUM (
  'SESSION_STARTED',
  'SESSION_ENDED',
  'ACTIVITY_STARTED',
  'ACTIVITY_COMPLETED',
  'ACTIVITY_PROGRESS',
  'SCORE_RECORDED',
  'TIME_SPENT',
  'BADGE_EARNED',
  'INTERACTION',
  'HINT_REQUESTED',
  'HINT_VIEWED',
  'TOOL_ERROR',
  'VALIDATION_ERROR',
  'TOKEN_REFRESHED',
  'SCOPE_VIOLATION'
);

CREATE TYPE tool_scope AS ENUM (
  'LEARNER_PROFILE_MIN',
  'LEARNER_PROFILE_EXTENDED',
  'LEARNER_PSEUDONYM',
  'CLASSROOM_CONTEXT',
  'ASSIGNMENT_CONTEXT',
  'SESSION_EVENTS_WRITE',
  'SESSION_EVENTS_READ',
  'PROGRESS_READ',
  'PROGRESS_WRITE',
  'THEME_READ',
  'LEARNER_NAME_FULL',
  'LEARNER_GRADE_EXACT',
  'TEACHER_CONTEXT'
);

CREATE TYPE actor_type AS ENUM (
  'LEARNER',
  'TEACHER',
  'PARENT',
  'ADMIN',
  'SYSTEM'
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TOOL SESSIONS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE tool_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  marketplace_item_id UUID NOT NULL,
  marketplace_item_version_id UUID NOT NULL,
  installation_id UUID NOT NULL,
  learner_id UUID,
  pseudonymous_learner_id TEXT,
  classroom_id UUID,
  assignment_id UUID,
  created_by_user_id UUID NOT NULL,
  created_by_actor_type actor_type NOT NULL,
  granted_scopes tool_scope[] NOT NULL DEFAULT '{}',
  status tool_session_status NOT NULL DEFAULT 'ACTIVE',
  launch_config_json JSONB,
  learner_context_json JSONB,
  token_jti TEXT,
  token_expires_at TIMESTAMPTZ,
  token_refresh_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tool_sessions IS 'Tool session records for embedded tool launches';
COMMENT ON COLUMN tool_sessions.pseudonymous_learner_id IS 'Hash of learnerId + tenant secret - passed to tool instead of real ID';
COMMENT ON COLUMN tool_sessions.granted_scopes IS 'Intersection of tool requirements and tenant policy';
COMMENT ON COLUMN tool_sessions.learner_context_json IS 'Minimal learner context based on granted scopes';

CREATE INDEX idx_tool_sessions_tenant_status ON tool_sessions(tenant_id, status);
CREATE INDEX idx_tool_sessions_learner_status ON tool_sessions(learner_id, status);
CREATE INDEX idx_tool_sessions_item_tenant ON tool_sessions(marketplace_item_id, tenant_id);
CREATE INDEX idx_tool_sessions_installation ON tool_sessions(installation_id);
CREATE INDEX idx_tool_sessions_created_by ON tool_sessions(created_by_user_id);
CREATE INDEX idx_tool_sessions_status_expires ON tool_sessions(status, expires_at);
CREATE INDEX idx_tool_sessions_token_jti ON tool_sessions(token_jti);

-- ══════════════════════════════════════════════════════════════════════════════
-- SESSION EVENTS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_session_id UUID NOT NULL REFERENCES tool_sessions(id) ON DELETE CASCADE,
  event_type session_event_type NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_json JSONB NOT NULL,
  activity_id TEXT,
  score_value DECIMAL(5, 2),
  duration_seconds INTEGER,
  is_processed BOOLEAN NOT NULL DEFAULT FALSE,
  processing_error TEXT,
  is_forwarded BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE session_events IS 'Events sent from tools during a session';
COMMENT ON COLUMN session_events.payload_json IS 'Event-specific payload, validated against schema';
COMMENT ON COLUMN session_events.score_value IS 'Normalized score 0-100 if applicable';

CREATE INDEX idx_session_events_session_time ON session_events(tool_session_id, event_timestamp DESC);
CREATE INDEX idx_session_events_type_received ON session_events(event_type, received_at);
CREATE INDEX idx_session_events_processing ON session_events(is_processed, is_forwarded);

-- ══════════════════════════════════════════════════════════════════════════════
-- TOKEN AUDIT LOGS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE token_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_session_id UUID NOT NULL REFERENCES tool_sessions(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  token_jti TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE token_audit_logs IS 'Audit trail for token operations';

CREATE INDEX idx_token_audit_session_time ON token_audit_logs(tool_session_id, created_at DESC);
CREATE INDEX idx_token_audit_jti ON token_audit_logs(token_jti);

-- ══════════════════════════════════════════════════════════════════════════════
-- TENANT TOOL POLICIES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE tenant_tool_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  allowed_scopes tool_scope[] NOT NULL DEFAULT '{}',
  denied_scopes tool_scope[] NOT NULL DEFAULT '{}',
  require_parental_consent BOOLEAN NOT NULL DEFAULT TRUE,
  max_session_duration_min INTEGER NOT NULL DEFAULT 60,
  idle_timeout_min INTEGER NOT NULL DEFAULT 15,
  max_concurrent_sessions INTEGER NOT NULL DEFAULT 1,
  allow_token_refresh BOOLEAN NOT NULL DEFAULT TRUE,
  max_token_refreshes INTEGER NOT NULL DEFAULT 3,
  allowed_launch_types TEXT[] NOT NULL DEFAULT '{}',
  custom_csp_directives TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tenant_tool_policies IS 'Per-tenant configuration for tool embedding';
COMMENT ON COLUMN tenant_tool_policies.allowed_scopes IS 'Maximum scopes tools can request';
COMMENT ON COLUMN tenant_tool_policies.denied_scopes IS 'Explicitly denied scopes (override allowed)';

-- ══════════════════════════════════════════════════════════════════════════════
-- TENANT TOOL LIST ENTRIES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE tenant_tool_list_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  marketplace_item_id UUID NOT NULL,
  is_allowed BOOLEAN NOT NULL,
  reason TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uk_tenant_tool_list_entry UNIQUE (tenant_id, marketplace_item_id)
);

COMMENT ON TABLE tenant_tool_list_entries IS 'Per-tenant allow/block list for tools';

CREATE INDEX idx_tenant_tool_list_tenant_allowed ON tenant_tool_list_entries(tenant_id, is_allowed);

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS FOR UPDATED_AT
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_tool_sessions_updated_at
  BEFORE UPDATE ON tool_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_tenant_tool_policies_updated_at
  BEFORE UPDATE ON tenant_tool_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_tenant_tool_list_entries_updated_at
  BEFORE UPDATE ON tenant_tool_list_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCTION: Expire stale sessions
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION expire_stale_tool_sessions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE tool_sessions
  SET 
    status = 'EXPIRED',
    ended_at = NOW()
  WHERE 
    status = 'ACTIVE'
    AND (
      expires_at < NOW()
      OR (
        last_activity_at < NOW() - INTERVAL '15 minutes'
        AND NOT EXISTS (
          SELECT 1 FROM tenant_tool_policies ttp
          WHERE ttp.tenant_id = tool_sessions.tenant_id
          AND tool_sessions.last_activity_at >= NOW() - (ttp.idle_timeout_min || ' minutes')::INTERVAL
        )
      )
    );
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_stale_tool_sessions() IS 'Expires sessions that have exceeded their timeout';
