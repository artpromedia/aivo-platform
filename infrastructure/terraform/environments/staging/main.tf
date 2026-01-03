# ==============================================================================
# AIVO Platform - Staging Infrastructure
# ==============================================================================
# Staging environment with production-like configuration at reduced scale

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
    key            = "staging/terraform.tfstate"
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

data "aws_caller_identity" "current" {}

# ==============================================================================
# VPC
# ==============================================================================
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name}-vpc"
  cidr = var.vpc_cidr

  azs              = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets  = var.private_subnets
  public_subnets   = var.public_subnets
  database_subnets = var.database_subnets

  enable_nat_gateway     = true
  single_nat_gateway     = true  # Cost optimization for staging
  one_nat_gateway_per_az = false
  enable_dns_hostnames   = true
  enable_dns_support     = true

  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true

  public_subnet_tags = {
    "kubernetes.io/role/elb"                    = 1
    "kubernetes.io/cluster/${local.cluster_name}" = "owned"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"           = 1
    "kubernetes.io/cluster/${local.cluster_name}" = "owned"
    "karpenter.sh/discovery"                    = local.cluster_name
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

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn
    }
  }

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    general = {
      name           = "general"
      instance_types = ["m6i.large", "m5.large"]
      capacity_type  = "ON_DEMAND"

      min_size     = 2
      max_size     = 10
      desired_size = 3

      labels = {
        role = "general"
      }
    }

    spot = {
      name           = "spot"
      instance_types = ["m6i.large", "m5.large", "t3.large"]
      capacity_type  = "SPOT"

      min_size     = 0
      max_size     = 20
      desired_size = 2

      labels = {
        role = "spot"
      }

      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }

  manage_aws_auth_configmap = true
  aws_auth_roles = [
    {
      rolearn  = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/AivoAdminRole"
      username = "admin"
      groups   = ["system:masters"]
    }
  ]

  tags = local.tags
}

module "ebs_csi_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name             = "${local.name}-ebs-csi"
  attach_ebs_csi_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:ebs-csi-controller-sa"]
    }
  }

  tags = local.tags
}

# ==============================================================================
# RDS POSTGRESQL
# ==============================================================================
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${local.name}-postgres"

  engine               = "postgres"
  engine_version       = "15.4"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = var.rds_instance_class

  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  storage_encrypted     = true

  db_name  = "aivo"
  username = "aivo_admin"
  port     = 5432

  multi_az               = true  # Enable for staging to test failover
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [module.rds_security_group.security_group_id]

  backup_retention_period = 14
  backup_window           = "03:00-06:00"
  maintenance_window      = "Mon:00:00-Mon:03:00"
  deletion_protection     = true
  skip_final_snapshot     = false

  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  create_monitoring_role                = true
  monitoring_interval                   = 60
  monitoring_role_name                  = "${local.name}-rds-monitoring"

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
# ELASTICACHE REDIS
# ==============================================================================
module "elasticache" {
  source = "../../modules/elasticache"

  name               = "${local.name}-redis"
  node_type          = var.redis_node_type
  num_cache_clusters = var.redis_num_cache_clusters
  engine_version     = "7.1"
  
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [module.redis_security_group.security_group_id]

  automatic_failover_enabled = true
  multi_az_enabled           = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  snapshot_retention_limit = 7
  snapshot_window          = "05:00-09:00"

  tags = local.tags
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

  bucket = "${local.name}-assets"

  versioning = {
    enabled = true
  }

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "AES256"
      }
    }
  }

  tags = local.tags
}

# ==============================================================================
# SECRETS MANAGER
# ==============================================================================
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "aivo/${var.environment}/app"
  description             = "Application secrets for AIVO ${var.environment}"
  recovery_window_in_days = 7

  tags = local.tags
}

resource "aws_secretsmanager_secret" "database" {
  name                    = "aivo/${var.environment}/database"
  description             = "Database credentials for AIVO ${var.environment}"
  recovery_window_in_days = 7

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
  value     = module.elasticache.primary_endpoint
  sensitive = true
}

output "s3_assets_bucket" {
  value = module.s3_assets.s3_bucket_id
}
