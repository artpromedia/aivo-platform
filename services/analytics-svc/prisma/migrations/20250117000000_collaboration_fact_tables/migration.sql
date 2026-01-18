-- Migration: Add Collaboration Analytics Fact Tables
-- Description: Creates dimension and fact tables for collaboration analytics
-- including care teams, action plans, messages, meetings, tasks, and care notes.

-- ================================================================================
-- DIMENSION: CARE TEAM
-- ================================================================================

CREATE TABLE IF NOT EXISTS dim_care_team (
  care_team_key SERIAL PRIMARY KEY,
  care_team_id UUID NOT NULL,
  learner_id UUID NOT NULL,
  team_name VARCHAR(255),
  member_count INTEGER NOT NULL DEFAULT 0,
  parent_count INTEGER NOT NULL DEFAULT 0,
  teacher_count INTEGER NOT NULL DEFAULT 0,
  counselor_count INTEGER NOT NULL DEFAULT 0,
  specialist_count INTEGER NOT NULL DEFAULT 0,
  other_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  tenant_id UUID NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  source_updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dim_care_team_current ON dim_care_team(care_team_id) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_dim_care_team_learner ON dim_care_team(learner_id);
CREATE INDEX IF NOT EXISTS idx_dim_care_team_tenant ON dim_care_team(tenant_id);

-- ================================================================================
-- DIMENSION: ACTION PLAN
-- ================================================================================

CREATE TABLE IF NOT EXISTS dim_action_plan (
  action_plan_key SERIAL PRIMARY KEY,
  action_plan_id UUID NOT NULL,
  learner_id UUID NOT NULL,
  care_team_id UUID,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL,
  outcome_status VARCHAR(50),
  goal_count INTEGER NOT NULL DEFAULT 0,
  completed_goal_count INTEGER NOT NULL DEFAULT 0,
  task_count INTEGER NOT NULL DEFAULT 0,
  completed_task_count INTEGER NOT NULL DEFAULT 0,
  progress_percent NUMERIC(5,2) DEFAULT 0,
  start_date DATE,
  target_date DATE,
  completed_date DATE,
  tenant_id UUID NOT NULL,
  created_by_user_id UUID,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  source_updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dim_action_plan_current ON dim_action_plan(action_plan_id) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_dim_action_plan_learner ON dim_action_plan(learner_id);
CREATE INDEX IF NOT EXISTS idx_dim_action_plan_status ON dim_action_plan(status);
CREATE INDEX IF NOT EXISTS idx_dim_action_plan_tenant ON dim_action_plan(tenant_id);

-- ================================================================================
-- FACT: CARE TEAM EVENTS
-- ================================================================================

CREATE TABLE IF NOT EXISTS fact_care_team_event (
  event_key BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  date_key INTEGER NOT NULL REFERENCES dim_time(date_key),
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER REFERENCES dim_learner(learner_key),
  care_team_key INTEGER REFERENCES dim_care_team(care_team_key),
  event_type VARCHAR(50) NOT NULL,
  member_user_id UUID,
  member_role VARCHAR(50),
  team_size_after INTEGER,
  occurred_at TIMESTAMPTZ NOT NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_fact_care_team_event_date ON fact_care_team_event(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_care_team_event_tenant ON fact_care_team_event(tenant_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_care_team_event_team ON fact_care_team_event(care_team_key);
CREATE INDEX IF NOT EXISTS idx_fact_care_team_event_type ON fact_care_team_event(event_type);

-- ================================================================================
-- FACT: COLLABORATION MESSAGES
-- ================================================================================

CREATE TABLE IF NOT EXISTS fact_collaboration_message (
  message_key BIGSERIAL PRIMARY KEY,
  message_id UUID NOT NULL UNIQUE,
  date_key INTEGER NOT NULL REFERENCES dim_time(date_key),
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER REFERENCES dim_learner(learner_key),
  care_team_key INTEGER REFERENCES dim_care_team(care_team_key),
  action_plan_key INTEGER REFERENCES dim_action_plan(action_plan_key),
  thread_type VARCHAR(50) NOT NULL,
  thread_id UUID,
  sender_user_id UUID NOT NULL,
  sender_role VARCHAR(50),
  word_count INTEGER,
  has_attachment BOOLEAN DEFAULT FALSE,
  attachment_count INTEGER DEFAULT 0,
  is_reply BOOLEAN DEFAULT FALSE,
  reply_to_message_id UUID,
  response_time_minutes INTEGER,
  sent_at TIMESTAMPTZ NOT NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_fact_collab_msg_date ON fact_collaboration_message(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_collab_msg_tenant ON fact_collaboration_message(tenant_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_collab_msg_team ON fact_collaboration_message(care_team_key);
CREATE INDEX IF NOT EXISTS idx_fact_collab_msg_thread ON fact_collaboration_message(thread_type, thread_id);
CREATE INDEX IF NOT EXISTS idx_fact_collab_msg_sender ON fact_collaboration_message(sender_user_id);

-- ================================================================================
-- FACT: COLLABORATION MEETINGS
-- ================================================================================

CREATE TABLE IF NOT EXISTS fact_collaboration_meeting (
  meeting_key BIGSERIAL PRIMARY KEY,
  meeting_id UUID NOT NULL UNIQUE,
  date_key INTEGER NOT NULL REFERENCES dim_time(date_key),
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER REFERENCES dim_learner(learner_key),
  care_team_key INTEGER REFERENCES dim_care_team(care_team_key),
  action_plan_key INTEGER REFERENCES dim_action_plan(action_plan_key),
  meeting_type VARCHAR(50) NOT NULL,
  title VARCHAR(500),
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ,
  scheduled_duration_minutes INTEGER,
  invited_count INTEGER NOT NULL DEFAULT 0,
  attended_count INTEGER DEFAULT 0,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  actual_duration_minutes INTEGER,
  status VARCHAR(50) NOT NULL,
  organizer_user_id UUID NOT NULL,
  organizer_role VARCHAR(50),
  has_notes BOOLEAN DEFAULT FALSE,
  has_action_items BOOLEAN DEFAULT FALSE,
  action_item_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_fact_collab_meeting_date ON fact_collaboration_meeting(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_collab_meeting_tenant ON fact_collaboration_meeting(tenant_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_collab_meeting_team ON fact_collaboration_meeting(care_team_key);
CREATE INDEX IF NOT EXISTS idx_fact_collab_meeting_type ON fact_collaboration_meeting(meeting_type);
CREATE INDEX IF NOT EXISTS idx_fact_collab_meeting_status ON fact_collaboration_meeting(status);

-- ================================================================================
-- FACT: ACTION PLAN EVENTS
-- ================================================================================

CREATE TABLE IF NOT EXISTS fact_action_plan_event (
  event_key BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  date_key INTEGER NOT NULL REFERENCES dim_time(date_key),
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER REFERENCES dim_learner(learner_key),
  action_plan_key INTEGER REFERENCES dim_action_plan(action_plan_key),
  event_type VARCHAR(50) NOT NULL,
  goal_id UUID,
  goal_title VARCHAR(500),
  progress_before NUMERIC(5,2),
  progress_after NUMERIC(5,2),
  status_before VARCHAR(50),
  status_after VARCHAR(50),
  actor_user_id UUID,
  actor_role VARCHAR(50),
  occurred_at TIMESTAMPTZ NOT NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_fact_action_plan_event_date ON fact_action_plan_event(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_action_plan_event_tenant ON fact_action_plan_event(tenant_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_action_plan_event_plan ON fact_action_plan_event(action_plan_key);
CREATE INDEX IF NOT EXISTS idx_fact_action_plan_event_type ON fact_action_plan_event(event_type);

-- ================================================================================
-- FACT: COLLABORATION TASKS
-- ================================================================================

CREATE TABLE IF NOT EXISTS fact_collaboration_task (
  task_key BIGSERIAL PRIMARY KEY,
  task_id UUID NOT NULL,
  event_id UUID NOT NULL UNIQUE,
  date_key INTEGER NOT NULL REFERENCES dim_time(date_key),
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER REFERENCES dim_learner(learner_key),
  action_plan_key INTEGER REFERENCES dim_action_plan(action_plan_key),
  event_type VARCHAR(50) NOT NULL,
  task_title VARCHAR(500),
  priority VARCHAR(20),
  assignee_user_id UUID,
  assignee_role VARCHAR(50),
  due_date DATE,
  is_overdue BOOLEAN DEFAULT FALSE,
  days_overdue INTEGER,
  completed_at TIMESTAMPTZ,
  completion_time_days INTEGER,
  occurred_at TIMESTAMPTZ NOT NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_fact_collab_task_date ON fact_collaboration_task(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_collab_task_tenant ON fact_collaboration_task(tenant_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_collab_task_plan ON fact_collaboration_task(action_plan_key);
CREATE INDEX IF NOT EXISTS idx_fact_collab_task_assignee ON fact_collaboration_task(assignee_role);
CREATE INDEX IF NOT EXISTS idx_fact_collab_task_type ON fact_collaboration_task(event_type);
CREATE INDEX IF NOT EXISTS idx_fact_collab_task_priority ON fact_collaboration_task(priority);

-- ================================================================================
-- FACT: CARE NOTES
-- ================================================================================

CREATE TABLE IF NOT EXISTS fact_care_note (
  note_key BIGSERIAL PRIMARY KEY,
  note_id UUID NOT NULL,
  event_id UUID NOT NULL UNIQUE,
  date_key INTEGER NOT NULL REFERENCES dim_time(date_key),
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  learner_key INTEGER REFERENCES dim_learner(learner_key),
  care_team_key INTEGER REFERENCES dim_care_team(care_team_key),
  event_type VARCHAR(50) NOT NULL,
  note_type VARCHAR(50),
  creator_user_id UUID,
  creator_role VARCHAR(50),
  acknowledger_user_id UUID,
  acknowledger_role VARCHAR(50),
  acknowledgment_time_hours NUMERIC(10,2),
  word_count INTEGER,
  has_attachment BOOLEAN DEFAULT FALSE,
  occurred_at TIMESTAMPTZ NOT NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_fact_care_note_date ON fact_care_note(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_care_note_tenant ON fact_care_note(tenant_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_care_note_team ON fact_care_note(care_team_key);
CREATE INDEX IF NOT EXISTS idx_fact_care_note_type ON fact_care_note(note_type);
CREATE INDEX IF NOT EXISTS idx_fact_care_note_event ON fact_care_note(event_type);

-- ================================================================================
-- AGGREGATED: DAILY COLLABORATION METRICS
-- ================================================================================

CREATE TABLE IF NOT EXISTS agg_collaboration_metrics_daily (
  metric_key SERIAL PRIMARY KEY,
  date_key INTEGER NOT NULL REFERENCES dim_time(date_key),
  tenant_key INTEGER NOT NULL REFERENCES dim_tenant(tenant_key),
  UNIQUE(date_key, tenant_key),
  active_care_teams INTEGER NOT NULL DEFAULT 0,
  new_care_teams INTEGER NOT NULL DEFAULT 0,
  total_team_members INTEGER NOT NULL DEFAULT 0,
  avg_team_size NUMERIC(5,2),
  parent_members INTEGER NOT NULL DEFAULT 0,
  teacher_members INTEGER NOT NULL DEFAULT 0,
  counselor_members INTEGER NOT NULL DEFAULT 0,
  specialist_members INTEGER NOT NULL DEFAULT 0,
  active_action_plans INTEGER NOT NULL DEFAULT 0,
  new_action_plans INTEGER NOT NULL DEFAULT 0,
  completed_action_plans INTEGER NOT NULL DEFAULT 0,
  plans_on_track INTEGER NOT NULL DEFAULT 0,
  plans_needs_attention INTEGER NOT NULL DEFAULT 0,
  plans_at_risk INTEGER NOT NULL DEFAULT 0,
  avg_plan_progress NUMERIC(5,2),
  tasks_created INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_overdue INTEGER NOT NULL DEFAULT 0,
  task_completion_rate NUMERIC(5,4),
  avg_task_completion_days NUMERIC(10,2),
  messages_sent INTEGER NOT NULL DEFAULT 0,
  unique_message_senders INTEGER NOT NULL DEFAULT 0,
  avg_response_time_hours NUMERIC(10,2),
  meetings_scheduled INTEGER NOT NULL DEFAULT 0,
  meetings_held INTEGER NOT NULL DEFAULT 0,
  meeting_attendance_rate NUMERIC(5,4),
  total_meeting_minutes INTEGER NOT NULL DEFAULT 0,
  care_notes_created INTEGER NOT NULL DEFAULT 0,
  care_notes_acknowledged INTEGER NOT NULL DEFAULT 0,
  note_acknowledgment_rate NUMERIC(5,4),
  avg_acknowledgment_hours NUMERIC(10,2),
  engagement_rate NUMERIC(5,4),
  parent_engagement_rate NUMERIC(5,4),
  teacher_engagement_rate NUMERIC(5,4),
  computed_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agg_collab_metrics_date ON agg_collaboration_metrics_daily(date_key);
CREATE INDEX IF NOT EXISTS idx_agg_collab_metrics_tenant ON agg_collaboration_metrics_daily(tenant_key);

-- ================================================================================
-- VIEWS
-- ================================================================================

CREATE OR REPLACE VIEW v_daily_collaboration_engagement AS
SELECT
  t.full_date,
  ten.tenant_name,
  m.active_care_teams,
  m.active_action_plans,
  m.messages_sent,
  m.meetings_held,
  m.care_notes_created,
  m.task_completion_rate,
  m.engagement_rate,
  m.parent_engagement_rate
FROM dim_time t
JOIN agg_collaboration_metrics_daily m ON t.date_key = m.date_key
JOIN dim_tenant ten ON m.tenant_key = ten.tenant_key AND ten.is_current = TRUE;

CREATE OR REPLACE VIEW v_action_plan_outcomes AS
SELECT
  t.full_date,
  ap.status,
  ap.outcome_status,
  COUNT(*) as plan_count,
  AVG(ap.progress_percent) as avg_progress,
  AVG(ap.goal_count) as avg_goals,
  AVG(ap.completed_goal_count) as avg_completed_goals
FROM dim_time t
JOIN dim_action_plan ap ON ap.is_current = TRUE
  AND ap.effective_from <= t.full_date
GROUP BY t.full_date, ap.status, ap.outcome_status;

CREATE OR REPLACE VIEW v_care_team_activity_summary AS
SELECT
  t.full_date,
  ct.care_team_id,
  ct.learner_id,
  ct.member_count,
  COUNT(DISTINCT cm.message_key) as messages,
  COUNT(DISTINCT cn.note_key) as notes,
  COUNT(DISTINCT cmtg.meeting_key) as meetings
FROM dim_time t
JOIN dim_care_team ct ON ct.is_current = TRUE
  AND ct.effective_from <= t.full_date
LEFT JOIN fact_collaboration_message cm ON ct.care_team_key = cm.care_team_key
  AND t.date_key = cm.date_key
LEFT JOIN fact_care_note cn ON ct.care_team_key = cn.care_team_key
  AND t.date_key = cn.date_key
LEFT JOIN fact_collaboration_meeting cmtg ON ct.care_team_key = cmtg.care_team_key
  AND t.date_key = cmtg.date_key
GROUP BY t.full_date, ct.care_team_id, ct.learner_id, ct.member_count;
