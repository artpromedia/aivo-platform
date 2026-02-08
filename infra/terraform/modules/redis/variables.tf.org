# =============================================================================
# AIVO Platform - Redis Module Variables
# =============================================================================

variable "project_prefix" {
  description = "Prefix for all resource names"
  type        = string
  default     = "aivo"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "vpc_id" {
  description = "VPC network ID"
  type        = string
}

variable "private_vpc_connection" {
  description = "Private VPC connection ID (for dependency)"
  type        = string
}

# Cache Instance
variable "cache_memory_size_gb" {
  description = "Memory size for cache instance in GB"
  type        = number
  default     = 1
}

# Sessions Instance
variable "session_memory_size_gb" {
  description = "Memory size for sessions instance in GB"
  type        = number
  default     = 1
}

# Pub/Sub Instance
variable "enable_pubsub_redis" {
  description = "Enable separate Redis instance for pub/sub"
  type        = bool
  default     = false
}

variable "pubsub_memory_size_gb" {
  description = "Memory size for pub/sub instance in GB"
  type        = number
  default     = 1
}
