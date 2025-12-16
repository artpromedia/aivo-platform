# =============================================================================
# AIVO Platform - Cloud SQL Module Variables
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

variable "vpc_id" {
  description = "VPC network ID for private IP"
  type        = string
}

variable "private_vpc_connection" {
  description = "Private VPC connection ID (for dependency)"
  type        = string
}

# Instance Configuration
variable "db_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-custom-2-8192"  # 2 vCPU, 8GB RAM
}

variable "disk_size" {
  description = "Initial disk size in GB"
  type        = number
  default     = 50
}

variable "replica_tier" {
  description = "Cloud SQL replica instance tier"
  type        = string
  default     = "db-custom-2-8192"
}

variable "read_replica_count" {
  description = "Number of read replicas (production only)"
  type        = number
  default     = 1
}

variable "authorized_networks" {
  description = "List of authorized networks"
  type = list(object({
    name = string
    cidr = string
  }))
  default = []
}

# Service Databases
variable "service_databases" {
  description = "List of databases to create for services"
  type        = list(string)
  default = [
    "aivo_auth",
    "aivo_tenant",
    "aivo_profile",
    "aivo_content",
    "aivo_content_authoring",
    "aivo_session",
    "aivo_assessment",
    "aivo_baseline",
    "aivo_learner_model",
    "aivo_personalization",
    "aivo_engagement",
    "aivo_goal",
    "aivo_focus",
    "aivo_teacher_planning",
    "aivo_collaboration",
    "aivo_messaging",
    "aivo_notify",
    "aivo_analytics",
    "aivo_reports",
    "aivo_retention",
    "aivo_marketplace",
    "aivo_embedded_tools",
    "aivo_lti",
    "aivo_sis_sync",
    "aivo_integration",
    "aivo_billing",
    "aivo_consent",
    "aivo_dsr",
    "aivo_experimentation",
    "aivo_device_mgmt",
    "aivo_sandbox",
    "aivo_research",
    "aivo_homework_helper",
  ]
}
