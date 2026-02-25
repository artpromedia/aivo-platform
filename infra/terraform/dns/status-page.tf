# ============================================================================
# Cloudflare DNS — status.aivolearning.com
# ============================================================================
# Points status.aivolearning.com to the cluster ingress.
# This is separate from main platform DNS so the status page remains
# accessible even during primary domain issues.
#
# Requires:
#   - cloudflare_zone_id for aivolearning.com
#   - Cluster ingress IP or CNAME target
# ============================================================================

variable "status_page_ingress_ip" {
  description = "Cluster ingress IP for the status page"
  type        = string
  default     = ""
}

variable "status_page_ingress_cname" {
  description = "Cluster ingress CNAME for the status page (if using load balancer)"
  type        = string
  default     = ""
}

# A record — when using a static IP
resource "cloudflare_record" "status_page_a" {
  count   = var.status_page_ingress_ip != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "status"
  content = var.status_page_ingress_ip
  type    = "A"
  ttl     = 1 # Auto (proxied)
  proxied = true

  comment = "AIVO Public Status Page — independent from main platform"
}

# CNAME record — when using a cloud LB hostname
resource "cloudflare_record" "status_page_cname" {
  count   = var.status_page_ingress_cname != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "status"
  content = var.status_page_ingress_cname
  type    = "CNAME"
  ttl     = 1 # Auto (proxied)
  proxied = true

  comment = "AIVO Public Status Page — independent from main platform"
}

# Page rule: cache static assets aggressively, bypass for /api/*
resource "cloudflare_page_rule" "status_page_api_bypass" {
  zone_id  = var.cloudflare_zone_id
  target   = "status.aivolearning.com/api/*"
  priority = 10

  actions {
    cache_level       = "bypass"
    disable_apps      = true
    disable_railgun   = true
    browser_ttl       = 0
  }
}

resource "cloudflare_page_rule" "status_page_cache" {
  zone_id  = var.cloudflare_zone_id
  target   = "status.aivolearning.com/*"
  priority = 20

  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 30  # 30 seconds — matches ISR revalidation
    browser_ttl    = 15
  }
}
