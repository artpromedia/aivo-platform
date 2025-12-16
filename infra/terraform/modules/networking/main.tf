# =============================================================================
# AIVO Platform - Networking Module
# =============================================================================
# Creates VPC, subnets, NAT, firewall rules, and private service access
# =============================================================================

# -----------------------------------------------------------------------------
# VPC Network
# -----------------------------------------------------------------------------
resource "google_compute_network" "vpc" {
  name                    = "${var.project_prefix}-vpc-${var.environment}"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  
  description = "AIVO Platform VPC for ${var.environment} environment"
}

# -----------------------------------------------------------------------------
# Main Subnet with Secondary Ranges for GKE
# -----------------------------------------------------------------------------
resource "google_compute_subnetwork" "main" {
  name          = "${var.project_prefix}-subnet-main-${var.environment}"
  ip_cidr_range = var.main_cidr
  region        = var.region
  network       = google_compute_network.vpc.id

  private_ip_google_access = true

  # Secondary ranges for GKE pods and services
  secondary_ip_range {
    range_name    = "${var.project_prefix}-pods-${var.environment}"
    ip_cidr_range = var.pods_cidr
  }

  secondary_ip_range {
    range_name    = "${var.project_prefix}-services-${var.environment}"
    ip_cidr_range = var.services_cidr
  }

  # VPC Flow Logs for network monitoring
  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = var.environment == "production" ? 0.5 : 0.1
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# -----------------------------------------------------------------------------
# Cloud Router for NAT
# -----------------------------------------------------------------------------
resource "google_compute_router" "router" {
  name    = "${var.project_prefix}-router-${var.environment}"
  region  = var.region
  network = google_compute_network.vpc.id

  bgp {
    asn = 64514
  }
}

# -----------------------------------------------------------------------------
# Cloud NAT for Outbound Internet Access
# -----------------------------------------------------------------------------
resource "google_compute_router_nat" "nat" {
  name   = "${var.project_prefix}-nat-${var.environment}"
  router = google_compute_router.router.name
  region = var.region

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = var.environment == "production" ? "ERRORS_ONLY" : "ALL"
  }

  # Timeouts for connection tracking
  tcp_established_idle_timeout_sec = 1200
  tcp_transitory_idle_timeout_sec  = 30
  udp_idle_timeout_sec             = 30
}

# -----------------------------------------------------------------------------
# Private Service Access for Cloud SQL and other Google services
# -----------------------------------------------------------------------------
resource "google_compute_global_address" "private_ip_range" {
  name          = "${var.project_prefix}-private-ip-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# -----------------------------------------------------------------------------
# Firewall Rules
# -----------------------------------------------------------------------------

# Allow internal communication within VPC
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.project_prefix}-allow-internal-${var.environment}"
  network = google_compute_network.vpc.name

  allow {
    protocol = "icmp"
  }

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  source_ranges = [
    var.main_cidr,
    var.pods_cidr,
    var.services_cidr
  ]

  priority = 1000
}

# Allow GCP health check ranges
resource "google_compute_firewall" "allow_health_checks" {
  name    = "${var.project_prefix}-allow-health-checks-${var.environment}"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "8080", "8443", "10256"]
  }

  # GCP health check IP ranges
  source_ranges = [
    "35.191.0.0/16",
    "130.211.0.0/22",
    "209.85.152.0/22",
    "209.85.204.0/22"
  ]

  target_tags = ["gke-node", "lb-health-check"]
  priority    = 1000
}

# Allow IAP for SSH tunneling (optional, for debugging)
resource "google_compute_firewall" "allow_iap" {
  name    = "${var.project_prefix}-allow-iap-${var.environment}"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22", "3389"]
  }

  # IAP IP range
  source_ranges = ["35.235.240.0/20"]

  target_tags = ["allow-iap"]
  priority    = 1000
}

# Allow GKE master to node communication
resource "google_compute_firewall" "allow_gke_master" {
  name    = "${var.project_prefix}-allow-gke-master-${var.environment}"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["443", "10250", "8443"]
  }

  source_ranges = [var.master_cidr]
  target_tags   = ["gke-node"]
  priority      = 1000
}

# Deny all other ingress (explicit deny-all rule)
resource "google_compute_firewall" "deny_all_ingress" {
  name    = "${var.project_prefix}-deny-all-ingress-${var.environment}"
  network = google_compute_network.vpc.name

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]
  priority      = 65534
}
