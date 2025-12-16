# =============================================================================
# AIVO Platform - Production Environment Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID for production environment"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "alert_email" {
  description = "Email address for alert notifications"
  type        = string
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  sensitive   = true
}

variable "cors_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
}

variable "cdn_domains" {
  description = "CDN domains"
  type        = list(string)
}
