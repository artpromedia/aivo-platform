# ==============================================================================
# AIVO Platform - Development Infrastructure
# ==============================================================================
# Lightweight development environment

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket         = "aivo-terraform-state"
    key            = "development/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "aivo-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "aivo"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name         = "aivo-${var.environment}"
  cluster_name = "${local.name}-eks"
  
  tags = {
    Environment = var.environment
    Project     = "aivo"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# ==============================================================================
# VPC
# ==============================================================================
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name}-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 2)
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway   = true
  single_nat_gateway   = true  # Cost savings for dev
  enable_dns_hostnames = true
  enable_dns_support   = true

  public_subnet_tags = {
    "kubernetes.io/role/elb"                    = 1
    "kubernetes.io/cluster/${local.cluster_name}" = "owned"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"           = 1
    "kubernetes.io/cluster/${local.cluster_name}" = "owned"
  }

  tags = local.tags
}

# ==============================================================================
# EKS CLUSTER
# ==============================================================================
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = local.cluster_name
  cluster_version = var.eks_cluster_version

  cluster_endpoint_public_access = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    general = {
      name           = "general"
      instance_types = ["t3.medium"]
      capacity_type  = "SPOT"  # Cost savings

      min_size     = 1
      max_size     = 5
      desired_size = 2

      labels = {
        role = "general"
      }
    }
  }

  tags = local.tags
}

# ==============================================================================
# RDS POSTGRESQL (Minimal)
# ==============================================================================
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${local.name}-postgres"

  engine               = "postgres"
  engine_version       = "15.4"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = "db.t3.micro"

  allocated_storage = 20
  storage_encrypted = true

  db_name  = "aivo"
  username = "aivo_admin"
  port     = 5432

  multi_az               = false  # Cost savings
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [module.rds_security_group.security_group_id]

  backup_retention_period = 7
  deletion_protection     = false
  skip_final_snapshot     = true

  tags = local.tags
}

module "rds_security_group" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 5.0"

  name        = "${local.name}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = module.vpc.vpc_id

  ingress_with_source_security_group_id = [
    {
      from_port                = 5432
      to_port                  = 5432
      protocol                 = "tcp"
      source_security_group_id = module.eks.node_security_group_id
    }
  ]

  tags = local.tags
}

# ==============================================================================
# ELASTICACHE REDIS (Minimal)
# ==============================================================================
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${local.name}-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.1"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [module.redis_security_group.security_group_id]

  tags = local.tags
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name}-redis-subnet"
  subnet_ids = module.vpc.private_subnets
}

module "redis_security_group" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 5.0"

  name        = "${local.name}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = module.vpc.vpc_id

  ingress_with_source_security_group_id = [
    {
      from_port                = 6379
      to_port                  = 6379
      protocol                 = "tcp"
      source_security_group_id = module.eks.node_security_group_id
    }
  ]

  tags = local.tags
}

# ==============================================================================
# S3 BUCKETS
# ==============================================================================
module "s3_assets" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 3.0"

  bucket        = "${local.name}-assets"
  force_destroy = true  # Allow deletion in dev

  versioning = {
    enabled = false
  }

  tags = local.tags
}

# ==============================================================================
# OUTPUTS
# ==============================================================================
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  value     = module.rds.db_instance_endpoint
  sensitive = true
}

output "redis_endpoint" {
  value     = aws_elasticache_cluster.redis.cache_nodes[0].address
  sensitive = true
}
