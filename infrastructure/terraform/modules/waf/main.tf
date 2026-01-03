# ==============================================================================
# AIVO Platform - WAF Module
# ==============================================================================

variable "name" {
  description = "Name for the WAF resources"
  type        = string
}

variable "description" {
  description = "Description for the WAF"
  type        = string
  default     = "WAF Web ACL"
}

variable "scope" {
  description = "WAF scope (REGIONAL or CLOUDFRONT)"
  type        = string
  default     = "REGIONAL"
}

variable "rules" {
  description = "WAF rules configuration"
  type = list(object({
    name       = string
    priority   = number
    rate_limit = optional(number)
  }))
  default = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# ==============================================================================
# RESOURCES
# ==============================================================================

resource "aws_wafv2_web_acl" "this" {
  name        = var.name
  description = var.description
  scope       = var.scope

  default_action {
    allow {}
  }

  # AWS Managed Rules - Common Rule Set
  dynamic "rule" {
    for_each = [for r in var.rules : r if r.name == "AWSManagedRulesCommonRuleSet"]
    content {
      name     = "AWSManagedRulesCommonRuleSet"
      priority = rule.value.priority

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesCommonRuleSet"
          vendor_name = "AWS"

          rule_action_override {
            action_to_use {
              count {}
            }
            name = "SizeRestrictions_BODY"
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "AWSManagedRulesCommonRuleSet"
        sampled_requests_enabled   = true
      }
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  dynamic "rule" {
    for_each = [for r in var.rules : r if r.name == "AWSManagedRulesKnownBadInputsRuleSet"]
    content {
      name     = "AWSManagedRulesKnownBadInputsRuleSet"
      priority = rule.value.priority

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesKnownBadInputsRuleSet"
          vendor_name = "AWS"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "AWSManagedRulesKnownBadInputsRuleSet"
        sampled_requests_enabled   = true
      }
    }
  }

  # AWS Managed Rules - SQL Injection
  dynamic "rule" {
    for_each = [for r in var.rules : r if r.name == "AWSManagedRulesSQLiRuleSet"]
    content {
      name     = "AWSManagedRulesSQLiRuleSet"
      priority = rule.value.priority

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesSQLiRuleSet"
          vendor_name = "AWS"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "AWSManagedRulesSQLiRuleSet"
        sampled_requests_enabled   = true
      }
    }
  }

  # AWS Managed Rules - Linux Rule Set
  dynamic "rule" {
    for_each = [for r in var.rules : r if r.name == "AWSManagedRulesLinuxRuleSet"]
    content {
      name     = "AWSManagedRulesLinuxRuleSet"
      priority = rule.value.priority

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesLinuxRuleSet"
          vendor_name = "AWS"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "AWSManagedRulesLinuxRuleSet"
        sampled_requests_enabled   = true
      }
    }
  }

  # Rate Limiting Rule
  dynamic "rule" {
    for_each = [for r in var.rules : r if r.name == "RateLimit"]
    content {
      name     = "RateLimitRule"
      priority = rule.value.priority

      action {
        block {}
      }

      statement {
        rate_based_statement {
          limit              = rule.value.rate_limit
          aggregate_key_type = "IP"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "RateLimitRule"
        sampled_requests_enabled   = true
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = var.name
    sampled_requests_enabled   = true
  }

  tags = var.tags
}

# ==============================================================================
# LOGGING
# ==============================================================================

resource "aws_cloudwatch_log_group" "waf" {
  name              = "aws-waf-logs-${var.name}"
  retention_in_days = 30

  tags = var.tags
}

resource "aws_wafv2_web_acl_logging_configuration" "this" {
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
  resource_arn            = aws_wafv2_web_acl.this.arn

  logging_filter {
    default_behavior = "KEEP"

    filter {
      behavior = "DROP"
      condition {
        action_condition {
          action = "ALLOW"
        }
      }
      requirement = "MEETS_ALL"
    }
  }
}

# ==============================================================================
# OUTPUTS
# ==============================================================================

output "web_acl_id" {
  description = "WAF Web ACL ID"
  value       = aws_wafv2_web_acl.this.id
}

output "web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = aws_wafv2_web_acl.this.arn
}

output "web_acl_capacity" {
  description = "WAF Web ACL capacity units used"
  value       = aws_wafv2_web_acl.this.capacity
}
