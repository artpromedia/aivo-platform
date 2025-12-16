# =============================================================================
# AIVO Platform - Networking Module Outputs
# =============================================================================

output "vpc_id" {
  description = "VPC network ID"
  value       = google_compute_network.vpc.id
}

output "vpc_name" {
  description = "VPC network name"
  value       = google_compute_network.vpc.name
}

output "vpc_self_link" {
  description = "VPC network self link"
  value       = google_compute_network.vpc.self_link
}

output "subnet_id" {
  description = "Main subnet ID"
  value       = google_compute_subnetwork.main.id
}

output "subnet_name" {
  description = "Main subnet name"
  value       = google_compute_subnetwork.main.name
}

output "subnet_self_link" {
  description = "Main subnet self link"
  value       = google_compute_subnetwork.main.self_link
}

output "pods_secondary_range_name" {
  description = "Name of the secondary IP range for pods"
  value       = "${var.project_prefix}-pods-${var.environment}"
}

output "services_secondary_range_name" {
  description = "Name of the secondary IP range for services"
  value       = "${var.project_prefix}-services-${var.environment}"
}

output "router_name" {
  description = "Cloud Router name"
  value       = google_compute_router.router.name
}

output "nat_name" {
  description = "Cloud NAT name"
  value       = google_compute_router_nat.nat.name
}

output "private_vpc_connection" {
  description = "Private VPC connection for Google services"
  value       = google_service_networking_connection.private_vpc_connection.id
}
