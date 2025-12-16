# =============================================================================
# AIVO Platform - Development Environment Configuration
# =============================================================================

terraform {
  backend "gcs" {
    bucket = "aivo-terraform-state-dev"
    prefix = "terraform/state"
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------

locals {
  environment = "dev"
  project_id  = var.project_id
  region      = var.region
}

# -----------------------------------------------------------------------------
# Networking Module
# -----------------------------------------------------------------------------

module "networking" {
  source = "../../modules/networking"

  project_id  = local.project_id
  region      = local.region
  environment = local.environment

  vpc_cidr_range     = "10.0.0.0/16"
  pods_cidr_range    = "10.100.0.0/14"
  services_cidr_range = "10.104.0.0/20"
  master_cidr_range  = "10.105.0.0/28"
}

# -----------------------------------------------------------------------------
# GKE Module
# -----------------------------------------------------------------------------

module "gke" {
  source = "../../modules/gke"

  project_id  = local.project_id
  region      = local.region
  environment = local.environment

  vpc_id                    = module.networking.vpc_id
  subnet_id                 = module.networking.subnet_id
  pods_secondary_range_name = module.networking.pods_secondary_range_name
  services_secondary_range_name = module.networking.services_secondary_range_name
  master_ipv4_cidr_block    = "10.105.0.0/28"

  # Development sizing - smaller instances, autoscaling
  app_pool_min_count = 1
  app_pool_max_count = 3
  app_machine_type   = "e2-standard-4"
  
  system_pool_min_count = 1
  system_pool_max_count = 2
  system_machine_type   = "e2-standard-2"

  # No GPU nodes in dev
  enable_gpu_pool   = false
  spot_instances    = true

  depends_on = [module.networking]
}

# -----------------------------------------------------------------------------
# Cloud SQL Module
# -----------------------------------------------------------------------------

module "cloudsql" {
  source = "../../modules/cloudsql"

  project_id  = local.project_id
  region      = local.region
  environment = local.environment

  vpc_id                    = module.networking.vpc_id
  private_service_connection = module.networking.private_service_connection

  # Development sizing
  db_tier           = "db-custom-2-4096"
  db_disk_size      = 50
  availability_type = "ZONAL"
  enable_read_replica = false

  # Development has fewer connections
  database_flags = {
    max_connections = 100
  }

  depends_on = [module.networking]
}

# -----------------------------------------------------------------------------
# Redis Module
# -----------------------------------------------------------------------------

module "redis" {
  source = "../../modules/redis"

  project_id  = local.project_id
  region      = local.region
  environment = local.environment

  vpc_id = module.networking.vpc_id

  # Development sizing
  cache_memory_size_gb   = 1
  session_memory_size_gb = 1
  enable_pubsub_instance = false
  tier                   = "BASIC"

  depends_on = [module.networking]
}

# -----------------------------------------------------------------------------
# Storage Module
# -----------------------------------------------------------------------------

module "storage" {
  source = "../../modules/storage"

  project_id  = local.project_id
  region      = local.region
  environment = local.environment

  # Allow all origins in dev
  cors_origins = ["*"]

  # Skip terraform state bucket - created separately
  create_terraform_state_bucket = false
}

# -----------------------------------------------------------------------------
# IAM Module
# -----------------------------------------------------------------------------

module "iam" {
  source = "../../modules/iam"

  project_id  = local.project_id
  environment = local.environment
  k8s_namespace = "aivo-dev"
}

# -----------------------------------------------------------------------------
# Secrets Module
# -----------------------------------------------------------------------------

module "secrets" {
  source = "../../modules/secrets"

  project_id  = local.project_id
  environment = local.environment

  application_service_account_email = module.iam.application_service_account_email

  depends_on = [module.iam]
}

# -----------------------------------------------------------------------------
# Monitoring Module (simplified for dev)
# -----------------------------------------------------------------------------

module "monitoring" {
  source = "../../modules/monitoring"

  project_id  = local.project_id
  environment = local.environment

  alert_email      = var.alert_email
  api_domain       = "api.dev.aivo.local"
  web_domain       = "dev.aivo.local"
  audit_log_bucket = module.storage.backup_bucket_name
  k8s_namespace    = "aivo-dev"

  cloudsql_max_connections = 100

  depends_on = [module.storage]
}

# Note: CDN is not typically needed in development
# Add if required for CDN testing
