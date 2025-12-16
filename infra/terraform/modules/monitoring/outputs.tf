# =============================================================================
# AIVO Platform - Monitoring Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Notification Channels
# -----------------------------------------------------------------------------

output "email_notification_channel_id" {
  description = "Email notification channel ID"
  value       = google_monitoring_notification_channel.email.id
}

output "slack_notification_channel_id" {
  description = "Slack notification channel ID (if configured)"
  value       = length(google_monitoring_notification_channel.slack) > 0 ? google_monitoring_notification_channel.slack[0].id : null
}

# -----------------------------------------------------------------------------
# Uptime Check IDs
# -----------------------------------------------------------------------------

output "api_uptime_check_id" {
  description = "API uptime check ID"
  value       = google_monitoring_uptime_check_config.api_health.uptime_check_id
}

output "web_uptime_check_id" {
  description = "Web uptime check ID"
  value       = google_monitoring_uptime_check_config.web_health.uptime_check_id
}

# -----------------------------------------------------------------------------
# Alert Policy IDs
# -----------------------------------------------------------------------------

output "alert_policy_ids" {
  description = "Map of alert policy names to IDs"
  value = {
    gke_pod_crash_loop    = google_monitoring_alert_policy.gke_pod_crash_loop.id
    gke_node_cpu_high     = google_monitoring_alert_policy.gke_node_cpu_high.id
    gke_node_memory_high  = google_monitoring_alert_policy.gke_node_memory_high.id
    cloudsql_cpu_high     = google_monitoring_alert_policy.cloudsql_cpu_high.id
    cloudsql_disk_high    = google_monitoring_alert_policy.cloudsql_disk_high.id
    cloudsql_connections  = google_monitoring_alert_policy.cloudsql_connections_high.id
    redis_memory_high     = google_monitoring_alert_policy.redis_memory_high.id
    error_rate_high       = google_monitoring_alert_policy.error_rate_high.id
    api_uptime            = google_monitoring_alert_policy.api_uptime.id
  }
}

# -----------------------------------------------------------------------------
# Log Sinks
# -----------------------------------------------------------------------------

output "audit_logs_sink_name" {
  description = "Audit logs sink name"
  value       = google_logging_project_sink.audit_logs.name
}

output "app_errors_sink_name" {
  description = "Application errors sink name"
  value       = google_logging_project_sink.app_errors.name
}

# -----------------------------------------------------------------------------
# Custom Metrics
# -----------------------------------------------------------------------------

output "http_latency_metric_name" {
  description = "HTTP latency custom metric name"
  value       = google_logging_metric.http_latency.name
}

output "error_count_metric_name" {
  description = "Error count custom metric name"
  value       = google_logging_metric.error_count.name
}

# -----------------------------------------------------------------------------
# Dashboard
# -----------------------------------------------------------------------------

output "dashboard_id" {
  description = "Monitoring dashboard ID"
  value       = google_monitoring_dashboard.main.id
}
