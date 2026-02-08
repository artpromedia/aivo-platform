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
  environment    = "staging"
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

  # Zonas (staging en us-central1-c, prod podría usar varias)
  node_zones = ["us-central1-c"]

  vpc_id                        = module.networking.vpc_id
  subnet_id                     = module.networking.subnet_id
  pods_secondary_range_name     = module.networking.pods_secondary_range_name
  services_secondary_range_name = module.networking.services_secondary_range_name

  master_cidr            = "10.115.0.0/28"
  private_vpc_connection = module.networking.private_vpc_connection

  # Service Account (debe venir del módulo IAM)
  gke_service_account_email = module.iam.gke_nodes_service_account_email
  # App pool (staging)
  app_machine_type = "e2-standard-4"
  app_node_count   = 2
  app_min_nodes    = 2
  app_max_nodes    = 5
  app_disk_size    = 50

  # GPU pool (si lo quieres en staging)
  enable_gpu_pool = true
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

  project_id     = local.project_id
  project_prefix = local.project_prefix
  region         = local.region
  environment    = local.environment

  vpc_id                 = module.networking.vpc_id
  private_vpc_connection = module.networking.private_vpc_connection

  # Staging sizing - moderate
  db_tier            = "db-custom-4-8192"
  disk_size          = 100
  read_replica_count = 1

  # Opcional: si el módulo soporta réplicas separadas por tier, define esto
  # replica_tier = "db-custom-2-4096"

  # Opcional: si quieres restringir redes autorizadas (si el módulo crea IP pública)
  # authorized_networks = [
  #   { name = "office", value = "X.X.X.X/32" }
  # ]

  # Opcional: si el módulo crea DBs por lista/mapa (depende de cómo esté definida)
  # service_databases = ["odoo", "n8n"]

  depends_on = [module.networking]
}
# -----------------------------------------------------------------------------
# Redis Module
# -----------------------------------------------------------------------------

module "redis" {
  source = "../../modules/redis"

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

  project_id     = local.project_id
  project_prefix = local.project_prefix
  region         = local.region
  environment    = local.environment

  allowed_origins     = var.cors_origins
  create_state_bucket = false
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

  alert_email       = var.alert_email
  slack_webhook_url = var.slack_webhook_url
  slack_channel     = "#aivo-staging-alerts"
  api_domain        = "api.staging.aivo.io"
  web_domain        = "staging.aivo.io"
  audit_log_bucket  = module.storage.backups_bucket_name
  k8s_namespace     = "aivo-staging"

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
