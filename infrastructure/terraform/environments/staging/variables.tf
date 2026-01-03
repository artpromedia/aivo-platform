# ==============================================================================
# AIVO Platform - Staging Variables
# ==============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

# ==============================================================================
# VPC
# ==============================================================================
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.20.0.0/16"
}

variable "private_subnets" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.20.1.0/24", "10.20.2.0/24", "10.20.3.0/24"]
}

variable "public_subnets" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.20.101.0/24", "10.20.102.0/24", "10.20.103.0/24"]
}

variable "database_subnets" {
  description = "Database subnet CIDR blocks"
  type        = list(string)
  default     = ["10.20.201.0/24", "10.20.202.0/24", "10.20.203.0/24"]
}

# ==============================================================================
# EKS
# ==============================================================================
variable "eks_cluster_version" {
  description = "EKS cluster version"
  type        = string
  default     = "1.28"
}

# ==============================================================================
# RDS
# ==============================================================================
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.large"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 50
}

variable "rds_max_allocated_storage" {
  description = "RDS max allocated storage in GB for autoscaling"
  type        = number
  default     = 200
}

# ==============================================================================
# ELASTICACHE
# ==============================================================================
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters"
  type        = number
  default     = 2
}

variable "redis_auth_token" {
  description = "Redis auth token"
  type        = string
  sensitive   = true
}
