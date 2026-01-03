# ==============================================================================
# AIVO Platform - ElastiCache Module
# ==============================================================================

variable "name" {
  description = "Name for the ElastiCache resources"
  type        = string
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "num_cache_clusters" {
  description = "Number of cache clusters (nodes)"
  type        = number
  default     = 2
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the cache cluster"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs"
  type        = list(string)
}

variable "automatic_failover_enabled" {
  description = "Enable automatic failover"
  type        = bool
  default     = true
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ"
  type        = bool
  default     = true
}

variable "at_rest_encryption_enabled" {
  description = "Enable at-rest encryption"
  type        = bool
  default     = true
}

variable "transit_encryption_enabled" {
  description = "Enable in-transit encryption"
  type        = bool
  default     = true
}

variable "auth_token" {
  description = "Auth token for Redis (password)"
  type        = string
  sensitive   = true
  default     = null
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain snapshots"
  type        = number
  default     = 7
}

variable "snapshot_window" {
  description = "Daily time range for snapshots"
  type        = string
  default     = "05:00-09:00"
}

variable "maintenance_window" {
  description = "Weekly time range for maintenance"
  type        = string
  default     = "sun:23:00-mon:01:30"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# ==============================================================================
# RESOURCES
# ==============================================================================

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name}-subnet-group"
  subnet_ids = var.subnet_ids

  tags = var.tags
}

resource "aws_elasticache_parameter_group" "this" {
  name   = "${var.name}-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  tags = var.tags
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = var.name
  description          = "Redis cluster for ${var.name}"

  node_type            = var.node_type
  num_cache_clusters   = var.num_cache_clusters
  engine_version       = var.engine_version
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.this.name

  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = var.security_group_ids

  automatic_failover_enabled = var.automatic_failover_enabled
  multi_az_enabled           = var.multi_az_enabled

  at_rest_encryption_enabled = var.at_rest_encryption_enabled
  transit_encryption_enabled = var.transit_encryption_enabled
  auth_token                 = var.auth_token

  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = var.snapshot_window
  maintenance_window       = var.maintenance_window

  apply_immediately = false

  tags = var.tags

  lifecycle {
    ignore_changes = [num_cache_clusters]
  }
}

# ==============================================================================
# OUTPUTS
# ==============================================================================

output "id" {
  description = "Replication group ID"
  value       = aws_elasticache_replication_group.this.id
}

output "arn" {
  description = "Replication group ARN"
  value       = aws_elasticache_replication_group.this.arn
}

output "primary_endpoint" {
  description = "Primary endpoint address"
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Reader endpoint address"
  value       = aws_elasticache_replication_group.this.reader_endpoint_address
}

output "port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.this.port
}
