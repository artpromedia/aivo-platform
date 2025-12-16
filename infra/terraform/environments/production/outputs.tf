# =============================================================================
# AIVO Platform - Production Environment Outputs
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
  description = "Cloud SQL primary private IP"
  value       = module.cloudsql.private_ip
  sensitive   = true
}

output "cloudsql_read_replica_ips" {
  description = "Cloud SQL read replica private IPs"
  value       = module.cloudsql.read_replica_private_ips
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

output "redis_pubsub_host" {
  description = "Redis pub/sub host"
  value       = module.redis.pubsub_host
}

# -----------------------------------------------------------------------------
# Storage Outputs
# -----------------------------------------------------------------------------

output "storage_buckets" {
  description = "Storage bucket names"
  value = {
    content_assets = module.storage.content_assets_bucket_name
    user_uploads   = module.storage.user_uploads_bucket_name
    static_assets  = module.storage.static_assets_bucket_name
    backups        = module.storage.backup_bucket_name
    ml_models      = module.storage.ml_models_bucket_name
    research_data  = module.storage.research_data_bucket_name
  }
}

# -----------------------------------------------------------------------------
# CDN Outputs
# -----------------------------------------------------------------------------

output "cdn_ip_address" {
  description = "CDN IP address"
  value       = module.cdn.cdn_ip_address
}

output "cdn_url" {
  description = "CDN URL"
  value       = module.cdn.cdn_url
}

output "cdn_dns_configuration" {
  description = "DNS records to configure for CDN"
  value       = module.cdn.dns_configuration
}

# -----------------------------------------------------------------------------
# IAM Outputs
# -----------------------------------------------------------------------------

output "service_accounts" {
  description = "Service account emails"
  value = {
    application     = module.iam.application_service_account_email
    gke_nodes       = module.iam.gke_nodes_service_account_email
    cicd            = module.iam.cicd_service_account_email
    ai_orchestrator = module.iam.ai_orchestrator_service_account_email
    backup          = module.iam.backup_service_account_email
  }
}

# -----------------------------------------------------------------------------
# Monitoring Outputs
# -----------------------------------------------------------------------------

output "monitoring_dashboard_id" {
  description = "Monitoring dashboard ID"
  value       = module.monitoring.dashboard_id
}

output "alert_notification_channels" {
  description = "Alert notification channel IDs"
  value = {
    email = module.monitoring.email_notification_channel_id
    slack = module.monitoring.slack_notification_channel_id
  }
}
