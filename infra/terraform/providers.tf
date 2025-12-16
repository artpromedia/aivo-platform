# =============================================================================
# AIVO Platform - Provider Configuration
# =============================================================================
# This file defines the default provider configuration.
# Environment-specific configurations can override these in their main.tf
# =============================================================================

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Kubernetes provider - configured after GKE cluster is created
provider "kubernetes" {
  host                   = "https://${data.google_container_cluster.primary.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(data.google_container_cluster.primary.master_auth[0].cluster_ca_certificate)
}

provider "helm" {
  kubernetes {
    host                   = "https://${data.google_container_cluster.primary.endpoint}"
    token                  = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(data.google_container_cluster.primary.master_auth[0].cluster_ca_certificate)
  }
}

# Data sources for provider configuration
data "google_client_config" "default" {}

data "google_container_cluster" "primary" {
  name     = "${var.project_prefix}-gke-${var.environment}"
  location = var.region
}
