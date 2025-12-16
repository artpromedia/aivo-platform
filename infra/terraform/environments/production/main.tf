# =============================================================================
# AIVO Platform - Production Environment Configuration
# =============================================================================

terraform {
  backend "gcs" {
    bucket = "aivo-terraform-state-production"
    prefix = "terraform/state"
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------

locals {
  environment = "production"
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

  vpc_cidr_range      = "10.20.0.0/16"
  pods_cidr_range     = "10.120.0.0/14"
  services_cidr_range = "10.124.0.0/20"
  master_cidr_range   = "10.125.0.0/28"
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
  master_ipv4_cidr_block        = "10.125.0.0/28"

  # Production sizing - high availability
  app_pool_min_count = 3
  app_pool_max_count = 20
  app_machine_type   = "e2-standard-8"

  system_pool_min_count = 2
  system_pool_max_count = 5
  system_machine_type   = "e2-standard-4"

  # GPU nodes for AI workloads
  enable_gpu_pool    = true
  gpu_pool_min_count = 0
  gpu_pool_max_count = 5
  gpu_machine_type   = "n1-standard-8"
  gpu_type           = "nvidia-tesla-t4"
  gpu_count          = 1

  # No spot instances in production
  spot_instances = false

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

  # Production sizing - high availability
  db_tier             = "db-custom-8-32768"
  db_disk_size        = 500
  availability_type   = "REGIONAL"
  enable_read_replica = true
  read_replica_count  = 2

  database_flags = {
    max_connections        = 500
    log_min_duration_statement = 1000
    log_checkpoints        = "on"
    log_connections        = "on"
    log_disconnections     = "on"
  }

  # Point-in-time recovery
  backup_configuration = {
    enabled                        = true
    point_in_time_recovery_enabled = true
    start_time                     = "03:00"
    transaction_log_retention_days = 7
    retained_backups               = 30
  }

  maintenance_window = {
    day          = 7 # Sunday
    hour         = 4
    update_track = "stable"
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

  # Production sizing - high availability
  cache_memory_size_gb   = 10
  session_memory_size_gb = 5
  enable_pubsub_instance = true
  pubsub_memory_size_gb  = 5
  tier                   = "STANDARD_HA"

  # Redis persistence for production
  persistence_config = {
    persistence_mode    = "RDB"
    rdb_snapshot_period = "ONE_HOUR"
  }

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

  # Object versioning for production
  enable_versioning = true

  # Longer retention for backups
  backup_retention_days = 365

  create_terraform_state_bucket = false
}

# -----------------------------------------------------------------------------
# IAM Module
# -----------------------------------------------------------------------------

module "iam" {
  source = "../../modules/iam"

  project_id    = local.project_id
  environment   = local.environment
  k8s_namespace = "aivo"
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

  alert_email       = var.alert_email
  slack_webhook_url = var.slack_webhook_url
  slack_channel     = "#aivo-production-alerts"
  api_domain        = "api.aivo.io"
  web_domain        = "app.aivo.io"
  audit_log_bucket  = module.storage.backup_bucket_name
  k8s_namespace     = "aivo"

  cloudsql_max_connections = 500

  depends_on = [module.storage]
}

# -----------------------------------------------------------------------------
# CDN Module
# -----------------------------------------------------------------------------

module "cdn" {
  source = "../../modules/cdn"

  project_id  = local.project_id
  environment = local.environment

  static_assets_bucket  = module.storage.static_assets_bucket_name
  content_assets_bucket = module.storage.content_assets_bucket_name

  cdn_domains = var.cdn_domains

  # Enable Cloud Armor for production
  enable_cloud_armor = true

  # Production cache settings
  default_cache_ttl = 3600
  max_cache_ttl     = 86400
  client_cache_ttl  = 3600

  depends_on = [module.storage]
}
