# =============================================================================
# AIVO Platform - Cloud Storage Module
# =============================================================================
# Creates GCS buckets for content assets, uploads, backups, and exports
# =============================================================================

# -----------------------------------------------------------------------------
# Content Assets Bucket (Images, Videos, Documents)
# -----------------------------------------------------------------------------
resource "google_storage_bucket" "content_assets" {
  name     = "${var.project_prefix}-content-assets-${var.environment}-${var.project_id}"
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = var.environment == "production"
  }

  # Lifecycle rules for cost optimization
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  # Delete non-current versions after 30 days (if versioning enabled)
  dynamic "lifecycle_rule" {
    for_each = var.environment == "production" ? [1] : []
    content {
      condition {
        num_newer_versions = 3
        with_state         = "ARCHIVED"
      }
      action {
        type = "Delete"
      }
    }
  }

  cors {
    origin          = var.allowed_origins
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  labels = {
    environment = var.environment
    purpose     = "content-assets"
    application = "aivo"
  }
}

# -----------------------------------------------------------------------------
# User Uploads Bucket (Temporary Storage)
# -----------------------------------------------------------------------------
resource "google_storage_bucket" "user_uploads" {
  name     = "${var.project_prefix}-user-uploads-${var.environment}-${var.project_id}"
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Auto-delete after 7 days (processed files moved to content_assets)
  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }

  cors {
    origin          = var.allowed_origins
    method          = ["PUT", "POST"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  labels = {
    environment = var.environment
    purpose     = "user-uploads"
    application = "aivo"
  }
}

# -----------------------------------------------------------------------------
# Backups Bucket
# -----------------------------------------------------------------------------
resource "google_storage_bucket" "backups" {
  name     = "${var.project_prefix}-backups-${var.environment}-${var.project_id}"
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  # Archive old backups
  lifecycle_rule {
    condition {
      age = var.environment == "production" ? 90 : 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }

  # Delete very old backups (production: 2 years, others: 180 days)
  lifecycle_rule {
    condition {
      age = var.environment == "production" ? 730 : 180
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    environment = var.environment
    purpose     = "backups"
    application = "aivo"
  }
}

# -----------------------------------------------------------------------------
# Exports/Reports Bucket
# -----------------------------------------------------------------------------
resource "google_storage_bucket" "exports" {
  name     = "${var.project_prefix}-exports-${var.environment}-${var.project_id}"
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Auto-delete after 30 days
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  cors {
    origin          = var.allowed_origins
    method          = ["GET", "HEAD"]
    response_header = ["Content-Disposition", "Content-Type"]
    max_age_seconds = 3600
  }

  labels = {
    environment = var.environment
    purpose     = "exports"
    application = "aivo"
  }
}

# -----------------------------------------------------------------------------
# Static Assets Bucket (for CDN)
# -----------------------------------------------------------------------------
resource "google_storage_bucket" "static_assets" {
  name     = "${var.project_prefix}-static-assets-${var.environment}-${var.project_id}"
  location = var.region

  uniform_bucket_level_access = true
  
  # Allow public access for CDN serving
  public_access_prevention = var.environment == "production" ? "inherited" : "enforced"

  versioning {
    enabled = true
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "Cache-Control"]
    max_age_seconds = 86400
  }

  labels = {
    environment = var.environment
    purpose     = "static-assets"
    application = "aivo"
  }
}

# -----------------------------------------------------------------------------
# ML Models Bucket (for AI inference)
# -----------------------------------------------------------------------------
resource "google_storage_bucket" "ml_models" {
  name     = "${var.project_prefix}-ml-models-${var.environment}-${var.project_id}"
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  labels = {
    environment = var.environment
    purpose     = "ml-models"
    application = "aivo"
  }
}

# -----------------------------------------------------------------------------
# Research Data Bucket (de-identified exports)
# -----------------------------------------------------------------------------
resource "google_storage_bucket" "research_data" {
  count = var.environment == "production" ? 1 : 0

  name     = "${var.project_prefix}-research-data-${var.environment}-${var.project_id}"
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  # Retention policy for compliance
  retention_policy {
    retention_period = 31536000  # 1 year in seconds
    is_locked        = false
  }

  labels = {
    environment = var.environment
    purpose     = "research-data"
    application = "aivo"
    compliance  = "ferpa"
  }
}

# -----------------------------------------------------------------------------
# Terraform State Bucket (for remote state)
# -----------------------------------------------------------------------------
resource "google_storage_bucket" "terraform_state" {
  count = var.create_state_bucket ? 1 : 0

  name     = "${var.project_prefix}-terraform-state-${var.project_id}"
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  # Keep all versions for state history
  lifecycle_rule {
    condition {
      num_newer_versions = 10
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    purpose     = "terraform-state"
    application = "aivo"
  }
}
