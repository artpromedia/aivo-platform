# =============================================================================
# AIVO Platform - Staging Environment Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID for staging environment"
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
  default     = ""
  sensitive   = true
}

variable "cors_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
  default     = ["https://staging.aivo.io"]
}

variable "enable_cdn" {
  description = "Enable CDN for staging"
  type        = bool
  default     = false
}
