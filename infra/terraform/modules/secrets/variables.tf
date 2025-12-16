# =============================================================================
# AIVO Platform - Secrets Module Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "application_service_account_email" {
  description = "Email of the application service account to grant secret access"
  type        = string
}

# -----------------------------------------------------------------------------
# External Service Configuration (optional - for auto-populating secrets)
# -----------------------------------------------------------------------------

variable "external_secrets" {
  description = "External service secrets to auto-populate (optional)"
  type = object({
    openai_api_key       = optional(string)
    anthropic_api_key    = optional(string)
    stripe_secret_key    = optional(string)
    stripe_webhook_secret = optional(string)
    sendgrid_api_key     = optional(string)
    twilio_auth_token    = optional(string)
    firebase_credentials = optional(string)
    google_oauth_secret  = optional(string)
    clever_oauth_secret  = optional(string)
    classlink_oauth_secret = optional(string)
  })
  default  = {}
  sensitive = true
}
