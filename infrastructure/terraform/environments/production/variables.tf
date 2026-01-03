# ==============================================================================
# AIVO Platform - Production Variables
# ==============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# ==============================================================================
# VPC
# ==============================================================================
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnets" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnets" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnets" {
  description = "Database subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
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
  default     = "db.r6g.xlarge"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 100
}

variable "rds_max_allocated_storage" {
  description = "RDS max allocated storage in GB for autoscaling"
  type        = number
  default     = 500
}

variable "rds_replica_instance_class" {
  description = "RDS replica instance class"
  type        = string
  default     = "db.r6g.large"
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
  default     = 3
}

variable "redis_auth_token" {
  description = "Redis auth token"
  type        = string
  sensitive   = true
}

# ==============================================================================
# CLOUDFRONT
# ==============================================================================
variable "cloudfront_aliases" {
  description = "CloudFront aliases"
  type        = list(string)
  default     = ["app.aivo.edu", "cdn.aivo.edu"]
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for CloudFront"
  type        = string
}

variable "alb_domain_name" {
  description = "ALB domain name for CloudFront origin"
  type        = string
}
