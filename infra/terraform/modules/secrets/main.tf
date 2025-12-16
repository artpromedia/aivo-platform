# =============================================================================
# AIVO Platform - Secrets Module
# =============================================================================
# Manages application secrets in Secret Manager
# =============================================================================

# -----------------------------------------------------------------------------
# Core Application Secrets
# -----------------------------------------------------------------------------

# JWT Signing Key
resource "random_bytes" "jwt_secret" {
  length = 64
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "jwt-signing-key-${var.environment}"

  labels = {
    environment = var.environment
    type        = "jwt"
  }

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = base64encode(random_bytes.jwt_secret.base64)
}

# Session Encryption Key
resource "random_bytes" "session_key" {
  length = 32
}

resource "google_secret_manager_secret" "session_key" {
  secret_id = "session-encryption-key-${var.environment}"

  labels = {
    environment = var.environment
    type        = "encryption"
  }

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "session_key" {
  secret      = google_secret_manager_secret.session_key.id
  secret_data = base64encode(random_bytes.session_key.base64)
}

# API Signing Key (for webhooks)
resource "random_bytes" "api_signing_key" {
  length = 32
}

resource "google_secret_manager_secret" "api_signing_key" {
  secret_id = "api-signing-key-${var.environment}"

  labels = {
    environment = var.environment
    type        = "signing"
  }

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "api_signing_key" {
  secret      = google_secret_manager_secret.api_signing_key.id
  secret_data = base64encode(random_bytes.api_signing_key.base64)
}

# -----------------------------------------------------------------------------
# External Service API Keys (Placeholder Secrets)
# -----------------------------------------------------------------------------

# OpenAI API Key
resource "google_secret_manager_secret" "openai_api_key" {
  secret_id = "openai-api-key-${var.environment}"

  labels = {
    environment = var.environment
    type        = "external-api"
    service     = "openai"
  }

  replication {
    auto {}
  }
}

# Anthropic API Key
resource "google_secret_manager_secret" "anthropic_api_key" {
  secret_id = "anthropic-api-key-${var.environment}"

  labels = {
    environment = var.environment
    type        = "external-api"
    service     = "anthropic"
  }

  replication {
    auto {}
  }
}

# Stripe API Keys
resource "google_secret_manager_secret" "stripe_secret_key" {
  secret_id = "stripe-secret-key-${var.environment}"

  labels = {
    environment = var.environment
    type        = "external-api"
    service     = "stripe"
  }

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "stripe_webhook_secret" {
  secret_id = "stripe-webhook-secret-${var.environment}"

  labels = {
    environment = var.environment
    type        = "webhook"
    service     = "stripe"
  }

  replication {
    auto {}
  }
}

# SendGrid API Key (Email)
resource "google_secret_manager_secret" "sendgrid_api_key" {
  secret_id = "sendgrid-api-key-${var.environment}"

  labels = {
    environment = var.environment
    type        = "external-api"
    service     = "sendgrid"
  }

  replication {
    auto {}
  }
}

# Twilio Credentials (SMS/Push)
resource "google_secret_manager_secret" "twilio_auth_token" {
  secret_id = "twilio-auth-token-${var.environment}"

  labels = {
    environment = var.environment
    type        = "external-api"
    service     = "twilio"
  }

  replication {
    auto {}
  }
}

# Firebase/FCM Credentials
resource "google_secret_manager_secret" "firebase_credentials" {
  secret_id = "firebase-service-account-${var.environment}"

  labels = {
    environment = var.environment
    type        = "service-account"
    service     = "firebase"
  }

  replication {
    auto {}
  }
}

# -----------------------------------------------------------------------------
# OAuth/SSO Secrets
# -----------------------------------------------------------------------------

# Google OAuth Client Secret
resource "google_secret_manager_secret" "google_oauth_secret" {
  secret_id = "google-oauth-client-secret-${var.environment}"

  labels = {
    environment = var.environment
    type        = "oauth"
    provider    = "google"
  }

  replication {
    auto {}
  }
}

# Clever OAuth Secret
resource "google_secret_manager_secret" "clever_oauth_secret" {
  secret_id = "clever-oauth-client-secret-${var.environment}"

  labels = {
    environment = var.environment
    type        = "oauth"
    provider    = "clever"
  }

  replication {
    auto {}
  }
}

# ClassLink OAuth Secret
resource "google_secret_manager_secret" "classlink_oauth_secret" {
  secret_id = "classlink-oauth-client-secret-${var.environment}"

  labels = {
    environment = var.environment
    type        = "oauth"
    provider    = "classlink"
  }

  replication {
    auto {}
  }
}

# -----------------------------------------------------------------------------
# LTI Keys
# -----------------------------------------------------------------------------

# LTI RSA Private Key
resource "tls_private_key" "lti_key" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "google_secret_manager_secret" "lti_private_key" {
  secret_id = "lti-private-key-${var.environment}"

  labels = {
    environment = var.environment
    type        = "lti"
  }

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "lti_private_key" {
  secret      = google_secret_manager_secret.lti_private_key.id
  secret_data = tls_private_key.lti_key.private_key_pem
}

resource "google_secret_manager_secret" "lti_public_key" {
  secret_id = "lti-public-key-${var.environment}"

  labels = {
    environment = var.environment
    type        = "lti"
  }

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "lti_public_key" {
  secret      = google_secret_manager_secret.lti_public_key.id
  secret_data = tls_private_key.lti_key.public_key_pem
}

# -----------------------------------------------------------------------------
# Grant Access to Application Service Account
# -----------------------------------------------------------------------------

resource "google_secret_manager_secret_iam_member" "app_access" {
  for_each = toset([
    google_secret_manager_secret.jwt_secret.secret_id,
    google_secret_manager_secret.session_key.secret_id,
    google_secret_manager_secret.api_signing_key.secret_id,
    google_secret_manager_secret.openai_api_key.secret_id,
    google_secret_manager_secret.anthropic_api_key.secret_id,
    google_secret_manager_secret.stripe_secret_key.secret_id,
    google_secret_manager_secret.stripe_webhook_secret.secret_id,
    google_secret_manager_secret.sendgrid_api_key.secret_id,
    google_secret_manager_secret.twilio_auth_token.secret_id,
    google_secret_manager_secret.firebase_credentials.secret_id,
    google_secret_manager_secret.google_oauth_secret.secret_id,
    google_secret_manager_secret.clever_oauth_secret.secret_id,
    google_secret_manager_secret.classlink_oauth_secret.secret_id,
    google_secret_manager_secret.lti_private_key.secret_id,
  ])

  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.application_service_account_email}"
}
