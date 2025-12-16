# =============================================================================
# AIVO Platform - Cloud SQL Module
# =============================================================================
# Creates PostgreSQL instances with read replicas, per-service databases,
# and secure password management via Secret Manager
# =============================================================================

# -----------------------------------------------------------------------------
# Primary PostgreSQL Instance
# -----------------------------------------------------------------------------
resource "google_sql_database_instance" "primary" {
  name             = "${var.project_prefix}-postgres-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.region

  deletion_protection = var.environment == "production"

  settings {
    tier              = var.db_tier
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_size         = var.disk_size
    disk_type         = "PD_SSD"
    disk_autoresize   = true
    disk_autoresize_limit = var.environment == "production" ? 500 : 100

    # Backup configuration
    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = var.environment == "production"
      start_time                     = "03:00"
      transaction_log_retention_days = var.environment == "production" ? 7 : 1
      
      backup_retention_settings {
        retained_backups = var.environment == "production" ? 30 : 7
        retention_unit   = "COUNT"
      }
    }

    # Private IP configuration
    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_id
      require_ssl     = true
      
      dynamic "authorized_networks" {
        for_each = var.authorized_networks
        content {
          name  = authorized_networks.value.name
          value = authorized_networks.value.cidr
        }
      }
    }

    # Database flags for security and performance
    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    database_flags {
      name  = "log_disconnections"
      value = "on"
    }

    database_flags {
      name  = "log_lock_waits"
      value = "on"
    }

    database_flags {
      name  = "log_temp_files"
      value = "0"
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = var.environment == "production" ? "1000" : "500"
    }

    database_flags {
      name  = "max_connections"
      value = var.environment == "production" ? "500" : "100"
    }

    database_flags {
      name  = "random_page_cost"
      value = "1.1"  # Optimized for SSD
    }

    # Query insights
    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }

    # Maintenance window
    maintenance_window {
      day          = 7  # Sunday
      hour         = 4  # 4 AM
      update_track = var.environment == "production" ? "stable" : "canary"
    }

    # Labels
    user_labels = {
      environment = var.environment
      application = "aivo"
      managed_by  = "terraform"
    }
  }

  depends_on = [var.private_vpc_connection]
}

# -----------------------------------------------------------------------------
# Read Replicas (Production only)
# -----------------------------------------------------------------------------
resource "google_sql_database_instance" "read_replica" {
  count                = var.environment == "production" ? var.read_replica_count : 0
  name                 = "${var.project_prefix}-postgres-replica-${count.index + 1}-${var.environment}"
  master_instance_name = google_sql_database_instance.primary.name
  region               = var.region
  database_version     = "POSTGRES_15"

  deletion_protection = true

  replica_configuration {
    failover_target = false
  }

  settings {
    tier            = var.replica_tier
    disk_size       = var.disk_size
    disk_type       = "PD_SSD"
    disk_autoresize = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_id
      require_ssl     = true
    }

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    user_labels = {
      environment = var.environment
      application = "aivo"
      role        = "read-replica"
    }
  }
}

# -----------------------------------------------------------------------------
# Service Databases
# -----------------------------------------------------------------------------
resource "google_sql_database" "service_databases" {
  for_each = toset(var.service_databases)

  name     = each.value
  instance = google_sql_database_instance.primary.name
  charset  = "UTF8"
  collation = "en_US.UTF8"
}

# -----------------------------------------------------------------------------
# Generate Random Passwords for Each Service
# -----------------------------------------------------------------------------
resource "random_password" "db_passwords" {
  for_each = toset(var.service_databases)

  length           = 32
  special          = true
  override_special = "!@#$%^&*()_+-="
  min_lower        = 5
  min_upper        = 5
  min_numeric      = 5
  min_special      = 2
}

# -----------------------------------------------------------------------------
# Database Users (One per Service)
# -----------------------------------------------------------------------------
resource "google_sql_user" "service_users" {
  for_each = toset(var.service_databases)

  name     = replace(each.value, "aivo_", "")
  instance = google_sql_database_instance.primary.name
  password = random_password.db_passwords[each.key].result
  type     = "BUILT_IN"
}

# -----------------------------------------------------------------------------
# Store Passwords in Secret Manager
# -----------------------------------------------------------------------------
resource "google_secret_manager_secret" "db_passwords" {
  for_each = toset(var.service_databases)

  secret_id = "${each.value}-db-password-${var.environment}"

  labels = {
    environment = var.environment
    service     = replace(each.value, "aivo_", "")
    type        = "database-password"
  }

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_passwords" {
  for_each = toset(var.service_databases)

  secret      = google_secret_manager_secret.db_passwords[each.key].id
  secret_data = random_password.db_passwords[each.key].result
}

# -----------------------------------------------------------------------------
# Store Connection Strings in Secret Manager
# -----------------------------------------------------------------------------
resource "google_secret_manager_secret" "db_connection_strings" {
  for_each = toset(var.service_databases)

  secret_id = "${each.value}-db-url-${var.environment}"

  labels = {
    environment = var.environment
    service     = replace(each.value, "aivo_", "")
    type        = "database-url"
  }

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_connection_strings" {
  for_each = toset(var.service_databases)

  secret = google_secret_manager_secret.db_connection_strings[each.key].id
  secret_data = "postgresql://${google_sql_user.service_users[each.key].name}:${urlencode(random_password.db_passwords[each.key].result)}@${google_sql_database_instance.primary.private_ip_address}:5432/${each.value}?sslmode=require"
}

# -----------------------------------------------------------------------------
# Admin User (for migrations and maintenance)
# -----------------------------------------------------------------------------
resource "random_password" "admin_password" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*()_+-="
}

resource "google_sql_user" "admin" {
  name     = "aivo_admin"
  instance = google_sql_database_instance.primary.name
  password = random_password.admin_password.result
  type     = "BUILT_IN"
}

resource "google_secret_manager_secret" "admin_password" {
  secret_id = "postgres-admin-password-${var.environment}"

  labels = {
    environment = var.environment
    type        = "admin-password"
  }

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "admin_password" {
  secret      = google_secret_manager_secret.admin_password.id
  secret_data = random_password.admin_password.result
}
