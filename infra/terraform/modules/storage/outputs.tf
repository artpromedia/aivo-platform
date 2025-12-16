# =============================================================================
# AIVO Platform - Storage Module Outputs
# =============================================================================

output "content_assets_bucket_name" {
  description = "Content assets bucket name"
  value       = google_storage_bucket.content_assets.name
}

output "content_assets_bucket_url" {
  description = "Content assets bucket URL"
  value       = google_storage_bucket.content_assets.url
}

output "user_uploads_bucket_name" {
  description = "User uploads bucket name"
  value       = google_storage_bucket.user_uploads.name
}

output "user_uploads_bucket_url" {
  description = "User uploads bucket URL"
  value       = google_storage_bucket.user_uploads.url
}

output "backups_bucket_name" {
  description = "Backups bucket name"
  value       = google_storage_bucket.backups.name
}

output "exports_bucket_name" {
  description = "Exports bucket name"
  value       = google_storage_bucket.exports.name
}

output "static_assets_bucket_name" {
  description = "Static assets bucket name"
  value       = google_storage_bucket.static_assets.name
}

output "static_assets_bucket_url" {
  description = "Static assets bucket URL"
  value       = google_storage_bucket.static_assets.url
}

output "ml_models_bucket_name" {
  description = "ML models bucket name"
  value       = google_storage_bucket.ml_models.name
}

output "research_data_bucket_name" {
  description = "Research data bucket name (production only)"
  value       = var.environment == "production" ? google_storage_bucket.research_data[0].name : null
}

output "terraform_state_bucket_name" {
  description = "Terraform state bucket name"
  value       = var.create_state_bucket ? google_storage_bucket.terraform_state[0].name : null
}
