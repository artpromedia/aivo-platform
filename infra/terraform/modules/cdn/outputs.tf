# =============================================================================
# AIVO Platform - CDN Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# IP Address
# -----------------------------------------------------------------------------

output "cdn_ip_address" {
  description = "CDN global IP address"
  value       = google_compute_global_address.cdn.address
}

output "cdn_ip_name" {
  description = "CDN IP address resource name"
  value       = google_compute_global_address.cdn.name
}

# -----------------------------------------------------------------------------
# SSL Certificate
# -----------------------------------------------------------------------------

output "ssl_certificate_id" {
  description = "Managed SSL certificate ID"
  value       = google_compute_managed_ssl_certificate.cdn.id
}

output "ssl_certificate_domains" {
  description = "Domains covered by SSL certificate"
  value       = google_compute_managed_ssl_certificate.cdn.managed[0].domains
}

# -----------------------------------------------------------------------------
# Backend Buckets
# -----------------------------------------------------------------------------

output "static_assets_backend_bucket_id" {
  description = "Static assets backend bucket ID"
  value       = google_compute_backend_bucket.static_assets.id
}

output "content_assets_backend_bucket_id" {
  description = "Content assets backend bucket ID"
  value       = google_compute_backend_bucket.content_assets.id
}

# -----------------------------------------------------------------------------
# URL Map
# -----------------------------------------------------------------------------

output "url_map_id" {
  description = "CDN URL map ID"
  value       = google_compute_url_map.cdn.id
}

output "url_map_self_link" {
  description = "CDN URL map self link"
  value       = google_compute_url_map.cdn.self_link
}

# -----------------------------------------------------------------------------
# Forwarding Rules
# -----------------------------------------------------------------------------

output "https_forwarding_rule_id" {
  description = "HTTPS forwarding rule ID"
  value       = google_compute_global_forwarding_rule.cdn_https.id
}

output "http_redirect_forwarding_rule_id" {
  description = "HTTP redirect forwarding rule ID"
  value       = google_compute_global_forwarding_rule.cdn_http_redirect.id
}

# -----------------------------------------------------------------------------
# Security Policy
# -----------------------------------------------------------------------------

output "security_policy_id" {
  description = "Cloud Armor security policy ID (if enabled)"
  value       = var.enable_cloud_armor ? google_compute_security_policy.cdn[0].id : null
}

# -----------------------------------------------------------------------------
# CDN URLs
# -----------------------------------------------------------------------------

output "cdn_url" {
  description = "Primary CDN URL"
  value       = "https://${var.cdn_domains[0]}"
}

output "static_assets_cdn_url" {
  description = "Static assets CDN URL"
  value       = "https://${var.cdn_domains[0]}/static"
}

output "content_cdn_url" {
  description = "Content CDN URL"
  value       = "https://${var.cdn_domains[0]}/content"
}

# -----------------------------------------------------------------------------
# DNS Configuration Help
# -----------------------------------------------------------------------------

output "dns_configuration" {
  description = "DNS records to configure"
  value = {
    for domain in var.cdn_domains : domain => {
      type  = "A"
      value = google_compute_global_address.cdn.address
    }
  }
}
