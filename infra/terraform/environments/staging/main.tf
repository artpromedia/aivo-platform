# =============================================================================
# AIVO Platform - Staging Environment Configuration
# =============================================================================

terraform {
  backend "gcs" {
    bucket = "aivo-terraform-state-staging"
    prefix = "terraform/state"
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------

locals {
  environment = "staging"
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

  vpc_cidr_range      = "10.10.0.0/16"
  pods_cidr_range     = "10.110.0.0/14"
  services_cidr_range = "10.114.0.0/20"
  master_cidr_range   = "10.115.0.0/28"
}

# -----------------------------------------------------------------------------
# GKE Module
# -----------------------------------------------------------------------------

module "gke" {
  source = "../../modules/gke"

  project_id  = local.project_id
  region      = local.region
  environment = local.environment

  vpc_id                        = module.networking.vpc_id
  subnet_id                     = module.networking.subnet_id
  pods_secondary_range_name     = module.networking.pods_secondary_range_name
  services_secondary_range_name = module.networking.services_secondary_range_name
  master_ipv4_cidr_block        = "10.115.0.0/28"

  # Staging sizing - mirrors production structure at smaller scale
  app_pool_min_count = 2
  app_pool_max_count = 5
  app_machine_type   = "e2-standard-4"

  system_pool_min_count = 1
  system_pool_max_count = 3
  system_machine_type   = "e2-standard-2"

  # Limited GPU for testing
  enable_gpu_pool     = true
  gpu_pool_min_count  = 0
  gpu_pool_max_count  = 1
  gpu_machine_type    = "n1-standard-4"
  gpu_type            = "nvidia-tesla-t4"
  gpu_count           = 1
  spot_instances      = true

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

  vpc_id                     = module.networking.vpc_id
  private_service_connection = module.networking.private_service_connection

  # Staging sizing - moderate
  db_tier             = "db-custom-4-8192"
  db_disk_size        = 100
  availability_type   = "REGIONAL"
  enable_read_replica = true
  read_replica_count  = 1

  database_flags = {
    max_connections = 250
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

  # Staging sizing
  cache_memory_size_gb   = 2
  session_memory_size_gb = 2
  enable_pubsub_instance = true
  pubsub_memory_size_gb  = 1
  tier                   = "STANDARD_HA"

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

  cors_origins = var.cors_origins

  create_terraform_state_bucket = false
}

# -----------------------------------------------------------------------------
# IAM Module
# -----------------------------------------------------------------------------

module "iam" {
  source = "../../modules/iam"

  project_id    = local.project_id
  environment   = local.environment
  k8s_namespace = "aivo-staging"
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
# Monitoring Module
# -----------------------------------------------------------------------------

module "monitoring" {
  source = "../../modules/monitoring"

  project_id  = local.project_id
  environment = local.environment

  alert_email      = var.alert_email
  slack_webhook_url = var.slack_webhook_url
  slack_channel    = "#aivo-staging-alerts"
  api_domain       = "api.staging.aivo.io"
  web_domain       = "staging.aivo.io"
  audit_log_bucket = module.storage.backup_bucket_name
  k8s_namespace    = "aivo-staging"

  cloudsql_max_connections = 250

  depends_on = [module.storage]
}

# -----------------------------------------------------------------------------
# CDN Module (Optional for Staging)
# -----------------------------------------------------------------------------

module "cdn" {
  count  = var.enable_cdn ? 1 : 0
  source = "../../modules/cdn"

  project_id  = local.project_id
  environment = local.environment

  static_assets_bucket  = module.storage.static_assets_bucket_name
  content_assets_bucket = module.storage.content_assets_bucket_name

  cdn_domains = ["cdn.staging.aivo.io"]

  enable_cloud_armor = false

  depends_on = [module.storage]
}
