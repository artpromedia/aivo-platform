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
  environment    = "production"
  project_id     = var.project_id
  region         = var.region
  project_prefix = "aivo"
}

# -----------------------------------------------------------------------------
# Networking Module
# -----------------------------------------------------------------------------

module "networking" {
  source = "../../modules/networking"

  project_id     = local.project_id
  project_prefix = local.project_prefix
  region         = local.region
  environment    = local.environment

  main_cidr     = "10.10.0.0/16"
  pods_cidr     = "10.108.0.0/14"
  services_cidr = "10.112.0.0/20"
  master_cidr   = "10.115.0.0/28"
}

# -----------------------------------------------------------------------------
# GKE Module
# -----------------------------------------------------------------------------

module "gke" {
  source = "../../modules/gke"

  project_id     = local.project_id
  project_prefix = local.project_prefix
  region         = local.region
  environment    = local.environment

  # Producción: multi-zona para HA
  node_zones = ["us-central1-a", "us-central1-b", "us-central1-f"]

  vpc_id                        = module.networking.vpc_id
  subnet_id                     = module.networking.subnet_id
  pods_secondary_range_name     = module.networking.pods_secondary_range_name
  services_secondary_range_name = module.networking.services_secondary_range_name

  # IMPORTANTE: CIDR distinto a staging
  master_cidr            = "10.125.0.0/28"
  private_vpc_connection = module.networking.private_vpc_connection

  # Service Account (del módulo IAM)
  gke_service_account_email = module.iam.gke_nodes_service_account_email

  # App pool (PROD): autoscaling. En tu módulo, si environment == production,
  # el node_count se vuelve null automáticamente.
  app_machine_type = "e2-standard-4"
  app_node_count   = null
  app_min_nodes    = 3
  app_max_nodes    = 20

  # Para evitar repetir el problema de cuota SSD_TOTAL_GB:
  # deja 50GB y PD-BALANCED (ya lo arreglaste en el módulo)
  app_disk_size = 50

  # GPU pool: normalmente OFF en prod al inicio, se activa cuando esté todo estable
  enable_gpu_pool = false
  ai_machine_type = "n1-standard-4"
  ai_max_nodes    = 1
  gpu_type        = "nvidia-tesla-t4"
  gpu_count       = 1

  depends_on = [module.networking, module.iam]
}
# -----------------------------------------------------------------------------
# Cloud SQL Module
# -----------------------------------------------------------------------------

module "cloudsql" {
  source = "../../modules/cloudsql"

  project_id  = local.project_id
  region      = local.region
  environment = local.environment

  vpc_id = module.networking.vpc_id
  #private_service_connection = module.networking.private_vpc_connection

  private_vpc_connection = module.networking.private_vpc_connection
  # Production sizing - high availability
  db_tier = "db-custom-8-32768"
  #db_disk_size        = 500
  #availability_type   = "REGIONAL"
  #enable_read_replica = true
  read_replica_count = 2

  #database_flags = {
  # max_connections            = 500
  # log_min_duration_statement = 1000
  # log_checkpoints            = "on"
  # log_connections            = "on"
  # log_disconnections         = "on"
  #}

  # Point-in-time recovery
  #backup_configuration = {
  # enabled                        = true
  # point_in_time_recovery_enabled = true
  # start_time                     = "03:00"
  # transaction_log_retention_days = 7
  # retained_backups               = 30
  #}

  #maintenance_window = {
  #  day          = 7 # Sunday
  #  hour         = 4
  #  update_track = "stable"
  #}

  depends_on = [module.networking]
}

# -----------------------------------------------------------------------------
# Redis Module
# -----------------------------------------------------------------------------

module "redis" {
  source         = "../../modules/redis"
  project_id     = local.project_id
  project_prefix = local.project_prefix
  region         = local.region
  environment    = local.environment

  vpc_id                 = module.networking.vpc_id
  private_vpc_connection = module.networking.private_vpc_connection

  # Staging sizing
  cache_memory_size_gb   = 2
  session_memory_size_gb = 2
  enable_pubsub_redis    = true
  pubsub_memory_size_gb  = 1

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

  #  cors_origins = var.cors_origins

  # Object versioning for production
  #  enable_versioning = true

  # Longer retention for backups
  #  backup_retention_days = 365

  #  create_terraform_state_bucket = false
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
  audit_log_bucket  = module.storage.backups_bucket_name
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
