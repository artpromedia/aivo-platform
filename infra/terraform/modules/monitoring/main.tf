# =============================================================================
# AIVO Platform - Monitoring Module
# =============================================================================
# Configures Cloud Monitoring dashboards, alerting policies, and log sinks
# =============================================================================

# -----------------------------------------------------------------------------
# Notification Channel (PagerDuty/Slack/Email)
# -----------------------------------------------------------------------------

resource "google_monitoring_notification_channel" "email" {
  display_name = "AIVO Platform Alerts - ${var.environment}"
  type         = "email"
  
  labels = {
    email_address = var.alert_email
  }
}

resource "google_monitoring_notification_channel" "slack" {
  count = var.slack_webhook_url != "" ? 1 : 0

  display_name = "AIVO Slack - ${var.environment}"
  type         = "slack"
  
  labels = {
    channel_name = var.slack_channel
  }

  sensitive_labels {
    auth_token = var.slack_webhook_url
  }
}

# -----------------------------------------------------------------------------
# Uptime Checks
# -----------------------------------------------------------------------------

resource "google_monitoring_uptime_check_config" "api_health" {
  display_name = "AIVO API Health - ${var.environment}"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path           = "/health"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.api_domain
    }
  }

  content_matchers {
    content = "ok"
    matcher = "CONTAINS_STRING"
  }
}

resource "google_monitoring_uptime_check_config" "web_health" {
  display_name = "AIVO Web Health - ${var.environment}"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path           = "/"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.web_domain
    }
  }

  content_matchers {
    content = "AIVO"
    matcher = "CONTAINS_STRING"
  }
}

# -----------------------------------------------------------------------------
# Alert Policies - GKE
# -----------------------------------------------------------------------------

