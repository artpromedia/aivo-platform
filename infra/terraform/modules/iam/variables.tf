# =============================================================================
# AIVO Platform - IAM Module Variables
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

variable "k8s_namespace" {
  description = "Kubernetes namespace for workload identity"
  type        = string
  default     = "aivo"
}

variable "service_list" {
  description = "List of services requiring individual service accounts"
  type        = list(string)
  default = [
    "auth-svc",
    "tenant-svc",
    "content-svc",
    "session-svc",
    "assessment-svc",
    "engagement-svc",
    "analytics-svc",
    "billing-svc",
  ]
}
