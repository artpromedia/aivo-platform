# =============================================================================
# AIVO Platform - Secrets Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Auto-generated Secret IDs
# -----------------------------------------------------------------------------

output "jwt_secret_id" {
  description = "JWT signing key secret ID"
  value       = google_secret_manager_secret.jwt_secret.secret_id
}

output "session_key_secret_id" {
  description = "Session encryption key secret ID"
  value       = google_secret_manager_secret.session_key.secret_id
}

output "api_signing_key_secret_id" {
  description = "API signing key secret ID"
  value       = google_secret_manager_secret.api_signing_key.secret_id
}

# -----------------------------------------------------------------------------
# External Service Secret IDs
# -----------------------------------------------------------------------------

output "openai_api_key_secret_id" {
  description = "OpenAI API key secret ID"
  value       = google_secret_manager_secret.openai_api_key.secret_id
}

output "anthropic_api_key_secret_id" {
  description = "Anthropic API key secret ID"
  value       = google_secret_manager_secret.anthropic_api_key.secret_id
}

output "stripe_secret_key_secret_id" {
  description = "Stripe secret key secret ID"
  value       = google_secret_manager_secret.stripe_secret_key.secret_id
}

output "stripe_webhook_secret_id" {
  description = "Stripe webhook secret ID"
  value       = google_secret_manager_secret.stripe_webhook_secret.secret_id
}

output "sendgrid_api_key_secret_id" {
  description = "SendGrid API key secret ID"
  value       = google_secret_manager_secret.sendgrid_api_key.secret_id
}

output "twilio_auth_token_secret_id" {
  description = "Twilio auth token secret ID"
  value       = google_secret_manager_secret.twilio_auth_token.secret_id
}

output "firebase_credentials_secret_id" {
  description = "Firebase credentials secret ID"
  value       = google_secret_manager_secret.firebase_credentials.secret_id
}

# -----------------------------------------------------------------------------
# OAuth Secret IDs
# -----------------------------------------------------------------------------

output "google_oauth_secret_id" {
  description = "Google OAuth client secret ID"
  value       = google_secret_manager_secret.google_oauth_secret.secret_id
}

output "clever_oauth_secret_id" {
  description = "Clever OAuth client secret ID"
  value       = google_secret_manager_secret.clever_oauth_secret.secret_id
}

output "classlink_oauth_secret_id" {
  description = "ClassLink OAuth client secret ID"
  value       = google_secret_manager_secret.classlink_oauth_secret.secret_id
}

# -----------------------------------------------------------------------------
# LTI Secret IDs
# -----------------------------------------------------------------------------

output "lti_private_key_secret_id" {
  description = "LTI private key secret ID"
  value       = google_secret_manager_secret.lti_private_key.secret_id
}

output "lti_public_key_secret_id" {
  description = "LTI public key secret ID"
  value       = google_secret_manager_secret.lti_public_key.secret_id
}

output "lti_public_key_pem" {
  description = "LTI public key in PEM format (for JWKS endpoint)"
  value       = tls_private_key.lti_key.public_key_pem
  sensitive   = true
}

# -----------------------------------------------------------------------------
# All Secret IDs (for reference)
# -----------------------------------------------------------------------------

output "all_secret_ids" {
  description = "Map of all managed secret IDs"
  value = {
    jwt_secret           = google_secret_manager_secret.jwt_secret.secret_id
    session_key          = google_secret_manager_secret.session_key.secret_id
    api_signing_key      = google_secret_manager_secret.api_signing_key.secret_id
    openai_api_key       = google_secret_manager_secret.openai_api_key.secret_id
    anthropic_api_key    = google_secret_manager_secret.anthropic_api_key.secret_id
    stripe_secret_key    = google_secret_manager_secret.stripe_secret_key.secret_id
    stripe_webhook_secret = google_secret_manager_secret.stripe_webhook_secret.secret_id
    sendgrid_api_key     = google_secret_manager_secret.sendgrid_api_key.secret_id
    twilio_auth_token    = google_secret_manager_secret.twilio_auth_token.secret_id
    firebase_credentials = google_secret_manager_secret.firebase_credentials.secret_id
    google_oauth         = google_secret_manager_secret.google_oauth_secret.secret_id
    clever_oauth         = google_secret_manager_secret.clever_oauth_secret.secret_id
    classlink_oauth      = google_secret_manager_secret.classlink_oauth_secret.secret_id
    lti_private_key      = google_secret_manager_secret.lti_private_key.secret_id
    lti_public_key       = google_secret_manager_secret.lti_public_key.secret_id
  }
}