resource "google_monitoring_alert_policy" "gke_pod_crash_loop" {
  display_name = "GKE Pod CrashLoopBackOff - ${var.environment}"
  combiner     = "OR"

  conditions {
    display_name = "Pod in CrashLoopBackOff"
    
    condition_threshold {
      filter          = "resource.type=\"k8s_container\" AND metric.type=\"kubernetes.io/container/restart_count\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 5
      
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.pod_name", "resource.label.namespace_name"]
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "604800s"
  }

  documentation {
    content   = "A pod is experiencing repeated restarts (CrashLoopBackOff). Check pod logs for details."
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "gke_node_cpu_high" {
  display_name = "GKE Node High CPU - ${var.environment}"
  combiner     = "OR"

  conditions {
    display_name = "Node CPU > 85%"
    
    condition_threshold {
      filter          = "resource.type=\"k8s_node\" AND metric.type=\"kubernetes.io/node/cpu/allocatable_utilization\""
      duration        = "600s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_MEAN"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["resource.label.node_name"]
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "86400s"
  }

  documentation {
    content   = "GKE node CPU utilization is above 85%. Consider scaling the node pool."
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "gke_node_memory_high" {
  display_name = "GKE Node High Memory - ${var.environment}"
  combiner     = "OR"

  conditions {
    display_name = "Node Memory > 85%"
    
    condition_threshold {
      filter          = "resource.type=\"k8s_node\" AND metric.type=\"kubernetes.io/node/memory/allocatable_utilization\""
      duration        = "600s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_MEAN"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["resource.label.node_name"]
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "86400s"
  }

  documentation {
    content   = "GKE node memory utilization is above 85%. Consider scaling the node pool or optimizing workloads."
    mime_type = "text/markdown"
  }
}

# -----------------------------------------------------------------------------
# Alert Policies - Cloud SQL
# -----------------------------------------------------------------------------

resource "google_monitoring_alert_policy" "cloudsql_cpu_high" {
  display_name = "Cloud SQL High CPU - ${var.environment}"
  combiner     = "OR"

  conditions {
    display_name = "Cloud SQL CPU > 80%"
    
    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\""
      duration        = "600s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "86400s"
  }

  documentation {
    content   = "Cloud SQL CPU utilization is above 80%. Consider upgrading the instance tier."
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "cloudsql_disk_high" {
  display_name = "Cloud SQL High Disk Usage - ${var.environment}"
  combiner     = "OR"

  conditions {
    display_name = "Cloud SQL Disk > 80%"
    
    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/disk/utilization\""
      duration        = "600s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "86400s"
  }

  documentation {
    content   = "Cloud SQL disk utilization is above 80%. Consider increasing disk size or cleaning up data."
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "cloudsql_connections_high" {
  display_name = "Cloud SQL High Connections - ${var.environment}"
  combiner     = "OR"

  conditions {
    display_name = "Cloud SQL Connections > 80% of max"
    
    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/postgresql/num_backends\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.cloudsql_max_connections * 0.8
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "86400s"
  }

  documentation {
    content   = "Cloud SQL connection count is above 80% of the maximum. Check for connection leaks or consider increasing max_connections."
    mime_type = "text/markdown"
  }
}

# -----------------------------------------------------------------------------
# Alert Policies - Redis
# -----------------------------------------------------------------------------

resource "google_monitoring_alert_policy" "redis_memory_high" {
  display_name = "Redis High Memory - ${var.environment}"
  combiner     = "OR"

  conditions {
    display_name = "Redis Memory > 80%"
    
    condition_threshold {
      filter          = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/memory/usage_ratio\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "86400s"
  }

  documentation {
    content   = "Redis memory usage is above 80%. Consider increasing memory or implementing eviction policies."
    mime_type = "text/markdown"
  }
}

# -----------------------------------------------------------------------------
# Alert Policies - Error Rate
# -----------------------------------------------------------------------------

resource "google_monitoring_alert_policy" "error_rate_high" {
  display_name = "High Error Rate - ${var.environment}"
  combiner     = "OR"

  conditions {
    display_name = "HTTP 5xx Error Rate > 5%"
    
    condition_threshold {
      filter = <<-EOT
        resource.type="k8s_container"
        AND metric.type="logging.googleapis.com/user/http_status_5xx"
      EOT
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "86400s"
  }

  documentation {
    content   = "HTTP 5xx error rate is above 5%. Check application logs for errors."
    mime_type = "text/markdown"
  }
}

# -----------------------------------------------------------------------------
# Alert Policies - Uptime
# -----------------------------------------------------------------------------

resource "google_monitoring_alert_policy" "api_uptime" {
  display_name = "API Uptime Check Failed - ${var.environment}"
  combiner     = "OR"

  conditions {
    display_name = "API Health Check Failed"
    
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.labels.check_id=\"${google_monitoring_uptime_check_config.api_health.uptime_check_id}\""
      duration        = "60s"
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_FRACTION_TRUE"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "86400s"
  }

  documentation {
    content   = "API health check is failing. Check API service status and logs."
    mime_type = "text/markdown"
  }
}

# -----------------------------------------------------------------------------
# Log Sinks for Audit Logging
# -----------------------------------------------------------------------------

resource "google_logging_project_sink" "audit_logs" {
  name                   = "aivo-audit-logs-${var.environment}"
  destination            = "storage.googleapis.com/${var.audit_log_bucket}"
  filter                 = <<-EOT
    logName:"cloudaudit.googleapis.com"
    OR logName:"activity"
    OR logName:"data_access"
  EOT
  unique_writer_identity = true
}

resource "google_storage_bucket_iam_member" "audit_logs_writer" {
  bucket = var.audit_log_bucket
  role   = "roles/storage.objectCreator"
  member = google_logging_project_sink.audit_logs.writer_identity
}

# Application error logs to BigQuery
resource "google_logging_project_sink" "app_errors" {
  name        = "aivo-app-errors-${var.environment}"
  destination = "bigquery.googleapis.com/projects/${var.project_id}/datasets/${var.error_log_dataset}"
  filter      = <<-EOT
    resource.type="k8s_container"
    AND severity>=ERROR
    AND resource.labels.namespace_name="${var.k8s_namespace}"
  EOT
  unique_writer_identity = true

  bigquery_options {
    use_partitioned_tables = true
  }
}

# -----------------------------------------------------------------------------
# Custom Log-Based Metrics
# -----------------------------------------------------------------------------

resource "google_logging_metric" "http_latency" {
  name   = "http_request_latency_${var.environment}"
  filter = <<-EOT
    resource.type="k8s_container"
    AND resource.labels.namespace_name="${var.k8s_namespace}"
    AND jsonPayload.latency_ms:*
  EOT
  
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "DISTRIBUTION"
    unit        = "ms"
    labels {
      key         = "service"
      value_type  = "STRING"
      description = "Service name"
    }
    labels {
      key         = "method"
      value_type  = "STRING"
      description = "HTTP method"
    }
    labels {
      key         = "path"
      value_type  = "STRING"
      description = "Request path"
    }
  }

  value_extractor = "EXTRACT(jsonPayload.latency_ms)"

  label_extractors = {
    "service" = "EXTRACT(resource.labels.container_name)"
    "method"  = "EXTRACT(jsonPayload.method)"
    "path"    = "EXTRACT(jsonPayload.path)"
  }

  bucket_options {
    explicit_buckets {
      bounds = [0, 10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    }
  }
}

resource "google_logging_metric" "error_count" {
  name   = "application_error_count_${var.environment}"
  filter = <<-EOT
    resource.type="k8s_container"
    AND resource.labels.namespace_name="${var.k8s_namespace}"
    AND severity>=ERROR
  EOT
  
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key         = "service"
      value_type  = "STRING"
      description = "Service name"
    }
    labels {
      key         = "error_type"
      value_type  = "STRING"
      description = "Error type"
    }
  }

  label_extractors = {
    "service"    = "EXTRACT(resource.labels.container_name)"
    "error_type" = "EXTRACT(jsonPayload.error_type)"
  }
}

# -----------------------------------------------------------------------------
# Monitoring Dashboard
# -----------------------------------------------------------------------------

resource "google_monitoring_dashboard" "main" {
  dashboard_json = jsonencode({
    displayName = "AIVO Platform Overview - ${var.environment}"
    gridLayout = {
      columns = 3
      widgets = [
        # Row 1: Health Overview
        {
          title = "API Health"
          scorecard = {
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\""
              }
            }
            sparkChartView = {
              sparkChartType = "SPARK_LINE"
            }
          }
        },
        {
          title = "Error Rate"
          scorecard = {
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.error_count.name}\""
              }
            }
            sparkChartView = {
              sparkChartType = "SPARK_LINE"
            }
          }
        },
        {
          title = "Active Users"
          scorecard = {
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"k8s_container\" AND metric.type=\"custom.googleapis.com/aivo/active_users\""
              }
            }
          }
        },
        # Row 2: GKE Metrics
        {
          title = "GKE CPU Utilization"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"k8s_node\" AND metric.type=\"kubernetes.io/node/cpu/allocatable_utilization\""
                }
              }
            }]
          }
        },
        {
          title = "GKE Memory Utilization"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"k8s_node\" AND metric.type=\"kubernetes.io/node/memory/allocatable_utilization\""
                }
              }
            }]
          }
        },
        {
          title = "Pod Count by Namespace"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"k8s_pod\" AND metric.type=\"kubernetes.io/pod/volume/total_bytes\""
                }
              }
            }]
          }
        },
        # Row 3: Database Metrics
        {
          title = "Cloud SQL CPU"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\""
                }
              }
            }]
          }
        },
        {
          title = "Cloud SQL Connections"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/postgresql/num_backends\""
                }
              }
            }]
          }
        },
        {
          title = "Redis Memory"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/memory/usage_ratio\""
                }
              }
            }]
          }
        }
      ]
    }
  })
}
