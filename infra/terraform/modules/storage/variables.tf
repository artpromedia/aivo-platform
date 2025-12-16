# =============================================================================
# AIVO Platform - Storage Module Variables
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
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "allowed_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "create_state_bucket" {
  description = "Create Terraform state bucket"
  type        = bool
  default     = false
}
