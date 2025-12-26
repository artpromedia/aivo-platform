-- Materialized Views for Performance Optimization
-- Pre-computed aggregates to reduce query load
-- Refresh strategies included for each view

-- ============================================================================
-- USER ENGAGEMENT SUMMARY
-- ============================================================================

-- Materialized view for user engagement metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_engagement_summary AS
SELECT 
    u.id AS user_id,
    u.tenant_id,
    COUNT(DISTINCT e.id) AS total_events,
    COUNT(DISTINCT DATE(e.created_at)) AS active_days,
    MIN(e.created_at) AS first_activity,
    MAX(e.created_at) AS last_activity,
    AVG(EXTRACT(EPOCH FROM (e.ended_at - e.created_at))) AS avg_session_duration_seconds,
    jsonb_object_agg(
        e.event_type, 
        COUNT(*) FILTER (WHERE e.event_type = event_type)
    ) AS event_counts
FROM users u
LEFT JOIN engagement_events e ON u.id = e.user_id
WHERE e.created_at >= NOW() - INTERVAL '90 days'
GROUP BY u.id, u.tenant_id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_engagement_user_id 
ON mv_user_engagement_summary (user_id);

CREATE INDEX IF NOT EXISTS idx_mv_user_engagement_tenant 
ON mv_user_engagement_summary (tenant_id);

-- ============================================================================
-- COURSE PROGRESS SUMMARY
-- ============================================================================

-- Materialized view for course progress
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_course_progress_summary AS
SELECT 
    e.user_id,
    e.course_id,
    c.tenant_id,
    c.title AS course_title,
    COUNT(DISTINCT lp.lesson_id) AS completed_lessons,
    (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS total_lessons,
    ROUND(
        (COUNT(DISTINCT lp.lesson_id)::decimal / 
        NULLIF((SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id), 0)) * 100, 
        2
    ) AS progress_percentage,
    AVG(g.score) AS average_score,
    SUM(lp.time_spent_seconds) AS total_time_spent_seconds,
    MAX(lp.completed_at) AS last_activity,
    e.enrolled_at
FROM enrollments e
JOIN courses c ON e.course_id = c.id
LEFT JOIN lesson_progress lp ON lp.user_id = e.user_id 
    AND lp.course_id = e.course_id 
    AND lp.status = 'completed'
LEFT JOIN grades g ON g.user_id = e.user_id 
    AND g.course_id = e.course_id
WHERE e.status = 'active'
GROUP BY e.user_id, e.course_id, c.tenant_id, c.title, e.enrolled_at
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_course_progress_user_course 
ON mv_course_progress_summary (user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_mv_course_progress_tenant 
ON mv_course_progress_summary (tenant_id);

CREATE INDEX IF NOT EXISTS idx_mv_course_progress_course 
ON mv_course_progress_summary (course_id);

-- ============================================================================
-- TENANT ANALYTICS SUMMARY
-- ============================================================================

-- Materialized view for tenant-level analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_analytics AS
SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    COUNT(DISTINCT u.id) AS total_users,
    COUNT(DISTINCT u.id) FILTER (WHERE u.last_login_at >= NOW() - INTERVAL '7 days') AS weekly_active_users,
    COUNT(DISTINCT u.id) FILTER (WHERE u.last_login_at >= NOW() - INTERVAL '30 days') AS monthly_active_users,
    COUNT(DISTINCT c.id) AS total_courses,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'published') AS published_courses,
    COUNT(DISTINCT e.id) AS total_enrollments,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'completed') AS completed_enrollments,
    ROUND(
        (COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'completed')::decimal / 
        NULLIF(COUNT(DISTINCT e.id), 0)) * 100, 
        2
    ) AS completion_rate,
    AVG(g.score) AS average_score,
    SUM(lp.time_spent_seconds) AS total_learning_time_seconds,
    NOW() AS refreshed_at
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id AND u.is_active = true
LEFT JOIN courses c ON c.tenant_id = t.id
LEFT JOIN enrollments e ON e.course_id = c.id
LEFT JOIN grades g ON g.course_id = c.id
LEFT JOIN lesson_progress lp ON lp.course_id = c.id
GROUP BY t.id, t.name
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_tenant_analytics_tenant_id 
ON mv_tenant_analytics (tenant_id);

-- ============================================================================
-- CONTENT POPULARITY
-- ============================================================================

-- Materialized view for content popularity metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_content_popularity AS
SELECT 
    c.id AS content_id,
    c.tenant_id,
    c.title,
    c.content_type,
    COUNT(DISTINCT cv.user_id) AS unique_views,
    COUNT(cv.id) AS total_views,
    COUNT(DISTINCT cv.user_id) FILTER (WHERE cv.created_at >= NOW() - INTERVAL '7 days') AS views_last_7_days,
    COUNT(DISTINCT cv.user_id) FILTER (WHERE cv.created_at >= NOW() - INTERVAL '30 days') AS views_last_30_days,
    AVG(cv.time_spent_seconds) AS avg_time_spent_seconds,
    AVG(r.rating) AS average_rating,
    COUNT(DISTINCT r.id) AS total_ratings,
    COALESCE(
        (COUNT(DISTINCT cv.user_id) * 0.4) + 
        (AVG(cv.time_spent_seconds) * 0.3) + 
        (AVG(r.rating) * 20 * 0.3),
        0
    ) AS popularity_score
