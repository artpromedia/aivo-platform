# =============================================================================
# AIVO Platform - Monitoring Module Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

# -----------------------------------------------------------------------------
# Notification Settings
# -----------------------------------------------------------------------------

variable "alert_email" {
  description = "Email address for alert notifications"
  type        = string
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "slack_channel" {
  description = "Slack channel name for notifications"
  type        = string
  default     = "#aivo-alerts"
}

# -----------------------------------------------------------------------------
# Uptime Check Settings
# -----------------------------------------------------------------------------

variable "api_domain" {
  description = "Domain for API health checks"
  type        = string
}

variable "web_domain" {
  description = "Domain for web health checks"
  type        = string
}

# -----------------------------------------------------------------------------
# Thresholds
# -----------------------------------------------------------------------------

variable "cloudsql_max_connections" {
  description = "Maximum Cloud SQL connections (for alert threshold)"
  type        = number
  default     = 500
}

# -----------------------------------------------------------------------------
# Log Sink Settings
# -----------------------------------------------------------------------------

variable "audit_log_bucket" {
  description = "GCS bucket name for audit logs"
  type        = string
}

variable "error_log_dataset" {
  description = "BigQuery dataset name for application error logs"
  type        = string
  default     = "aivo_error_logs"
}

variable "k8s_namespace" {
  description = "Kubernetes namespace for the application"
  type        = string
  default     = "aivo"
}
