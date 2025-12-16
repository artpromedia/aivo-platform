# =============================================================================
# AIVO Platform - Redis (Memorystore) Module
# =============================================================================
# Creates Redis instances for caching and session storage
# =============================================================================

# -----------------------------------------------------------------------------
# Main Cache Instance
# -----------------------------------------------------------------------------
resource "google_redis_instance" "cache" {
  name           = "${var.project_prefix}-redis-cache-${var.environment}"
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = var.cache_memory_size_gb
  region         = var.region

  authorized_network = var.vpc_id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_version = "REDIS_7_0"
  display_name  = "AIVO ${title(var.environment)} Cache"

  redis_configs = {
    maxmemory-policy       = "allkeys-lru"
    notify-keyspace-events = "Ex"  # Enable expiration events
    activedefrag           = "yes"
  }

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 4
        minutes = 0
      }
    }
  }

  # Auth (production only)
  auth_enabled = var.environment == "production"

  # Transit encryption
  transit_encryption_mode = var.environment == "production" ? "SERVER_AUTHENTICATION" : "DISABLED"

  labels = {
    environment = var.environment
    application = "aivo"
    purpose     = "cache"
  }

  depends_on = [var.private_vpc_connection]
}

# -----------------------------------------------------------------------------
# Session Store Instance (Separate for Isolation)
# -----------------------------------------------------------------------------
resource "google_redis_instance" "sessions" {
  name           = "${var.project_prefix}-redis-sessions-${var.environment}"
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = var.session_memory_size_gb
  region         = var.region

  authorized_network = var.vpc_id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_version = "REDIS_7_0"
  display_name  = "AIVO ${title(var.environment)} Sessions"

  redis_configs = {
    maxmemory-policy = "volatile-lru"  # Only evict keys with TTL
  }

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 5
        minutes = 0
      }
    }
  }

  auth_enabled            = var.environment == "production"
  transit_encryption_mode = var.environment == "production" ? "SERVER_AUTHENTICATION" : "DISABLED"

  labels = {
    environment = var.environment
    application = "aivo"
    purpose     = "sessions"
  }

  depends_on = [var.private_vpc_connection]
}

# -----------------------------------------------------------------------------
# Pub/Sub Instance for Real-time Events (Optional)
# -----------------------------------------------------------------------------
resource "google_redis_instance" "pubsub" {
  count = var.enable_pubsub_redis ? 1 : 0

  name           = "${var.project_prefix}-redis-pubsub-${var.environment}"
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = var.pubsub_memory_size_gb
  region         = var.region

  authorized_network = var.vpc_id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_version = "REDIS_7_0"
  display_name  = "AIVO ${title(var.environment)} Pub/Sub"

  redis_configs = {
    maxmemory-policy       = "noeviction"
    notify-keyspace-events = "AKE"  # All keyspace events
  }

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 6
        minutes = 0
      }
    }
  }

  auth_enabled            = var.environment == "production"
  transit_encryption_mode = var.environment == "production" ? "SERVER_AUTHENTICATION" : "DISABLED"

  labels = {
    environment = var.environment
    application = "aivo"
    purpose     = "pubsub"
  }

  depends_on = [var.private_vpc_connection]
}

# -----------------------------------------------------------------------------
# Store Redis Connection Info in Secret Manager
# -----------------------------------------------------------------------------
resource "google_secret_manager_secret" "cache_connection" {
  secret_id = "redis-cache-connection-${var.environment}"

  labels = {
    environment = var.environment
    purpose     = "cache"
  }

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "cache_connection" {
  secret = google_secret_manager_secret.cache_connection.id
  secret_data = jsonencode({
    host = google_redis_instance.cache.host
    port = google_redis_instance.cache.port
    auth = var.environment == "production" ? google_redis_instance.cache.auth_string : null
  })
}

resource "google_secret_manager_secret" "sessions_connection" {
  secret_id = "redis-sessions-connection-${var.environment}"

  labels = {
    environment = var.environment
    purpose     = "sessions"
  }

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "sessions_connection" {
  secret = google_secret_manager_secret.sessions_connection.id
  secret_data = jsonencode({
    host = google_redis_instance.sessions.host
    port = google_redis_instance.sessions.port
    auth = var.environment == "production" ? google_redis_instance.sessions.auth_string : null
  })
}
