# =============================================================================
# AIVO Platform - CDN Module
# =============================================================================
# Configures Cloud CDN for static assets with global load balancing
# =============================================================================

# -----------------------------------------------------------------------------
# Reserve Global IP Address
# -----------------------------------------------------------------------------

resource "google_compute_global_address" "cdn" {
  name         = "aivo-cdn-ip-${var.environment}"
  address_type = "EXTERNAL"
  ip_version   = "IPV4"
}

# -----------------------------------------------------------------------------
# SSL Certificate
# -----------------------------------------------------------------------------

resource "google_compute_managed_ssl_certificate" "cdn" {
  name = "aivo-cdn-cert-${var.environment}"

  managed {
    domains = var.cdn_domains
  }
}

# -----------------------------------------------------------------------------
# Backend Bucket with CDN
# -----------------------------------------------------------------------------

resource "google_compute_backend_bucket" "static_assets" {
  name        = "aivo-static-assets-${var.environment}"
  description = "Backend bucket for AIVO static assets"
  bucket_name = var.static_assets_bucket
  enable_cdn  = true

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    default_ttl       = var.default_cache_ttl
    max_ttl           = var.max_cache_ttl
    client_ttl        = var.client_cache_ttl
    negative_caching  = true
    serve_while_stale = 86400

    cache_key_policy {
      include_http_headers = []
      query_string_whitelist = ["v", "hash"]
    }
  }

  custom_response_headers = [
    "X-Cache-Status: {cdn_cache_status}",
    "X-Cache-ID: {cdn_cache_id}",
    "Strict-Transport-Security: max-age=31536000; includeSubDomains",
  ]
}

resource "google_compute_backend_bucket" "content_assets" {
  name        = "aivo-content-assets-${var.environment}"
  description = "Backend bucket for AIVO educational content"
  bucket_name = var.content_assets_bucket
  enable_cdn  = true

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    default_ttl       = 86400  # 1 day - content changes less frequently
    max_ttl           = 604800 # 7 days
    client_ttl        = 86400
    negative_caching  = true
    serve_while_stale = 86400

    cache_key_policy {
      include_http_headers = []
      query_string_whitelist = ["v", "hash"]
    }
  }

  custom_response_headers = [
    "X-Cache-Status: {cdn_cache_status}",
    "Strict-Transport-Security: max-age=31536000; includeSubDomains",
  ]
}

# -----------------------------------------------------------------------------
# URL Map
# -----------------------------------------------------------------------------

resource "google_compute_url_map" "cdn" {
  name            = "aivo-cdn-url-map-${var.environment}"
  description     = "URL map for AIVO CDN"
  default_service = google_compute_backend_bucket.static_assets.self_link

  host_rule {
    hosts        = var.cdn_domains
    path_matcher = "assets"
  }

  path_matcher {
    name            = "assets"
    default_service = google_compute_backend_bucket.static_assets.self_link

    # Content assets path
    path_rule {
      paths   = ["/content/*", "/content"]
      service = google_compute_backend_bucket.content_assets.self_link
    }

    # Educational materials
    path_rule {
      paths   = ["/lessons/*", "/courses/*", "/activities/*"]
      service = google_compute_backend_bucket.content_assets.self_link
    }

    # Static assets (default)
    path_rule {
      paths   = ["/static/*", "/assets/*", "/images/*", "/fonts/*", "/scripts/*", "/styles/*"]
      service = google_compute_backend_bucket.static_assets.self_link
    }
  }
}

# HTTP to HTTPS redirect
resource "google_compute_url_map" "cdn_http_redirect" {
  name = "aivo-cdn-http-redirect-${var.environment}"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

# -----------------------------------------------------------------------------
# HTTPS Target Proxy
# -----------------------------------------------------------------------------

resource "google_compute_target_https_proxy" "cdn" {
  name             = "aivo-cdn-https-proxy-${var.environment}"
  url_map          = google_compute_url_map.cdn.self_link
  ssl_certificates = [google_compute_managed_ssl_certificate.cdn.self_link]
}

resource "google_compute_target_http_proxy" "cdn_redirect" {
  name    = "aivo-cdn-http-redirect-proxy-${var.environment}"
  url_map = google_compute_url_map.cdn_http_redirect.self_link
}

# -----------------------------------------------------------------------------
# Global Forwarding Rules
# -----------------------------------------------------------------------------

resource "google_compute_global_forwarding_rule" "cdn_https" {
  name       = "aivo-cdn-https-${var.environment}"
  target     = google_compute_target_https_proxy.cdn.self_link
  port_range = "443"
  ip_address = google_compute_global_address.cdn.address

  load_balancing_scheme = "EXTERNAL"
}

resource "google_compute_global_forwarding_rule" "cdn_http_redirect" {
  name       = "aivo-cdn-http-redirect-${var.environment}"
  target     = google_compute_target_http_proxy.cdn_redirect.self_link
  port_range = "80"
  ip_address = google_compute_global_address.cdn.address

  load_balancing_scheme = "EXTERNAL"
}

# -----------------------------------------------------------------------------
# Cloud Armor Security Policy (Optional - Production Only)
# -----------------------------------------------------------------------------

resource "google_compute_security_policy" "cdn" {
  count = var.enable_cloud_armor ? 1 : 0

  name = "aivo-cdn-security-policy-${var.environment}"

  # Allow most traffic by default
  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }

  # Rate limiting
  rule {
    action   = "rate_based_ban"
    priority = 1000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Rate limiting rule"
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      rate_limit_threshold {
        count        = 1000
        interval_sec = 60
      }
      ban_duration_sec = 600
    }
  }

  # Block known bad IPs (placeholder - populate from threat intel)
  rule {
    action   = "deny(403)"
    priority = 100
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = var.blocked_ip_ranges
      }
    }
    description = "Block known malicious IPs"
  }

  # WAF rules (Cross-site scripting)
  rule {
    action   = "deny(403)"
    priority = 200
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-v33-stable')"
      }
    }
    description = "XSS protection"
  }
}

# -----------------------------------------------------------------------------
# Invalidation (null resource for cache invalidation)
# -----------------------------------------------------------------------------

resource "null_resource" "cdn_invalidation" {
  count = var.invalidate_cache ? 1 : 0

  triggers = {
    timestamp = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOF
      gcloud compute url-maps invalidate-cdn-cache ${google_compute_url_map.cdn.name} \
        --path="/*" \
        --project=${var.project_id} \
        --async
    EOF
  }

  depends_on = [google_compute_url_map.cdn]
}
