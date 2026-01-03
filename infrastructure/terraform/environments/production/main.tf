# ==============================================================================
# AIVO Platform - Production Infrastructure
# ==============================================================================
# AWS production environment with EKS, RDS, ElastiCache, and supporting services

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
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "aivo-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "aivo-terraform-locks"
  }
}

# ==============================================================================
# PROVIDERS
# ==============================================================================
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "aivo"
      ManagedBy   = "terraform"
      CostCenter  = "platform"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# ==============================================================================
# DATA SOURCES
# ==============================================================================
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# ==============================================================================
# LOCAL VALUES
# ==============================================================================
locals {
  name            = "aivo-${var.environment}"
  cluster_name    = "${local.name}-eks"
  
  azs = slice(data.aws_availability_zones.available.names, 0, 3)

  tags = {
    Environment = var.environment
    Project     = "aivo"
  }
}

# ==============================================================================
# VPC
# ==============================================================================
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name}-vpc"
  cidr = var.vpc_cidr

  azs              = local.azs
  private_subnets  = var.private_subnets
  public_subnets   = var.public_subnets
  database_subnets = var.database_subnets

  enable_nat_gateway     = true
  single_nat_gateway     = false
  one_nat_gateway_per_az = true
  enable_dns_hostnames   = true
  enable_dns_support     = true

  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true
  flow_log_max_aggregation_interval    = 60

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
      configuration_values = jsonencode({
        computeType = "Fargate"
      })
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent    = true
      before_compute = true
      configuration_values = jsonencode({
        env = {
          ENABLE_PREFIX_DELEGATION = "true"
          WARM_PREFIX_TARGET       = "1"
        }
      })
    }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn
    }
  }

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Managed node groups
  eks_managed_node_groups = {
    system = {
      name           = "system"
      instance_types = ["m6i.large"]
      capacity_type  = "ON_DEMAND"

      min_size     = 2
      max_size     = 4
      desired_size = 2

      labels = {
        role = "system"
      }

      taints = [{
        key    = "CriticalAddonsOnly"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }

    general = {
      name           = "general"
      instance_types = ["m6i.xlarge", "m6i.2xlarge"]
      capacity_type  = "ON_DEMAND"

      min_size     = 3
      max_size     = 20
      desired_size = 5

      labels = {
        role = "general"
      }
    }

    spot = {
      name           = "spot"
      instance_types = ["m6i.large", "m6i.xlarge", "m5.large", "m5.xlarge"]
      capacity_type  = "SPOT"

      min_size     = 0
      max_size     = 50
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

  # Fargate profiles for system workloads
  fargate_profiles = {
    kube-system = {
      name = "kube-system"
      selectors = [
        { namespace = "kube-system" }
      ]
    }
  }

  # Cluster security group rules
  cluster_security_group_additional_rules = {
    ingress_nodes_ephemeral_ports_tcp = {
      description                = "Nodes on ephemeral ports"
      protocol                   = "tcp"
      from_port                  = 1025
      to_port                    = 65535
      type                       = "ingress"
      source_node_security_group = true
    }
  }

  # Node security group rules
  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all ports/protocols"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
    egress_all = {
      description      = "Node all egress"
      protocol         = "-1"
      from_port        = 0
      to_port          = 0
      type             = "egress"
      cidr_blocks      = ["0.0.0.0/0"]
      ipv6_cidr_blocks = ["::/0"]
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

# ==============================================================================
# EBS CSI DRIVER IRSA
# ==============================================================================
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
  storage_type          = "gp3"

  db_name  = "aivo"
  username = "aivo_admin"
  port     = 5432

  multi_az               = true
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [module.rds_security_group.security_group_id]

  backup_retention_period = 30
  backup_window           = "03:00-06:00"
  maintenance_window      = "Mon:00:00-Mon:03:00"
  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier_prefix = "${local.name}-final-snapshot"

  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  create_monitoring_role                = true
  monitoring_interval                   = 60
  monitoring_role_name                  = "${local.name}-rds-monitoring"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  parameters = [
    {
      name  = "log_statement"
      value = "all"
    },
    {
      name  = "log_min_duration_statement"
      value = "1000"
    },
    {
      name  = "shared_preload_libraries"
      value = "pg_stat_statements"
    }
  ]

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
      description              = "PostgreSQL access from EKS"
      source_security_group_id = module.eks.node_security_group_id
    }
  ]

  tags = local.tags
}

# ==============================================================================
# RDS READ REPLICA
# ==============================================================================
module "rds_replica" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${local.name}-postgres-replica"

  replicate_source_db = module.rds.db_instance_identifier

  engine               = "postgres"
  engine_version       = "15.4"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = var.rds_replica_instance_class

  storage_encrypted = true

  vpc_security_group_ids = [module.rds_security_group.security_group_id]

  backup_retention_period = 0
  skip_final_snapshot     = true

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  tags = local.tags
}

# ==============================================================================
# ELASTICACHE REDIS
# ==============================================================================
module "elasticache" {
  source = "../modules/elasticache"

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
  maintenance_window       = "sun:23:00-mon:01:30"

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
      description              = "Redis access from EKS"
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

  cors_rule = [
    {
      allowed_methods = ["GET", "HEAD"]
      allowed_origins = ["https://*.aivo.edu"]
      allowed_headers = ["*"]
      max_age_seconds = 3600
    }
  ]

  lifecycle_rule = [
    {
      id      = "archive-old-versions"
      enabled = true

      noncurrent_version_transition = [
        {
          days          = 30
          storage_class = "GLACIER"
        }
      ]

      noncurrent_version_expiration = {
        days = 365
      }
    }
  ]

  # Replication for DR
  replication_configuration = {
    role = aws_iam_role.s3_replication.arn

    rules = [
      {
        id       = "dr-replication"
        status   = "Enabled"
        priority = 1

        destination = {
          bucket        = "arn:aws:s3:::${local.name}-assets-dr"
          storage_class = "STANDARD"
        }
      }
    ]
  }

  tags = local.tags
}

resource "aws_iam_role" "s3_replication" {
  name = "${local.name}-s3-replication"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })

  tags = local.tags
}

