# =============================================================================
# AIVO Platform — Hetzner Production Infrastructure (Terraform)
# =============================================================================
# Provisions and configures the 4-server Hetzner production cluster.
#
# Architecture:
#   Server 1  — Database (PostgreSQL 15 + Redis 7)
#   Server 2  — App Primary (K3s control plane, 18 TS services)
#   Server 3  — App Secondary (K3s agent, replicas, MinIO)
#   Server 4  — ML Node (20 Python AI/ML services)
#
# Usage:
#   cd infra/terraform
#   terraform init
#   terraform plan -var-file=production.tfvars
#   terraform apply -var-file=production.tfvars
# =============================================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.20"
    }
  }

  backend "s3" {
    # Hetzner-compatible S3 (or use Cloudflare R2 / external)
    bucket   = "aivo-terraform-state"
    key      = "production/terraform.tfstate"
    region   = "us-east-1"
    encrypt  = true
    # Configure endpoint for R2 or other S3-compatible storage
    # endpoint = "https://<account>.r2.cloudflarestorage.com"
  }
}

# =============================================================================
# PROVIDERS
# =============================================================================

provider "hcloud" {
  token = var.hetzner_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# =============================================================================
# NETWORKING — vSwitch Private VLAN
# =============================================================================

resource "hcloud_network" "aivo_private" {
  name     = "aivo-private"
  ip_range = "10.0.0.0/16"

  labels = {
    environment = "production"
    project     = "aivo"
  }
}

resource "hcloud_network_subnet" "aivo_subnet" {
  network_id   = hcloud_network.aivo_private.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "10.0.0.0/24"
}

# =============================================================================
# FIREWALL RULES
# =============================================================================

resource "hcloud_firewall" "db_firewall" {
  name = "aivo-db-firewall"

  # SSH from management IPs only
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.management_ips
  }

  # PostgreSQL from private network only
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "5432"
    source_ips = ["10.0.0.0/24"]
  }

  # Redis from private network only
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "6379"
    source_ips = ["10.0.0.0/24"]
  }

  # PgBouncer from private network
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "6432"
    source_ips = ["10.0.0.0/24"]
  }

  labels = {
    role = "database"
  }
}

resource "hcloud_firewall" "app_firewall" {
  name = "aivo-app-firewall"

  # SSH from management IPs
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.management_ips
  }

  # HTTP/HTTPS from Cloudflare only
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = var.cloudflare_ips
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = var.cloudflare_ips
  }

  # K3s API from private network
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "6443"
    source_ips = ["10.0.0.0/24"]
  }

  # K3s internal from private network
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "10250"
    source_ips = ["10.0.0.0/24"]
  }

  # Flannel VXLAN
  rule {
    direction  = "in"
    protocol   = "udp"
    port       = "8472"
    source_ips = ["10.0.0.0/24"]
  }

  labels = {
    role = "application"
  }
}

resource "hcloud_firewall" "ml_firewall" {
  name = "aivo-ml-firewall"

  # SSH from management IPs
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.management_ips
  }

  # K3s from private network
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "10250"
    source_ips = ["10.0.0.0/24"]
  }

  # Flannel VXLAN
  rule {
    direction  = "in"
    protocol   = "udp"
    port       = "8472"
    source_ips = ["10.0.0.0/24"]
  }

  labels = {
    role = "ml"
  }
}

# =============================================================================
# SSH KEY
# =============================================================================

resource "hcloud_ssh_key" "deploy" {
  name       = "aivo-deploy"
  public_key = var.ssh_public_key
}

# =============================================================================
# SERVERS — Hetzner Dedicated (referenced by ID after manual order)
# =============================================================================
# NOTE: Hetzner dedicated servers must be ordered via Robot API or console.
# These data sources reference existing servers by name after provisioning.
# For cloud servers (development/staging), use hcloud_server resources instead.
# =============================================================================

# --- Server 1: Database Node ---
resource "hcloud_server" "db" {
  count       = var.use_cloud_servers ? 1 : 0
  name        = "aivo-db1"
  image       = "ubuntu-24.04"
  server_type = "cx41" # Closest cloud equivalent for dev/staging
  location    = "hel1"
  ssh_keys    = [hcloud_ssh_key.deploy.id]
  firewall_ids = [hcloud_firewall.db_firewall.id]

  labels = {
    role        = "database"
    environment = "production"
    project     = "aivo"
  }

  user_data = templatefile("${path.module}/cloud-init/db-node.yaml", {
    pg_version          = var.pg_version
    redis_version       = var.redis_version
    pg_max_connections   = var.pg_max_connections
    pg_shared_buffers    = var.pg_shared_buffers
    pg_effective_cache   = var.pg_effective_cache_size
    backup_s3_bucket    = var.backup_s3_bucket
    backup_encryption_key = var.backup_encryption_key
  })
}

# --- Server 2: App Primary (K3s Server) ---
resource "hcloud_server" "app_primary" {
  count       = var.use_cloud_servers ? 1 : 0
  name        = "aivo-app1"
  image       = "ubuntu-24.04"
  server_type = "cx41"
  location    = "hel1"
  ssh_keys    = [hcloud_ssh_key.deploy.id]
  firewall_ids = [hcloud_firewall.app_firewall.id]

  labels = {
    role        = "app-primary"
    environment = "production"
    project     = "aivo"
  }

  user_data = templatefile("${path.module}/cloud-init/app-node.yaml", {
    k3s_role    = "server"
    k3s_token   = var.k3s_token
    k3s_version = var.k3s_version
  })
}

