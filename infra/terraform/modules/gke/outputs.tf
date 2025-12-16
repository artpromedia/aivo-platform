# =============================================================================
# AIVO Platform - GKE Module Outputs
# =============================================================================

output "cluster_id" {
  description = "GKE cluster ID"
  value       = google_container_cluster.primary.id
}

output "cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.primary.name
}

output "cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = google_container_cluster.primary.endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "GKE cluster CA certificate"
  value       = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "cluster_location" {
  description = "GKE cluster location"
  value       = google_container_cluster.primary.location
}

output "cluster_master_version" {
  description = "GKE master version"
  value       = google_container_cluster.primary.master_version
}

output "workload_identity_pool" {
  description = "Workload identity pool for the cluster"
  value       = "${var.project_id}.svc.id.goog"
}

output "application_node_pool_name" {
  description = "Application node pool name"
  value       = google_container_node_pool.application.name
}

output "system_node_pool_name" {
  description = "System node pool name"
  value       = google_container_node_pool.system.name
}

output "ai_node_pool_name" {
  description = "AI workloads node pool name"
  value       = var.environment == "production" && var.enable_gpu_pool ? google_container_node_pool.ai_workloads[0].name : null
}

output "get_credentials_command" {
  description = "Command to get cluster credentials"
  value       = "gcloud container clusters get-credentials ${google_container_cluster.primary.name} --region ${var.region} --project ${var.project_id}"
}
