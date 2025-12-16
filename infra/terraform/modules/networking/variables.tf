# =============================================================================
# AIVO Platform - Networking Module Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "project_prefix" {
  description = "Prefix for all resource names"
  type        = string
  default     = "aivo"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "main_cidr" {
  description = "CIDR range for main subnet"
  type        = string
  default     = "10.0.0.0/20"
}

variable "pods_cidr" {
  description = "CIDR range for GKE pods"
  type        = string
  default     = "10.1.0.0/16"
}

variable "services_cidr" {
  description = "CIDR range for GKE services"
  type        = string
  default     = "10.2.0.0/20"
}

variable "master_cidr" {
  description = "CIDR range for GKE master nodes"
  type        = string
  default     = "10.3.0.0/28"
}
