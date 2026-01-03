# Phase 7: Infrastructure Security - Detailed Chunks

## Chunk 7.1: WAF Configuration

**Time Estimate:** 6-8 hours  
**Priority:** P1 - High  
**Dependencies:** None

### Files to Create

**Full implementation provided in original prompt.**

### Implementation Sub-tasks

#### 7.1.1: WAF Main Configuration (3-4 hours)

```hcl
# infrastructure/terraform/modules/waf/main.tf

# Key sections:
# 1. AWS Managed Rules (CRS, SQLi, Known Bad Inputs)
# 2. Custom rate limiting rules
# 3. Geo-blocking rules
# 4. Bot control rules
# 5. Custom response bodies
```

#### 7.1.2: WAF Variables & Outputs (1-2 hours)

```hcl
# infrastructure/terraform/modules/waf/variables.tf
variable "name_prefix" { type = string }
variable "scope" { type = string, default = "REGIONAL" }
variable "blocked_countries" { type = list(string), default = null }
variable "allowed_ips" { type = list(string), default = [] }
variable "blocked_ips" { type = list(string), default = [] }
variable "tags" { type = map(string), default = {} }

# infrastructure/terraform/modules/waf/outputs.tf
output "web_acl_arn" { value = aws_wafv2_web_acl.main.arn }
output "web_acl_id" { value = aws_wafv2_web_acl.main.id }
```

#### 7.1.3: WAF Logging (1-2 hours)

```hcl
# CloudWatch log group for WAF logs
# Logging configuration with redacted fields
# Filter for BLOCK and COUNT actions only
```

### AWS Managed Rules to Enable

| Rule Group | Priority | Purpose |
|------------|----------|---------|
| AWSManagedRulesCommonRuleSet | 1 | Common attack protection |
| AWSManagedRulesKnownBadInputsRuleSet | 2 | Known bad inputs |
| AWSManagedRulesSQLiRuleSet | 3 | SQL injection |
| AWSManagedRulesLinuxRuleSet | 4 | Linux OS protection |
| AWSManagedRulesAmazonIpReputationList | 5 | IP reputation |
| AWSManagedRulesAnonymousIpList | 6 | Anonymous IPs |
| AWSManagedRulesBotControlRuleSet | 7 | Bot detection |

### Custom Rules

