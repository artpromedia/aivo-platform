# =============================================================================
# AIVO Platform - Redis Module Outputs
# =============================================================================

# Cache Instance
output "cache_host" {
  description = "Cache Redis instance host"
  value       = google_redis_instance.cache.host
}

output "cache_port" {
  description = "Cache Redis instance port"
  value       = google_redis_instance.cache.port
}

output "cache_connection_secret_id" {
  description = "Secret Manager secret ID for cache connection"
  value       = google_secret_manager_secret.cache_connection.secret_id
}

# Sessions Instance
output "sessions_host" {
  description = "Sessions Redis instance host"
  value       = google_redis_instance.sessions.host
}

output "sessions_port" {
  description = "Sessions Redis instance port"
  value       = google_redis_instance.sessions.port
}

output "sessions_connection_secret_id" {
  description = "Secret Manager secret ID for sessions connection"
  value       = google_secret_manager_secret.sessions_connection.secret_id
}

# Pub/Sub Instance
output "pubsub_host" {
  description = "Pub/Sub Redis instance host"
  value       = var.enable_pubsub_redis ? google_redis_instance.pubsub[0].host : null
}

output "pubsub_port" {
  description = "Pub/Sub Redis instance port"
  value       = var.enable_pubsub_redis ? google_redis_instance.pubsub[0].port : null
}