# --- Server 3: App Secondary (K3s Agent) ---
resource "hcloud_server" "app_secondary" {
  count       = var.use_cloud_servers ? 1 : 0
  name        = "aivo-app2"
  image       = "ubuntu-24.04"
  server_type = "cx31"
  location    = "hel1"
  ssh_keys    = [hcloud_ssh_key.deploy.id]
  firewall_ids = [hcloud_firewall.app_firewall.id]

  labels = {
    role        = "app-secondary"
    environment = "production"
    project     = "aivo"
  }

  user_data = templatefile("${path.module}/cloud-init/app-node.yaml", {
    k3s_role    = "agent"
    k3s_token   = var.k3s_token
    k3s_version = var.k3s_version
  })
}

# --- Server 4: ML Node (K3s Agent) ---
resource "hcloud_server" "ml_node" {
  count       = var.use_cloud_servers ? 1 : 0
  name        = "aivo-ml1"
  image       = "ubuntu-24.04"
  server_type = "cx51"
  location    = "hel1"
  ssh_keys    = [hcloud_ssh_key.deploy.id]
  firewall_ids = [hcloud_firewall.ml_firewall.id]

  labels = {
    role        = "ml"
    environment = "production"
    project     = "aivo"
  }

  user_data = templatefile("${path.module}/cloud-init/ml-node.yaml", {
    k3s_token   = var.k3s_token
    k3s_version = var.k3s_version
    k3s_server  = "https://10.0.0.2:6443"
  })
}

# =============================================================================
# NETWORK ATTACHMENTS
# =============================================================================

resource "hcloud_server_network" "db_network" {
  count     = var.use_cloud_servers ? 1 : 0
  server_id = hcloud_server.db[0].id
  network_id = hcloud_network.aivo_private.id
  ip         = "10.0.0.1"
}

resource "hcloud_server_network" "app1_network" {
  count     = var.use_cloud_servers ? 1 : 0
  server_id = hcloud_server.app_primary[0].id
  network_id = hcloud_network.aivo_private.id
  ip         = "10.0.0.2"
}

resource "hcloud_server_network" "app2_network" {
  count     = var.use_cloud_servers ? 1 : 0
  server_id = hcloud_server.app_secondary[0].id
  network_id = hcloud_network.aivo_private.id
  ip         = "10.0.0.3"
}

resource "hcloud_server_network" "ml_network" {
  count     = var.use_cloud_servers ? 1 : 0
  server_id = hcloud_server.ml_node[0].id
  network_id = hcloud_network.aivo_private.id
  ip         = "10.0.0.4"
}

# =============================================================================
# CLOUDFLARE DNS — Production Domain
# =============================================================================

resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  content = var.app_primary_public_ip
  type    = "A"
  proxied = true
  ttl     = 1

  comment = "AIVO API Gateway — proxied through Cloudflare WAF"
}

resource "cloudflare_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = "app"
  content = var.app_primary_public_ip
  type    = "A"
  proxied = true
  ttl     = 1

  comment = "AIVO Web Application — proxied through Cloudflare CDN"
}

resource "cloudflare_record" "grafana" {
  zone_id = var.cloudflare_zone_id
  name    = "grafana"
  content = var.app_primary_public_ip
  type    = "A"
  proxied = true
  ttl     = 1

  comment = "Grafana monitoring dashboard"
}

# =============================================================================
# CLOUDFLARE WAF RULES — FERPA Compliance
# =============================================================================

resource "cloudflare_ruleset" "waf" {
  zone_id     = var.cloudflare_zone_id
  name        = "AIVO WAF Rules"
  description = "Production WAF rules for FERPA-compliant education platform"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules {
    action      = "block"
    expression  = "(cf.threat_score gt 30)"
    description = "Block high-threat traffic"
  }

  rules {
    action      = "managed_challenge"
    expression  = "(cf.threat_score gt 14)"
    description = "Challenge medium-threat traffic"
  }

  rules {
    action      = "block"
    expression  = "(http.request.uri.path contains \"..\" or http.request.uri.path contains \"%2e%2e\")"
    description = "Block path traversal attempts"
  }

  rules {
    action      = "block"
    expression  = "(not ip.geoip.country in {\"US\" \"CA\"} and not cf.edge.server_ip in $cloudflare_ips)"
    description = "Restrict to US/Canada for FERPA compliance (adjust per district)"
  }
}

# =============================================================================
# OUTPUTS
# =============================================================================

output "private_network_id" {
  value = hcloud_network.aivo_private.id
}

output "db_private_ip" {
  value = "10.0.0.1"
}

output "app_primary_private_ip" {
  value = "10.0.0.2"
}

output "app_secondary_private_ip" {
  value = "10.0.0.3"
}

output "ml_node_private_ip" {
  value = "10.0.0.4"
}

output "dns_records" {
  value = {
    api     = cloudflare_record.api.hostname
    app     = cloudflare_record.app.hostname
    grafana = cloudflare_record.grafana.hostname
  }
}
