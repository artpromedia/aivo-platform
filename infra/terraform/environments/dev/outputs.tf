# =============================================================================
# AIVO Platform - Development Environment Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# GKE Outputs
# -----------------------------------------------------------------------------

output "gke_cluster_name" {
  description = "GKE cluster name"
  value       = module.gke.cluster_name
}

output "gke_cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = module.gke.cluster_endpoint
  sensitive   = true
}

output "gke_get_credentials_command" {
  description = "Command to get GKE credentials"
  value       = module.gke.get_credentials_command
}

# -----------------------------------------------------------------------------
# Database Outputs
# -----------------------------------------------------------------------------

output "cloudsql_instance_name" {
  description = "Cloud SQL instance name"
  value       = module.cloudsql.instance_name
}

output "cloudsql_connection_name" {
  description = "Cloud SQL connection name"
  value       = module.cloudsql.connection_name
}

output "cloudsql_private_ip" {
  description = "Cloud SQL private IP"
  value       = module.cloudsql.private_ip
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Redis Outputs
# -----------------------------------------------------------------------------

output "redis_cache_host" {
  description = "Redis cache host"
  value       = module.redis.cache_host
}

output "redis_session_host" {
  description = "Redis session host"
  value       = module.redis.session_host
}

# -----------------------------------------------------------------------------
# Storage Outputs
# -----------------------------------------------------------------------------

output "storage_buckets" {
  description = "Storage bucket names"
  value = {
    content_assets = module.storage.content_assets_bucket_name
    user_uploads   = module.storage.user_uploads_bucket_name
    backups        = module.storage.backup_bucket_name
  }
}

# -----------------------------------------------------------------------------
# IAM Outputs
# -----------------------------------------------------------------------------

output "service_accounts" {
  description = "Service account emails"
  value = {
    application = module.iam.application_service_account_email
    gke_nodes   = module.iam.gke_nodes_service_account_email
  }
}
