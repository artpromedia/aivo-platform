variable "project_id" {
  description = "GCP project ID for staging environment"
  type        = string
}

variable "region" {
  description = "GCP region for staging"
  type        = string
  default     = "us-central1"
}

variable "alert_email" {
  description = "Email address for alert notifications"
  type        = string
}

variable "slack_webhook_url" {
  description = "Slack webhook URL"
  type        = string
  default     = ""
}

variable "enable_cdn" {
  description = "Enable CDN"
  type        = bool
  default     = false
}

variable "cors_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
  default     = ["https://staging.aivo.io", "https://api.staging.aivo.io"]
}
