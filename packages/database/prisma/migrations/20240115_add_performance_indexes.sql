-- Performance Indexes Migration
-- Add indexes for frequently queried columns to improve query performance
-- Target: Query P95 < 50ms

-- ============================================================================
-- USER & AUTHENTICATION INDEXES
-- ============================================================================

-- Index for user lookups by email (most common auth query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower 
ON users (LOWER(email));

-- Index for user tenant isolation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_id 
ON users (tenant_id);

-- Index for active users query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_tenant 
ON users (tenant_id, is_active) 
WHERE is_active = true;

-- Composite index for user search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search 
ON users (tenant_id, last_name, first_name);

-- ============================================================================
-- CONTENT & LEARNING INDEXES
-- ============================================================================

-- Index for content by tenant and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_tenant_status 
ON content (tenant_id, status, created_at DESC);

-- Index for published content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_published 
ON content (tenant_id, published_at DESC) 
WHERE status = 'published';

-- Index for content search by title
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_title_search 
ON content USING gin (to_tsvector('english', title));

-- Index for content tags (assuming JSONB column)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_tags 
ON content USING gin (tags);

-- Index for lesson progress lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lesson_progress_user 
ON lesson_progress (user_id, lesson_id, updated_at DESC);

-- Index for course enrollment
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_user_course 
ON enrollments (user_id, course_id, status);

-- ============================================================================
-- ASSESSMENT & GRADING INDEXES
-- ============================================================================

-- Index for assessment submissions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_user_assessment 
ON assessment_submissions (user_id, assessment_id, submitted_at DESC);

-- Index for pending grading
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_pending_grading 
ON assessment_submissions (assessment_id, grading_status, submitted_at) 
WHERE grading_status = 'pending';

-- Index for grade lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grades_user_course 
ON grades (user_id, course_id, created_at DESC);

-- ============================================================================
-- SESSION & ENGAGEMENT INDEXES
-- ============================================================================

-- Index for active sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_active 
ON sessions (user_id, expires_at) 
WHERE is_active = true;

-- Index for session analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_tenant_created 
ON sessions (tenant_id, created_at DESC);

-- Index for engagement events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_engagement_events_user_time 
ON engagement_events (user_id, event_type, created_at DESC);

-- Index for event aggregation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_engagement_events_tenant_type 
ON engagement_events (tenant_id, event_type, created_at DESC);

-- ============================================================================
-- NOTIFICATION & MESSAGING INDEXES
-- ============================================================================

-- Index for unread notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
ON notifications (user_id, created_at DESC) 
WHERE read_at IS NULL;

-- Index for notification cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created 
ON notifications (created_at);

-- Index for message threads
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_thread 
ON messages (thread_id, created_at DESC);

-- ============================================================================
-- ANALYTICS & REPORTING INDEXES
-- ============================================================================

-- Index for daily stats rollup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_stats_tenant_date 
ON daily_stats (tenant_id, stat_date DESC);

-- Index for user activity analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_date_range 
ON user_activity (user_id, activity_date DESC);

-- Composite index for reporting queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_tenant_type_date 
ON user_activity (tenant_id, activity_type, activity_date DESC);

-- ============================================================================
-- BILLING & SUBSCRIPTION INDEXES
-- ============================================================================

-- Index for active subscriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_tenant_active 
ON subscriptions (tenant_id, status, current_period_end) 
WHERE status = 'active';

-- Index for billing history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_tenant_date 
ON invoices (tenant_id, created_at DESC);

-- Index for payment processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status_created 
ON payments (status, created_at) 
WHERE status = 'pending';

-- ============================================================================
-- AUDIT & COMPLIANCE INDEXES
-- ============================================================================

-- Index for audit log queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action 
ON audit_logs (user_id, action, created_at DESC);

-- Index for compliance reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_tenant_date 
ON audit_logs (tenant_id, created_at DESC);

-- Index for resource-specific audit
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource 
ON audit_logs (resource_type, resource_id, created_at DESC);

-- ============================================================================
-- TENANT & ORGANIZATION INDEXES
-- ============================================================================

-- Index for tenant lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_slug 
ON tenants (slug);

-- Index for organization hierarchy
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_parent 
ON organizations (parent_id, tenant_id);

-- ============================================================================
-- PERFORMANCE MONITORING
-- ============================================================================

-- Index for slow query tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_stats_duration 
ON query_stats (duration_ms DESC, created_at DESC) 
WHERE duration_ms > 100;

-- ============================================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================================================

-- Partial index for soft-deleted records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_not_deleted 
ON users (id, tenant_id) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_not_deleted 
ON content (id, tenant_id) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- STATISTICS UPDATE
-- ============================================================================

-- Analyze tables after index creation for query planner
ANALYZE users;
ANALYZE content;
ANALYZE lesson_progress;
ANALYZE enrollments;
ANALYZE assessment_submissions;
ANALYZE grades;
ANALYZE sessions;
ANALYZE engagement_events;
ANALYZE notifications;
ANALYZE messages;
ANALYZE daily_stats;
ANALYZE user_activity;
ANALYZE subscriptions;
ANALYZE invoices;
ANALYZE payments;
ANALYZE audit_logs;
ANALYZE tenants;
ANALYZE organizations;
