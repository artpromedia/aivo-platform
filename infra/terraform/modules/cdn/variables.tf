# =============================================================================
# AIVO Platform - CDN Module Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

# -----------------------------------------------------------------------------
# Bucket Configuration
# -----------------------------------------------------------------------------

variable "static_assets_bucket" {
  description = "Name of the static assets GCS bucket"
  type        = string
}

variable "content_assets_bucket" {
  description = "Name of the content assets GCS bucket"
  type        = string
}

# -----------------------------------------------------------------------------
# Domain Configuration
# -----------------------------------------------------------------------------

variable "cdn_domains" {
  description = "List of domains to serve via CDN"
  type        = list(string)
}

# -----------------------------------------------------------------------------
# Cache Configuration
# -----------------------------------------------------------------------------

variable "default_cache_ttl" {
  description = "Default TTL for cached content in seconds"
  type        = number
  default     = 3600 # 1 hour
}

variable "max_cache_ttl" {
  description = "Maximum TTL for cached content in seconds"
  type        = number
  default     = 86400 # 1 day
}

variable "client_cache_ttl" {
  description = "Client-side cache TTL in seconds"
  type        = number
  default     = 3600 # 1 hour
}

# -----------------------------------------------------------------------------
# Security Configuration
# -----------------------------------------------------------------------------

variable "enable_cloud_armor" {
  description = "Enable Cloud Armor security policy"
  type        = bool
  default     = false
}

variable "blocked_ip_ranges" {
  description = "List of IP ranges to block (placeholder for threat intel)"
  type        = list(string)
  default     = ["192.0.2.0/24"] # Documentation range - replace with actual
}

# -----------------------------------------------------------------------------
# Cache Invalidation
# -----------------------------------------------------------------------------

variable "invalidate_cache" {
  description = "Trigger cache invalidation on apply"
  type        = bool
  default     = false
}
