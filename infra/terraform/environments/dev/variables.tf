# =============================================================================
# AIVO Platform - Development Environment Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID for development environment"
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
  default     = "dev-alerts@aivo.example.com"
}
