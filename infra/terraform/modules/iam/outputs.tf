# =============================================================================
# AIVO Platform - IAM Module Outputs
# =============================================================================

output "gke_nodes_service_account_email" {
  description = "GKE nodes service account email"
  value       = google_service_account.gke_nodes.email
}

output "application_service_account_email" {
  description = "Application service account email"
  value       = google_service_account.application.email
}

output "cloudsql_proxy_service_account_email" {
  description = "Cloud SQL proxy service account email"
  value       = google_service_account.cloudsql_proxy.email
}

output "cicd_service_account_email" {
  description = "CI/CD service account email"
  value       = google_service_account.cicd.email
}

output "ai_orchestrator_service_account_email" {
  description = "AI Orchestrator service account email"
  value       = google_service_account.ai_orchestrator.email
}

output "backup_service_account_email" {
  description = "Backup service account email"
  value       = google_service_account.backup.email
}

output "service_accounts" {
  description = "Map of service-specific service accounts"
  value       = { for k, v in google_service_account.services : k => v.email }
}