module "s3_backups" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 3.0"

  bucket = "${local.name}-backups"

  versioning = {
    enabled = true
  }

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm     = "aws:kms"
        kms_master_key_id = module.kms.key_id
      }
    }
  }

  lifecycle_rule = [
    {
      id      = "move-to-glacier"
      enabled = true

      transition = [
        {
          days          = 30
          storage_class = "GLACIER"
        }
      ]

      expiration = {
        days = 2555  # 7 years for compliance
      }
    }
  ]

  tags = local.tags
}

# ==============================================================================
# KMS
# ==============================================================================
module "kms" {
  source  = "terraform-aws-modules/kms/aws"
  version = "~> 2.0"

  description             = "AIVO ${var.environment} encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  aliases = ["aivo/${var.environment}"]

  key_administrators = [
    "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/AivoAdminRole"
  ]

  key_users = [
    module.eks.cluster_iam_role_arn
  ]

  tags = local.tags
}

# ==============================================================================
# CLOUDFRONT
# ==============================================================================
module "cloudfront" {
  source  = "terraform-aws-modules/cloudfront/aws"
  version = "~> 3.0"

  aliases = var.cloudfront_aliases

  comment             = "AIVO ${var.environment} CDN"
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = "PriceClass_All"
  retain_on_delete    = false
  wait_for_deployment = true

  origin = {
    s3_assets = {
      domain_name = module.s3_assets.s3_bucket_bucket_regional_domain_name
      origin_id   = "s3-assets"

      s3_origin_config = {
        origin_access_identity = "s3-assets"
      }
    }

    alb = {
      domain_name = var.alb_domain_name
      origin_id   = "alb"

      custom_origin_config = {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  default_cache_behavior = {
    target_origin_id       = "alb"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods  = ["GET", "HEAD"]
    compress        = true
    query_string    = true

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  ordered_cache_behavior = [
    {
      path_pattern           = "/static/*"
      target_origin_id       = "s3-assets"
      viewer_protocol_policy = "redirect-to-https"

      allowed_methods = ["GET", "HEAD"]
      cached_methods  = ["GET", "HEAD"]
      compress        = true

      min_ttl     = 0
      default_ttl = 86400
      max_ttl     = 31536000
    },
    {
      path_pattern           = "/api/*"
      target_origin_id       = "alb"
      viewer_protocol_policy = "https-only"

      allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods  = ["GET", "HEAD"]
      compress        = true

      min_ttl     = 0
      default_ttl = 0
      max_ttl     = 0
    }
  ]

  viewer_certificate = {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  web_acl_id = module.waf.web_acl_arn

  tags = local.tags
}

# ==============================================================================
# WAF
# ==============================================================================
module "waf" {
  source = "../modules/waf"

  name        = "${local.name}-waf"
  description = "WAF for AIVO ${var.environment}"

  scope = "CLOUDFRONT"

  rules = [
    {
      name     = "AWSManagedRulesCommonRuleSet"
      priority = 1
    },
    {
      name     = "AWSManagedRulesKnownBadInputsRuleSet"
      priority = 2
    },
    {
      name     = "AWSManagedRulesSQLiRuleSet"
      priority = 3
    },
    {
      name     = "AWSManagedRulesLinuxRuleSet"
      priority = 4
    },
    {
      name     = "RateLimit"
      priority = 5
      rate_limit = 2000
    }
  ]

  tags = local.tags
}

# ==============================================================================
# SECRETS MANAGER
# ==============================================================================
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "aivo/${var.environment}/app"
  description             = "Application secrets for AIVO ${var.environment}"
  recovery_window_in_days = 30
  kms_key_id              = module.kms.key_id

  tags = local.tags
}

resource "aws_secretsmanager_secret" "database" {
  name                    = "aivo/${var.environment}/database"
  description             = "Database credentials for AIVO ${var.environment}"
  recovery_window_in_days = 30
  kms_key_id              = module.kms.key_id

  tags = local.tags
}

# ==============================================================================
# CLOUDWATCH
# ==============================================================================
resource "aws_cloudwatch_log_group" "application" {
  name              = "/aivo/${var.environment}/application"
  retention_in_days = 90
  kms_key_id        = module.kms.key_arn

  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${local.name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "This metric monitors EC2 CPU utilization"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  dimensions = {
    AutoScalingGroupName = module.eks.eks_managed_node_groups["general"].node_group_autoscaling_group_names[0]
  }

  tags = local.tags
}

resource "aws_sns_topic" "alerts" {
  name              = "${local.name}-alerts"
  kms_master_key_id = module.kms.key_id

  tags = local.tags
}

# ==============================================================================
# OUTPUTS
# ==============================================================================
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

output "rds_replica_endpoint" {
  description = "RDS replica endpoint"
  value       = module.rds_replica.db_instance_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.elasticache.primary_endpoint
  sensitive   = true
}

output "s3_assets_bucket" {
  description = "S3 assets bucket name"
  value       = module.s3_assets.s3_bucket_id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.cloudfront_distribution_domain_name
}