| Rule | Priority | Limit | Scope |
|------|----------|-------|-------|
| RateLimitGeneral | 10 | 2000/5min | All requests |
| RateLimitAuth | 11 | 100/5min | /api/auth/* |
| BlockMaliciousUA | 15 | - | Scanners |
| BlockNoUserAgent | 16 | - | Empty UA |
| GeoBlock | 20 | - | Configurable |
| BlockXSSQuery | 25 | - | Query strings |

### Acceptance Criteria
- [ ] All managed rules configured
- [ ] Custom rate limiting rules
- [ ] Geo-blocking (optional)
- [ ] WAF logging enabled
- [ ] Sensitive data redacted in logs
- [ ] Custom error responses
- [ ] IP whitelist/blacklist support

---

## Chunk 7.2: Security Groups & NACLs

**Time Estimate:** 4-6 hours  
**Priority:** P1 - High  
**Dependencies:** None

### Files to Create

#### 1. `infrastructure/terraform/modules/security-groups/main.tf`

```hcl
# ==============================================================================
# Security Groups for AIVO Platform
# ==============================================================================

# API Gateway / Load Balancer Security Group
resource "aws_security_group" "alb" {
  name        = "${var.name_prefix}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = var.vpc_id

  # HTTPS from anywhere
  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP redirect (to HTTPS)
  ingress {
    description = "HTTP for redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-alb-sg" })
}

# EKS Node Security Group
resource "aws_security_group" "eks_nodes" {
  name        = "${var.name_prefix}-eks-nodes-sg"
  description = "Security group for EKS worker nodes"
  vpc_id      = var.vpc_id

  # Allow inbound from ALB
  ingress {
    description     = "From ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow nodes to communicate with each other
  ingress {
    description = "Node to node"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  # Allow pods to communicate with cluster API
  ingress {
    description     = "Cluster API"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-eks-nodes-sg" })
}

# RDS Database Security Group
resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  # Allow from EKS nodes only
  ingress {
    description     = "PostgreSQL from EKS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  # No outbound needed for RDS
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-rds-sg" })
}

# Redis/ElastiCache Security Group
resource "aws_security_group" "redis" {
  name        = "${var.name_prefix}-redis-sg"
  description = "Security group for Redis ElastiCache"
  vpc_id      = var.vpc_id

  # Allow from EKS nodes only
  ingress {
    description     = "Redis from EKS"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-redis-sg" })
}

# Bastion Host Security Group (for emergency access)
resource "aws_security_group" "bastion" {
  name        = "${var.name_prefix}-bastion-sg"
  description = "Security group for bastion host"
  vpc_id      = var.vpc_id

  # SSH from specific IPs only
  ingress {
    description = "SSH from admin IPs"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_ip_whitelist
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-bastion-sg" })
}

# ==============================================================================
# Variables
# ==============================================================================

variable "name_prefix" { type = string }
variable "vpc_id" { type = string }
variable "admin_ip_whitelist" { 
  type = list(string) 
  description = "IPs allowed to access bastion"
}
variable "tags" { type = map(string), default = {} }

# ==============================================================================
# Outputs
# ==============================================================================

output "alb_security_group_id" { value = aws_security_group.alb.id }
output "eks_nodes_security_group_id" { value = aws_security_group.eks_nodes.id }
output "rds_security_group_id" { value = aws_security_group.rds.id }
output "redis_security_group_id" { value = aws_security_group.redis.id }
output "bastion_security_group_id" { value = aws_security_group.bastion.id }
```

### Acceptance Criteria
- [ ] Least privilege network rules
- [ ] Service-to-service isolation
- [ ] Database only accessible from app tier
- [ ] Redis only accessible from app tier
- [ ] Bastion with IP whitelist
- [ ] No direct internet access to databases

---

## Chunk 7.3: Secrets Management

**Time Estimate:** 4-6 hours  
**Priority:** P1 - High  
**Dependencies:** Chunk 7.4 (KMS)

### Files to Create

#### 1. `infrastructure/terraform/modules/secrets/main.tf`

```hcl
# ==============================================================================
# AWS Secrets Manager Configuration
# ==============================================================================

# Database credentials
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.name_prefix}/database/credentials"
  description = "RDS PostgreSQL credentials"
  kms_key_id  = var.kms_key_id

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    host     = var.db_host
    port     = 5432
    dbname   = var.db_name
  })
}

# API Keys
resource "aws_secretsmanager_secret" "api_keys" {
  name        = "${var.name_prefix}/api/keys"
  description = "API keys for external services"
  kms_key_id  = var.kms_key_id

  tags = var.tags
}

# JWT Secret
resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.name_prefix}/auth/jwt-secret"
  description = "JWT signing secret"
  kms_key_id  = var.kms_key_id

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

# ==============================================================================
# Automatic Rotation
# ==============================================================================

resource "aws_secretsmanager_secret_rotation" "db_credentials" {
  secret_id           = aws_secretsmanager_secret.db_credentials.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }
}

# Lambda for secret rotation
resource "aws_lambda_function" "secret_rotation" {
  function_name = "${var.name_prefix}-secret-rotation"
  role          = aws_iam_role.rotation_lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30

  filename         = data.archive_file.rotation_lambda.output_path
  source_code_hash = data.archive_file.rotation_lambda.output_base64sha256

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.region}.amazonaws.com"
    }
  }

  tags = var.tags
}

# ==============================================================================
# IAM for Secrets Access
# ==============================================================================

resource "aws_iam_policy" "secrets_read" {
  name        = "${var.name_prefix}-secrets-read"
  description = "Read access to application secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.db_credentials.arn,
          aws_secretsmanager_secret.api_keys.arn,
          aws_secretsmanager_secret.jwt_secret.arn,
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = [var.kms_key_id]
      }
    ]
  })
}

# ==============================================================================
# Random Password Generation
# ==============================================================================

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%^&*()-_=+[]{}|;:,.<>?"
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

# ==============================================================================
# Outputs
# ==============================================================================

output "db_credentials_arn" { value = aws_secretsmanager_secret.db_credentials.arn }
output "api_keys_arn" { value = aws_secretsmanager_secret.api_keys.arn }
output "jwt_secret_arn" { value = aws_secretsmanager_secret.jwt_secret.arn }
output "secrets_read_policy_arn" { value = aws_iam_policy.secrets_read.arn }
```

### Acceptance Criteria
- [ ] Database credentials in Secrets Manager
- [ ] JWT secrets in Secrets Manager
- [ ] API keys in Secrets Manager
- [ ] KMS encryption for all secrets
- [ ] Automatic rotation enabled
- [ ] IAM policies for secret access

---

## Chunk 7.4: KMS Key Management

**Time Estimate:** 3-4 hours  
**Priority:** P1 - High  
**Dependencies:** None

### Files to Create

#### 1. `infrastructure/terraform/modules/kms/main.tf`

```hcl
# ==============================================================================
# AWS KMS Key Configuration
# ==============================================================================

# Master encryption key for application data
resource "aws_kms_key" "main" {
  description             = "Master encryption key for ${var.name_prefix}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  # Multi-region for disaster recovery
  multi_region = var.multi_region

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow EKS Service"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow RDS Service"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:*"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, { Name = "${var.name_prefix}-main-key" })
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.name_prefix}-main"
  target_key_id = aws_kms_key.main.key_id
}

# Separate key for secrets
resource "aws_kms_key" "secrets" {
  description             = "Encryption key for secrets - ${var.name_prefix}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = merge(var.tags, { Name = "${var.name_prefix}-secrets-key" })
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.name_prefix}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

# Separate key for S3 (customer data)
resource "aws_kms_key" "s3" {
  description             = "Encryption key for S3 - ${var.name_prefix}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = merge(var.tags, { Name = "${var.name_prefix}-s3-key" })
}

resource "aws_kms_alias" "s3" {
  name          = "alias/${var.name_prefix}-s3"
  target_key_id = aws_kms_key.s3.key_id
}

# ==============================================================================
# Data
# ==============================================================================

data "aws_caller_identity" "current" {}

# ==============================================================================
# Variables
# ==============================================================================

variable "name_prefix" { type = string }
variable "region" { type = string }
variable "multi_region" { type = bool, default = false }
variable "tags" { type = map(string), default = {} }

# ==============================================================================
# Outputs
# ==============================================================================

output "main_key_id" { value = aws_kms_key.main.key_id }
output "main_key_arn" { value = aws_kms_key.main.arn }
output "main_key_alias" { value = aws_kms_alias.main.name }

output "secrets_key_id" { value = aws_kms_key.secrets.key_id }
output "secrets_key_arn" { value = aws_kms_key.secrets.arn }

output "s3_key_id" { value = aws_kms_key.s3.key_id }
output "s3_key_arn" { value = aws_kms_key.s3.arn }
```

### Acceptance Criteria
- [ ] Separate keys for different purposes
- [ ] Automatic key rotation enabled
- [ ] Key policies with least privilege
- [ ] Multi-region support (optional)
- [ ] Aliases for easy reference
- [ ] Service-specific permissions

---

## Chunk 7.5: Certificate Management

**Time Estimate:** 3-4 hours  
**Priority:** P1 - High  
**Dependencies:** None

### Files to Create

#### 1. `infrastructure/terraform/modules/acm/main.tf`

```hcl
# ==============================================================================
# AWS Certificate Manager Configuration
# ==============================================================================

# Primary domain certificate
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-main-cert" })
}

# DNS validation records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# CloudFront certificate (must be in us-east-1)
resource "aws_acm_certificate" "cloudfront" {
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-cloudfront-cert" })
}

# ==============================================================================
# Certificate Monitoring
# ==============================================================================

resource "aws_cloudwatch_metric_alarm" "cert_expiry" {
  alarm_name          = "${var.name_prefix}-cert-expiry"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DaysToExpiry"
  namespace           = "AWS/CertificateManager"
  period              = 86400 # 24 hours
  statistic           = "Minimum"
  threshold           = 30 # Alert 30 days before expiry
  alarm_description   = "Certificate expiring within 30 days"

  dimensions = {
    CertificateArn = aws_acm_certificate.main.arn
  }

  alarm_actions = var.alarm_sns_topic_arns

  tags = var.tags
}

# ==============================================================================
# Variables
# ==============================================================================

variable "name_prefix" { type = string }
variable "domain_name" { type = string }
variable "subject_alternative_names" { 
  type = list(string) 
  default = []
}
variable "route53_zone_id" { type = string }
variable "alarm_sns_topic_arns" { 
  type = list(string) 
  default = []
}
variable "tags" { type = map(string), default = {} }

# ==============================================================================
# Outputs
# ==============================================================================

output "certificate_arn" { value = aws_acm_certificate.main.arn }
output "cloudfront_certificate_arn" { value = aws_acm_certificate.cloudfront.arn }
output "certificate_domain" { value = aws_acm_certificate.main.domain_name }
```

### Acceptance Criteria
- [ ] ACM certificate provisioning
- [ ] DNS validation
- [ ] Auto-renewal (managed by ACM)
- [ ] CloudFront certificate in us-east-1
- [ ] Expiration monitoring
- [ ] SNS alerts for expiring certs

---

## Chunk 7.6: GuardDuty & Security Hub

**Time Estimate:** 4-5 hours  
**Priority:** P1 - High  
**Dependencies:** None

### Files to Create

#### 1. `infrastructure/terraform/modules/security-monitoring/main.tf`

```hcl
# ==============================================================================
# AWS GuardDuty Configuration
# ==============================================================================

resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }

  finding_publishing_frequency = "FIFTEEN_MINUTES"

  tags = var.tags
}

# GuardDuty findings filter
resource "aws_guardduty_filter" "high_severity" {
  name        = "high-severity-findings"
  action      = "ARCHIVE"
  detector_id = aws_guardduty_detector.main.id
  rank        = 1

  finding_criteria {
    criterion {
      field  = "severity"
      gte    = ["7"]
    }
  }
}

# ==============================================================================
# AWS Security Hub Configuration
# ==============================================================================

resource "aws_securityhub_account" "main" {}

# Enable security standards
resource "aws_securityhub_standards_subscription" "cis" {
  depends_on    = [aws_securityhub_account.main]
  standards_arn = "arn:aws:securityhub:${var.region}::standards/cis-aws-foundations-benchmark/v/1.4.0"
}

resource "aws_securityhub_standards_subscription" "aws_foundational" {
  depends_on    = [aws_securityhub_account.main]
  standards_arn = "arn:aws:securityhub:${var.region}::standards/aws-foundational-security-best-practices/v/1.0.0"
}

resource "aws_securityhub_standards_subscription" "pci_dss" {
  depends_on    = [aws_securityhub_account.main]
  standards_arn = "arn:aws:securityhub:${var.region}::standards/pci-dss/v/3.2.1"
}

# ==============================================================================
# EventBridge Rules for Findings
# ==============================================================================

resource "aws_cloudwatch_event_rule" "guardduty_findings" {
  name        = "${var.name_prefix}-guardduty-findings"
  description = "Capture GuardDuty findings"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [{ numeric = [">=", 7] }]
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "guardduty_sns" {
  rule      = aws_cloudwatch_event_rule.guardduty_findings.name
  target_id = "SendToSNS"
  arn       = var.alerts_sns_topic_arn
}

resource "aws_cloudwatch_event_rule" "securityhub_findings" {
  name        = "${var.name_prefix}-securityhub-findings"
  description = "Capture Security Hub findings"

  event_pattern = jsonencode({
    source      = ["aws.securityhub"]
    detail-type = ["Security Hub Findings - Imported"]
    detail = {
      findings = {
        Severity = {
          Label = ["CRITICAL", "HIGH"]
        }
      }
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "securityhub_sns" {
  rule      = aws_cloudwatch_event_rule.securityhub_findings.name
  target_id = "SendToSNS"
  arn       = var.alerts_sns_topic_arn
}

# ==============================================================================
# Variables
# ==============================================================================

variable "name_prefix" { type = string }
variable "region" { type = string }
variable "alerts_sns_topic_arn" { type = string }
variable "tags" { type = map(string), default = {} }

# ==============================================================================
# Outputs
# ==============================================================================

output "guardduty_detector_id" { value = aws_guardduty_detector.main.id }
output "securityhub_arn" { value = aws_securityhub_account.main.arn }
```

### Acceptance Criteria
- [ ] GuardDuty enabled with all data sources
- [ ] Security Hub enabled
- [ ] CIS Benchmark enabled
- [ ] AWS Foundational Best Practices enabled
- [ ] PCI-DSS standard enabled
- [ ] High severity alerts to SNS
- [ ] EventBridge integration

---

## Phase 7 Terraform Module Usage

```hcl
# Example usage in main.tf

module "waf" {
  source = "./modules/waf"
  
  name_prefix = "aivo-prod"
  scope       = "REGIONAL"
  
  blocked_countries = ["KP", "IR", "SY"] # Example
  allowed_ips       = ["10.0.0.0/8"]
  
  tags = local.common_tags
}

module "security_groups" {
  source = "./modules/security-groups"
  
  name_prefix        = "aivo-prod"
  vpc_id             = module.vpc.vpc_id
  admin_ip_whitelist = ["1.2.3.4/32"]
  
  tags = local.common_tags
}

module "kms" {
  source = "./modules/kms"
  
  name_prefix = "aivo-prod"
  region      = var.region
  
  tags = local.common_tags
}

module "secrets" {
  source = "./modules/secrets"
  
  name_prefix = "aivo-prod"
  kms_key_id  = module.kms.secrets_key_arn
  
  db_username = "aivo_app"
  db_host     = module.rds.endpoint
  db_name     = "aivo"
  
  tags = local.common_tags
}

module "acm" {
  source = "./modules/acm"
  
  name_prefix               = "aivo-prod"
  domain_name               = "aivo.edu"
  subject_alternative_names = ["*.aivo.edu", "api.aivo.edu"]
  route53_zone_id           = data.aws_route53_zone.main.zone_id
  
  alarm_sns_topic_arns = [aws_sns_topic.alerts.arn]
  
  tags = local.common_tags
}

module "security_monitoring" {
  source = "./modules/security-monitoring"
  
  name_prefix          = "aivo-prod"
  region               = var.region
  alerts_sns_topic_arn = aws_sns_topic.alerts.arn
  
  tags = local.common_tags
}
```
