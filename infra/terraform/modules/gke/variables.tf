# =============================================================================
# AIVO Platform - GKE Module Variables
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

variable "node_zones" {
  description = "List of zones for node locations (production only)"
  type        = list(string)
  default     = []
}

# Network
variable "vpc_id" {
  description = "VPC network ID"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID"
  type        = string
}

variable "master_cidr" {
  description = "CIDR for GKE master nodes"
  type        = string
}

variable "pods_secondary_range_name" {
  description = "Name of secondary range for pods"
  type        = string
}

variable "services_secondary_range_name" {
  description = "Name of secondary range for services"
  type        = string
}

variable "private_vpc_connection" {
  description = "Private VPC connection ID (for dependency)"
  type        = string
  default     = ""
}

variable "private_endpoint" {
  description = "Enable private endpoint (no public access to master)"
  type        = bool
  default     = false
}

variable "master_authorized_networks" {
  description = "List of authorized networks for master access"
  type = list(object({
    cidr_block   = string
    display_name = string
  }))
  default = []
}

# Service Account
variable "gke_service_account_email" {
  description = "Service account email for GKE nodes"
  type        = string
}

# Application Node Pool
variable "app_machine_type" {
  description = "Machine type for application nodes"
  type        = string
  default     = "e2-standard-4"
}

variable "app_node_count" {
  description = "Number of nodes (for non-production)"
  type        = number
  default     = 2
}

variable "app_min_nodes" {
  description = "Minimum nodes for autoscaling"
  type        = number
  default     = 2
}

variable "app_max_nodes" {
  description = "Maximum nodes for autoscaling"
  type        = number
  default     = 10
}

variable "app_disk_size" {
  description = "Disk size in GB for application nodes"
  type        = number
  default     = 100
}

# Cluster Autoscaling
variable "cluster_min_cpu" {
  description = "Minimum total CPU cores for cluster autoscaling"
  type        = number
  default     = 4
}

variable "cluster_max_cpu" {
  description = "Maximum total CPU cores for cluster autoscaling"
  type        = number
  default     = 100
}

variable "cluster_min_memory" {
  description = "Minimum total memory (GB) for cluster autoscaling"
  type        = number
  default     = 16
}

variable "cluster_max_memory" {
  description = "Maximum total memory (GB) for cluster autoscaling"
  type        = number
  default     = 400
}

# AI/GPU Node Pool
variable "enable_gpu_pool" {
  description = "Enable GPU node pool"
  type        = bool
  default     = false
}

variable "ai_machine_type" {
  description = "Machine type for AI workload nodes"
  type        = string
  default     = "n1-standard-8"
}

variable "ai_max_nodes" {
  description = "Maximum AI/GPU nodes"
  type        = number
  default     = 5
}

variable "gpu_type" {
  description = "GPU type for AI nodes"
  type        = string
  default     = "nvidia-tesla-t4"
}

variable "gpu_count" {
  description = "Number of GPUs per node"
  type        = number
  default     = 1
}
