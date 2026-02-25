# =============================================================================
# AIVO Cloudflare Global Load Balancer — Active-Passive Failover
# =============================================================================
# Health-check monitors per region with 30-second failover detection.
# Geo-steering routes US-East traffic to primary, US-West to secondary.
# On primary failure, ALL traffic fails over to secondary within 30s.
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.20"
    }
  }

  backend "s3" {
    bucket                      = "aivo-terraform"
    key                         = "cloudflare-glb/terraform.tfstate"
    region                      = "us-east-1"
    endpoint                    = "https://fsn1.your-objectstorage.com"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    force_path_style            = true
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# --------------------------------------------------------------------------
# Variables
# --------------------------------------------------------------------------
variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for aivolearning.com"
  type        = string
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "primary_origin_ip" {
  description = "Public IP of US-East (Ashburn) primary ingress"
  type        = string
}

variable "secondary_origin_ip" {
  description = "Public IP of US-West (Hillsboro) secondary ingress"
  type        = string
}

# --------------------------------------------------------------------------
# Health Check Monitor — API endpoint
# --------------------------------------------------------------------------
resource "cloudflare_load_balancer_monitor" "api_health" {
  account_id     = var.cloudflare_account_id
  type           = "https"
  description    = "AIVO API health check"
  method         = "GET"
  path           = "/health"
  port           = 443
  timeout        = 5
  retries        = 2
  interval       = 15
  expected_codes = "200"
  expected_body  = ""
  follow_redirects = false
  allow_insecure   = false

  header {
    header = "Host"
    values = ["api.aivolearning.com"]
  }
}

# --------------------------------------------------------------------------
# Health Check Monitor — Web app endpoint
# --------------------------------------------------------------------------
resource "cloudflare_load_balancer_monitor" "web_health" {
  account_id     = var.cloudflare_account_id
  type           = "https"
  description    = "AIVO Web app health check"
  method         = "GET"
  path           = "/"
  port           = 443
  timeout        = 5
  retries        = 2
  interval       = 15
  expected_codes = "200"

  header {
    header = "Host"
    values = ["app.aivolearning.com"]
  }
}

# --------------------------------------------------------------------------
# Origin Pools
# --------------------------------------------------------------------------
resource "cloudflare_load_balancer_pool" "us_east" {
  account_id         = var.cloudflare_account_id
  name               = "aivo-us-east-ashburn"
  description        = "Primary pool — US-East (Ashburn)"
  enabled            = true
  minimum_origins    = 1
  monitor            = cloudflare_load_balancer_monitor.api_health.id
  notification_email = "ops@aivolearning.com"
  check_regions      = ["ENAM"]

  origins {
    name    = "us-east-primary"
    address = var.primary_origin_ip
    enabled = true
    weight  = 1.0

    header {
      header = "Host"
      values = ["api.aivolearning.com"]
    }
  }
}

resource "cloudflare_load_balancer_pool" "us_west" {
  account_id         = var.cloudflare_account_id
  name               = "aivo-us-west-hillsboro"
  description        = "Secondary pool — US-West (Hillsboro)"
  enabled            = true
  minimum_origins    = 1
  monitor            = cloudflare_load_balancer_monitor.api_health.id
  notification_email = "ops@aivolearning.com"
  check_regions      = ["WNAM"]

  origins {
    name    = "us-west-secondary"
    address = var.secondary_origin_ip
    enabled = true
    weight  = 1.0

    header {
      header = "Host"
      values = ["api.aivolearning.com"]
    }
  }
}

# --------------------------------------------------------------------------
# Global Load Balancer — API (api.aivolearning.com)
# --------------------------------------------------------------------------
resource "cloudflare_load_balancer" "api" {
  zone_id          = var.cloudflare_zone_id
  name             = "api.aivolearning.com"
  description      = "AIVO API — Active-Passive failover with 30s detection"
  proxied          = true
  ttl              = 30
  steering_policy  = "failover"
  fallback_pool_id = cloudflare_load_balancer_pool.us_west.id
  default_pool_ids = [
    cloudflare_load_balancer_pool.us_east.id,
    cloudflare_load_balancer_pool.us_west.id,
  ]

  # Failover: primary → secondary within 30s
  # 15s check interval × 2 failures = 30s detection
  pop_pools {
    pop  = "IAD"  # Ashburn POP
    pool_ids = [
      cloudflare_load_balancer_pool.us_east.id,
      cloudflare_load_balancer_pool.us_west.id,
    ]
  }
  pop_pools {
    pop  = "PDX"  # Portland POP (nearest to Hillsboro)
    pool_ids = [
      cloudflare_load_balancer_pool.us_west.id,
      cloudflare_load_balancer_pool.us_east.id,
    ]
  }

  region_pools {
    region = "ENAM"
    pool_ids = [
      cloudflare_load_balancer_pool.us_east.id,
      cloudflare_load_balancer_pool.us_west.id,
    ]
  }
  region_pools {
    region = "WNAM"
    pool_ids = [
      cloudflare_load_balancer_pool.us_west.id,
      cloudflare_load_balancer_pool.us_east.id,
    ]
  }

  session_affinity       = "cookie"
  session_affinity_ttl   = 1800

  # Adaptive routing for better failover
  adaptive_routing {
    failover_across_pools = true
  }
}

# --------------------------------------------------------------------------
# Global Load Balancer — App (app.aivolearning.com)
# --------------------------------------------------------------------------
resource "cloudflare_load_balancer" "app" {
  zone_id          = var.cloudflare_zone_id
  name             = "app.aivolearning.com"
  description      = "AIVO Web App — Active-Passive failover"
  proxied          = true
  ttl              = 30
  steering_policy  = "failover"
  fallback_pool_id = cloudflare_load_balancer_pool.us_west.id
  default_pool_ids = [
    cloudflare_load_balancer_pool.us_east.id,
    cloudflare_load_balancer_pool.us_west.id,
  ]

  session_affinity     = "cookie"
  session_affinity_ttl = 1800

  adaptive_routing {
    failover_across_pools = true
  }
}

# --------------------------------------------------------------------------
# GLB for additional subdomains (teacher, parent, admin, etc.)
# --------------------------------------------------------------------------
locals {
  additional_subdomains = [
    "teacher",
    "parent",
    "admin",
    "district",
    "author",
    "creator",
    "marketing",
  ]
}

resource "cloudflare_load_balancer" "subdomains" {
  for_each = toset(local.additional_subdomains)

  zone_id          = var.cloudflare_zone_id
  name             = "${each.value}.aivolearning.com"
  description      = "AIVO ${title(each.value)} — Active-Passive failover"
  proxied          = true
  ttl              = 30
  steering_policy  = "failover"
  fallback_pool_id = cloudflare_load_balancer_pool.us_west.id
  default_pool_ids = [
    cloudflare_load_balancer_pool.us_east.id,
    cloudflare_load_balancer_pool.us_west.id,
  ]

  session_affinity     = "cookie"
  session_affinity_ttl = 1800

  adaptive_routing {
    failover_across_pools = true
  }
}

# --------------------------------------------------------------------------
# WAF Rules — FERPA Compliance (Geo-restriction)
# --------------------------------------------------------------------------
resource "cloudflare_ruleset" "ferpa_geo_restriction" {
  zone_id     = var.cloudflare_zone_id
  name        = "FERPA Geo-Restriction"
  description = "Block access from non-US/CA countries for FERPA compliance"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules {
    action      = "block"
    expression  = "(not ip.geoip.country in {\"US\" \"CA\"})"
    description = "Block non-US/CA traffic for FERPA student data compliance"
    enabled     = true
  }
}

# --------------------------------------------------------------------------
# Page Rules — Cache static assets at edge
# --------------------------------------------------------------------------
resource "cloudflare_page_rule" "static_cache" {
  zone_id  = var.cloudflare_zone_id
  target   = "*.aivolearning.com/static/*"
  priority = 1

  actions {
    cache_level       = "cache_everything"
    edge_cache_ttl    = 86400
    browser_cache_ttl = 3600
  }
}

resource "cloudflare_page_rule" "api_no_cache" {
  zone_id  = var.cloudflare_zone_id
  target   = "api.aivolearning.com/*"
  priority = 2

  actions {
    cache_level       = "bypass"
    disable_apps      = true
    disable_performance = true
  }
}

# --------------------------------------------------------------------------
# Outputs
# --------------------------------------------------------------------------
output "load_balancer_api_id" {
  description = "Cloudflare LB ID for API"
  value       = cloudflare_load_balancer.api.id
}

output "load_balancer_app_id" {
  description = "Cloudflare LB ID for Web App"
  value       = cloudflare_load_balancer.app.id
}

output "monitor_id" {
  description = "Health check monitor ID"
  value       = cloudflare_load_balancer_monitor.api_health.id
}

output "pool_ids" {
  description = "Origin pool IDs"
  value = {
    us_east = cloudflare_load_balancer_pool.us_east.id
    us_west = cloudflare_load_balancer_pool.us_west.id
  }
}

output "failover_detection_seconds" {
  description = "Maximum time to detect and failover"
  value       = "30s (15s interval × 2 retries)"
}
