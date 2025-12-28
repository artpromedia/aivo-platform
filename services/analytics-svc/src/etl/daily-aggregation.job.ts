// ETL Aggregation Job - Daily Analytics Rollup
import { Redshift, ExecuteStatementCommand } from '@aws-sdk/client-redshift-data';

const redshift = new Redshift({
  region: process.env.AWS_REGION || 'us-east-1',
});

const DATABASE = process.env.REDSHIFT_DATABASE || 'analytics';
const CLUSTER_ID = process.env.REDSHIFT_CLUSTER_ID || '';
const DB_USER = process.env.REDSHIFT_USER || 'analytics_user';

async function executeSQL(sql: string): Promise<void> {
  await redshift.send(new ExecuteStatementCommand({
    ClusterIdentifier: CLUSTER_ID,
    Database: DATABASE,
    DbUser: DB_USER,
    Sql: sql,
  }));
}

export async function runDailyStudentAggregation(targetDate: string): Promise<void> {
  const sql = `
    INSERT INTO analytics.agg_daily_student_metrics (
      student_id, tenant_id, metric_date,
      total_time_minutes, lessons_completed, skills_practiced,
      avg_accuracy, mastery_gains, streak_days,
      questions_answered, questions_correct, sessions_count
    )
    SELECT
      student_id,
      tenant_id,
      DATE(event_timestamp) as metric_date,
      SUM(CASE WHEN metric_name = 'duration_seconds' THEN metric_value / 60.0 ELSE 0 END) as total_time_minutes,
      COUNT(DISTINCT CASE WHEN event_type = 'lesson_completed' THEN event_id END) as lessons_completed,
      COUNT(DISTINCT skill_id) as skills_practiced,
      AVG(CASE WHEN metric_name = 'accuracy' THEN metric_value END) as avg_accuracy,
      SUM(CASE WHEN metric_name = 'mastery_delta' AND metric_value > 0 THEN metric_value ELSE 0 END) as mastery_gains,
      MAX(CASE WHEN metric_name = 'streak_days' THEN metric_value ELSE 0 END) as streak_days,
      COUNT(CASE WHEN event_type = 'question_answered' THEN 1 END) as questions_answered,
      COUNT(CASE WHEN event_type = 'question_answered' AND JSON_EXTRACT_PATH_TEXT(event_context, 'is_correct') = 'true' THEN 1 END) as questions_correct,
      COUNT(DISTINCT session_id) as sessions_count
    FROM analytics.fact_analytics_events
    WHERE DATE(event_timestamp) = '${targetDate}'
    GROUP BY student_id, tenant_id, DATE(event_timestamp)
    ON CONFLICT (student_id, metric_date) DO UPDATE SET
      total_time_minutes = EXCLUDED.total_time_minutes,
      lessons_completed = EXCLUDED.lessons_completed,
      updated_at = CURRENT_TIMESTAMP;
  `;
  
  await executeSQL(sql);
  console.log(`✓ Daily student aggregation completed for ${targetDate}`);
}

export async function runDailyClassAggregation(targetDate: string): Promise<void> {
  const sql = `
    INSERT INTO analytics.agg_daily_class_metrics (
      class_id, tenant_id, metric_date,
      active_students, avg_time_minutes,
      avg_accuracy, lessons_completed
    )
    SELECT
      class_id,
      tenant_id,
      DATE(event_timestamp) as metric_date,
      COUNT(DISTINCT student_id) as active_students,
      AVG(CASE WHEN metric_name = 'duration_seconds' THEN metric_value / 60.0 END) as avg_time_minutes,
      AVG(CASE WHEN metric_name = 'accuracy' THEN metric_value END) as avg_accuracy,
      COUNT(DISTINCT CASE WHEN event_type = 'lesson_completed' THEN event_id END) as lessons_completed
    FROM analytics.fact_analytics_events
    WHERE DATE(event_timestamp) = '${targetDate}'
      AND class_id IS NOT NULL
    GROUP BY class_id, tenant_id, DATE(event_timestamp)
    ON CONFLICT (class_id, metric_date) DO UPDATE SET
      active_students = EXCLUDED.active_students,
      avg_time_minutes = EXCLUDED.avg_time_minutes,
      updated_at = CURRENT_TIMESTAMP;
  `;
  
  await executeSQL(sql);
  console.log(`✓ Daily class aggregation completed for ${targetDate}`);
}

export async function runAtRiskIdentification(): Promise<void> {
  const sql = `
    INSERT INTO analytics.analytics_at_risk_students (
      student_id, tenant_id, class_id,
      risk_score, risk_factors, last_activity_date
    )
    SELECT
      s.student_id,
      s.tenant_id,
      s.class_id,
      CASE
        WHEN s.days_inactive > 7 THEN 0.9
        WHEN s.avg_accuracy < 0.5 THEN 0.8
        WHEN s.mastery_trend < -0.1 THEN 0.7
        ELSE 0.3
      END as risk_score,
      CASE
        WHEN s.days_inactive > 7 THEN '["inactivity"]'
        WHEN s.avg_accuracy < 0.5 THEN '["low_accuracy"]'
        ELSE '[]'
      END as risk_factors,
      s.last_activity
    FROM (
      SELECT
        student_id,
        tenant_id,
        class_id,
        DATEDIFF(day, MAX(event_timestamp), CURRENT_DATE) as days_inactive,
        AVG(CASE WHEN metric_name = 'accuracy' THEN metric_value END) as avg_accuracy,
        0 as mastery_trend,
        MAX(event_timestamp) as last_activity
      FROM analytics.fact_analytics_events
      WHERE event_timestamp > DATEADD(day, -30, CURRENT_DATE)
      GROUP BY student_id, tenant_id, class_id
    ) s
    WHERE s.days_inactive > 3 OR s.avg_accuracy < 0.6
    ON CONFLICT (student_id) DO UPDATE SET
      risk_score = EXCLUDED.risk_score,
      risk_factors = EXCLUDED.risk_factors,
      updated_at = CURRENT_TIMESTAMP;
  `;
  
  await executeSQL(sql);
  console.log(`✓ At-risk student identification completed`);
}

// Main entry point for scheduled job
export async function runDailyAggregations(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = yesterday.toISOString().split('T')[0];
  
  console.log(`Starting daily aggregations for ${targetDate}...`);
  
  await runDailyStudentAggregation(targetDate);
  await runDailyClassAggregation(targetDate);
  await runAtRiskIdentification();
  
  console.log('All daily aggregations completed successfully');
}

// Run if invoked directly
if (require.main === module) {
  runDailyAggregations().catch(console.error);
}
