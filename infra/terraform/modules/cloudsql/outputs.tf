# =============================================================================
# AIVO Platform - Cloud SQL Module Outputs
# =============================================================================

output "instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.primary.name
}

output "instance_connection_name" {
  description = "Cloud SQL instance connection name for Cloud SQL Proxy"
  value       = google_sql_database_instance.primary.connection_name
}

output "private_ip_address" {
  description = "Private IP address of the instance"
  value       = google_sql_database_instance.primary.private_ip_address
}

output "database_names" {
  description = "List of created database names"
  value       = [for db in google_sql_database.service_databases : db.name]
}

output "database_users" {
  description = "Map of database users"
  value       = { for k, v in google_sql_user.service_users : k => v.name }
}

output "password_secret_ids" {
  description = "Map of Secret Manager secret IDs for database passwords"
  value       = { for k, v in google_secret_manager_secret.db_passwords : k => v.secret_id }
}

output "connection_string_secret_ids" {
  description = "Map of Secret Manager secret IDs for connection strings"
  value       = { for k, v in google_secret_manager_secret.db_connection_strings : k => v.secret_id }
}

output "admin_password_secret_id" {
  description = "Secret Manager secret ID for admin password"
  value       = google_secret_manager_secret.admin_password.secret_id
}

output "read_replica_ips" {
  description = "Private IP addresses of read replicas"
  value       = [for replica in google_sql_database_instance.read_replica : replica.private_ip_address]
}

output "read_replica_connection_names" {
  description = "Connection names for read replicas"
  value       = [for replica in google_sql_database_instance.read_replica : replica.connection_name]
}
