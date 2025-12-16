# =============================================================================
# AIVO Platform - GKE Cluster Module
# =============================================================================
# Creates a production-ready GKE cluster with multiple node pools
# =============================================================================

# -----------------------------------------------------------------------------
# GKE Cluster
# -----------------------------------------------------------------------------
resource "google_container_cluster" "primary" {
  name     = "${var.project_prefix}-gke-${var.environment}"
  location = var.region

  # Use regional cluster for production, zonal for dev/staging
  node_locations = var.environment == "production" ? var.node_zones : null

  # Remove default node pool and create custom ones
  remove_default_node_pool = true
  initial_node_count       = 1

  # Network configuration
  network    = var.vpc_id
  subnetwork = var.subnet_id

  # Private cluster configuration
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = var.environment == "production" ? var.private_endpoint : false
    master_ipv4_cidr_block  = var.master_cidr
  }

  # Master authorized networks
  master_authorized_networks_config {
    dynamic "cidr_blocks" {
      for_each = var.master_authorized_networks
      content {
        cidr_block   = cidr_blocks.value.cidr_block
        display_name = cidr_blocks.value.display_name
      }
    }
  }

  # IP allocation policy for VPC-native cluster
  ip_allocation_policy {
    cluster_secondary_range_name  = var.pods_secondary_range_name
    services_secondary_range_name = var.services_secondary_range_name
  }

  # Workload Identity for secure service authentication
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Enable required addons
  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
    network_policy_config {
      disabled = false
    }
    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
    gcs_fuse_csi_driver_config {
      enabled = true
    }
    dns_cache_config {
      enabled = true
    }
  }

  # Network policy
  network_policy {
    enabled  = true
    provider = "CALICO"
  }

  # Binary authorization (production only)
  dynamic "binary_authorization" {
    for_each = var.environment == "production" ? [1] : []
    content {
      evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
    }
  }

  # Maintenance window (weekends, early morning)
  maintenance_policy {
    recurring_window {
      start_time = "2024-01-01T04:00:00Z"
      end_time   = "2024-01-01T08:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SA,SU"
    }
  }

  # Release channel
  release_channel {
    channel = var.environment == "production" ? "STABLE" : "REGULAR"
  }

  # Logging and monitoring
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]
    managed_prometheus {
      enabled = true
    }
  }

  # Cluster autoscaling configuration
  cluster_autoscaling {
    enabled = var.environment == "production"
    
    dynamic "resource_limits" {
      for_each = var.environment == "production" ? [1] : []
      content {
        resource_type = "cpu"
        minimum       = var.cluster_min_cpu
        maximum       = var.cluster_max_cpu
      }
    }
    
    dynamic "resource_limits" {
      for_each = var.environment == "production" ? [1] : []
      content {
        resource_type = "memory"
        minimum       = var.cluster_min_memory
        maximum       = var.cluster_max_memory
      }
    }

    dynamic "auto_provisioning_defaults" {
      for_each = var.environment == "production" ? [1] : []
      content {
        oauth_scopes = [
          "https://www.googleapis.com/auth/cloud-platform"
        ]
        service_account = var.gke_service_account_email
      }
    }
  }

  # Security configuration
  security_posture_config {
    mode               = "BASIC"
    vulnerability_mode = var.environment == "production" ? "VULNERABILITY_ENTERPRISE" : "VULNERABILITY_BASIC"
  }

  # Cost management labels
  resource_labels = {
    environment = var.environment
    application = "aivo"
    managed_by  = "terraform"
  }

  # Deletion protection for production
  deletion_protection = var.environment == "production"

  depends_on = [var.private_vpc_connection]
}

# -----------------------------------------------------------------------------
# Application Node Pool
# -----------------------------------------------------------------------------
resource "google_container_node_pool" "application" {
  name       = "application-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  
  # Static count for dev/staging, autoscaling for production
  node_count = var.environment == "production" ? null : var.app_node_count

  # Autoscaling for production
  dynamic "autoscaling" {
    for_each = var.environment == "production" ? [1] : []
    content {
      min_node_count  = var.app_min_nodes
      max_node_count  = var.app_max_nodes
      location_policy = "BALANCED"
    }
  }

  node_config {
    machine_type = var.app_machine_type
    disk_size_gb = var.app_disk_size
    disk_type    = "pd-ssd"
    spot         = var.environment == "dev" ? true : false

    # Use Container-Optimized OS
    image_type = "COS_CONTAINERD"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    service_account = var.gke_service_account_email

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    labels = {
      environment = var.environment
      node_type   = "application"
    }

    tags = ["gke-node", "${var.project_prefix}-gke-${var.environment}"]

    metadata = {
      disable-legacy-endpoints = "true"
    }

    # Resource reservations
    resource_labels = {
      pool = "application"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  upgrade_settings {
    max_surge       = var.environment == "production" ? 1 : 2
    max_unavailable = 0
    strategy        = "SURGE"
  }
}

# -----------------------------------------------------------------------------
# System Node Pool (for cluster services)
# -----------------------------------------------------------------------------
resource "google_container_node_pool" "system" {
  name       = "system-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = var.environment == "production" ? null : 1

  dynamic "autoscaling" {
    for_each = var.environment == "production" ? [1] : []
    content {
      min_node_count  = 1
      max_node_count  = 3
      location_policy = "BALANCED"
    }
  }

  node_config {
    machine_type = var.environment == "production" ? "e2-standard-4" : "e2-standard-2"
    disk_size_gb = 50
    disk_type    = "pd-ssd"
    spot         = var.environment == "dev"

    image_type = "COS_CONTAINERD"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    service_account = var.gke_service_account_email

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    labels = {
      environment = var.environment
      node_type   = "system"
    }

    taint {
      key    = "CriticalAddonsOnly"
      value  = "true"
      effect = "PREFER_NO_SCHEDULE"
    }

    tags = ["gke-node", "system-node"]

    metadata = {
      disable-legacy-endpoints = "true"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# -----------------------------------------------------------------------------
# AI/ML Workload Node Pool (GPU-enabled, production only)
# -----------------------------------------------------------------------------
resource "google_container_node_pool" "ai_workloads" {
  count    = var.environment == "production" && var.enable_gpu_pool ? 1 : 0
  name     = "ai-workloads-pool"
  location = var.region
  cluster  = google_container_cluster.primary.name

  autoscaling {
    min_node_count  = 0
    max_node_count  = var.ai_max_nodes
    location_policy = "BALANCED"
  }

  node_config {
    machine_type = var.ai_machine_type
    disk_size_gb = 100
    disk_type    = "pd-ssd"

    image_type = "COS_CONTAINERD"

    guest_accelerator {
      type  = var.gpu_type
      count = var.gpu_count
      gpu_driver_installation_config {
        gpu_driver_version = "LATEST"
      }
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    service_account = var.gke_service_account_email

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    labels = {
      environment = var.environment
      node_type   = "ai-workloads"
      gpu         = "true"
    }

    taint {
      key    = "nvidia.com/gpu"
      value  = "present"
      effect = "NO_SCHEDULE"
    }

    tags = ["gke-node", "gpu-node"]

    metadata = {
      disable-legacy-endpoints = "true"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }
}