FROM content c
LEFT JOIN content_views cv ON cv.content_id = c.id
LEFT JOIN ratings r ON r.content_id = c.id
WHERE c.status = 'published'
GROUP BY c.id, c.tenant_id, c.title, c.content_type
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_content_popularity_content_id 
ON mv_content_popularity (content_id);

CREATE INDEX IF NOT EXISTS idx_mv_content_popularity_tenant 
ON mv_content_popularity (tenant_id, popularity_score DESC);

-- ============================================================================
-- ASSESSMENT PERFORMANCE
-- ============================================================================

-- Materialized view for assessment analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_assessment_analytics AS
SELECT 
    a.id AS assessment_id,
    a.tenant_id,
    a.title AS assessment_title,
    a.course_id,
    COUNT(DISTINCT s.id) AS total_submissions,
    COUNT(DISTINCT s.user_id) AS unique_submitters,
    AVG(s.score) AS average_score,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.score) AS median_score,
    MIN(s.score) AS min_score,
    MAX(s.score) AS max_score,
    STDDEV(s.score) AS score_stddev,
    AVG(EXTRACT(EPOCH FROM (s.submitted_at - s.started_at))) AS avg_duration_seconds,
    COUNT(*) FILTER (WHERE s.score >= a.passing_score) AS passed_count,
    ROUND(
        (COUNT(*) FILTER (WHERE s.score >= a.passing_score)::decimal / 
        NULLIF(COUNT(*), 0)) * 100, 
        2
    ) AS pass_rate
FROM assessments a
LEFT JOIN assessment_submissions s ON s.assessment_id = a.id
WHERE a.status = 'published'
GROUP BY a.id, a.tenant_id, a.title, a.course_id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_assessment_analytics_id 
ON mv_assessment_analytics (assessment_id);

CREATE INDEX IF NOT EXISTS idx_mv_assessment_analytics_tenant 
ON mv_assessment_analytics (tenant_id);

CREATE INDEX IF NOT EXISTS idx_mv_assessment_analytics_course 
ON mv_assessment_analytics (course_id);

-- ============================================================================
-- DAILY METRICS ROLLUP
-- ============================================================================

-- Materialized view for daily metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_metrics AS
SELECT 
    t.id AS tenant_id,
    DATE(e.created_at) AS metric_date,
    COUNT(DISTINCT e.user_id) AS daily_active_users,
    COUNT(e.id) AS total_events,
    COUNT(e.id) FILTER (WHERE e.event_type = 'login') AS logins,
    COUNT(e.id) FILTER (WHERE e.event_type = 'lesson_complete') AS lessons_completed,
    COUNT(e.id) FILTER (WHERE e.event_type = 'assessment_submit') AS assessments_submitted,
    COUNT(e.id) FILTER (WHERE e.event_type = 'content_view') AS content_views,
    SUM(e.duration_seconds) AS total_engagement_seconds,
    AVG(e.duration_seconds) AS avg_session_duration_seconds
FROM tenants t
LEFT JOIN engagement_events e ON e.tenant_id = t.id
WHERE e.created_at >= NOW() - INTERVAL '90 days'
GROUP BY t.id, DATE(e.created_at)
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_metrics_tenant_date 
ON mv_daily_metrics (tenant_id, metric_date);

CREATE INDEX IF NOT EXISTS idx_mv_daily_metrics_date 
ON mv_daily_metrics (metric_date DESC);

-- ============================================================================
-- REFRESH FUNCTIONS
-- ============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_engagement_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_course_progress_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_content_popularity;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_assessment_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_metrics;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh specific view
CREATE OR REPLACE FUNCTION refresh_materialized_view(view_name text)
RETURNS void AS $$
BEGIN
    EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY ' || quote_ident(view_name);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- REFRESH SCHEDULING
-- ============================================================================

-- Note: Use pg_cron or external scheduler to run these refreshes
-- Example schedules:
-- - mv_daily_metrics: Every hour
-- - mv_user_engagement_summary: Every 6 hours
-- - mv_course_progress_summary: Every 4 hours
-- - mv_tenant_analytics: Every 12 hours
-- - mv_content_popularity: Every 6 hours
-- - mv_assessment_analytics: Every 4 hours

-- Create a table to track refresh history
CREATE TABLE IF NOT EXISTS materialized_view_refresh_log (
    id SERIAL PRIMARY KEY,
    view_name VARCHAR(100) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    status VARCHAR(20) DEFAULT 'running',
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_mv_refresh_log_view_date 
ON materialized_view_refresh_log (view_name, started_at DESC);

-- Function to refresh with logging
CREATE OR REPLACE FUNCTION refresh_materialized_view_with_logging(view_name text)
RETURNS void AS $$
DECLARE
    start_time TIMESTAMP;
    log_id INTEGER;
BEGIN
    start_time := NOW();
    
    INSERT INTO materialized_view_refresh_log (view_name, started_at)
    VALUES (view_name, start_time)
    RETURNING id INTO log_id;
    
    BEGIN
        EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY ' || quote_ident(view_name);
        
        UPDATE materialized_view_refresh_log
        SET completed_at = NOW(),
            duration_ms = EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000,
            status = 'completed'
        WHERE id = log_id;
    EXCEPTION WHEN OTHERS THEN
        UPDATE materialized_view_refresh_log
        SET completed_at = NOW(),
            duration_ms = EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000,
            status = 'failed',
            error_message = SQLERRM
        WHERE id = log_id;
        RAISE;
    END;
END;
$$ LANGUAGE plpgsql;
