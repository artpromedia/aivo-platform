# =============================================================================
# AIVO Multi-Region Infrastructure — Active-Passive (Hetzner Cloud)
# =============================================================================
# Primary:   US-East  (ash — Ashburn, VA)
# Secondary: US-West  (hil — Hillsboro, OR)
#
# Architecture per region:
#   3 × CX31  control-plane nodes (K3s server)
#   3-6 × CX41 worker nodes        (K3s agent, auto-scaled via HPA)
#   1 × CX41  database node        (PostgreSQL primary/standby)
#
# Cross-region:
#   - PostgreSQL streaming replication (async, <1s lag target)
#   - NATS super-cluster gateway
#   - Redis Sentinel for session failover
#   - Hetzner Object Storage for shared assets
#   - Cloudflare Global Load Balancer (30s failover)
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.20"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket                      = "aivo-terraform"
    key                         = "multi-region/terraform.tfstate"
    region                      = "us-east-1"
    endpoint                    = "https://fsn1.your-objectstorage.com"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    force_path_style            = true
  }
}

# --------------------------------------------------------------------------
# Providers
# --------------------------------------------------------------------------
provider "hcloud" {
  token = var.hetzner_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# --------------------------------------------------------------------------
# Locals — Region definitions
# --------------------------------------------------------------------------
locals {
  regions = {
    us_east = {
      name            = "us-east"
      location        = "ash"
      network_zone    = "us-east"
      network_cidr    = "10.10.0.0/16"
      subnet_cidr     = "10.10.0.0/24"
      role            = "primary"
      cp_count        = var.control_plane_count
      worker_count    = var.worker_count_primary
      db_ip           = "10.10.0.10"
      cp_ip_offset    = 20  # 10.10.0.20, .21, .22
      worker_ip_offset = 30 # 10.10.0.30, .31, ...
    }
    us_west = {
      name            = "us-west"
      location        = "hil"
      network_zone    = "us-west"
      network_cidr    = "10.20.0.0/16"
      subnet_cidr     = "10.20.0.0/24"
      role            = "secondary"
      cp_count        = var.control_plane_count
      worker_count    = var.worker_count_secondary
      db_ip           = "10.20.0.10"
      cp_ip_offset    = 20
      worker_ip_offset = 30
    }
  }

  common_labels = {
    managed_by  = "terraform"
    project     = "aivo"
    environment = "production"
  }
}

# ==========================================================================
# SSH Keys
# ==========================================================================
resource "hcloud_ssh_key" "deploy" {
  name       = "aivo-deploy-key"
  public_key = var.ssh_public_key
  labels     = local.common_labels
}

# ==========================================================================
# Networks — One private network per region
# ==========================================================================
resource "hcloud_network" "region" {
  for_each = local.regions

  name     = "aivo-${each.value.name}"
  ip_range = each.value.network_cidr
  labels   = merge(local.common_labels, { region = each.value.name })
}

resource "hcloud_network_subnet" "region" {
  for_each = local.regions

  network_id   = hcloud_network.region[each.key].id
  type         = "cloud"
  network_zone = each.value.network_zone
  ip_range     = each.value.subnet_cidr
}

# ==========================================================================
# Firewalls
# ==========================================================================

# --- Control-plane firewall ---
resource "hcloud_firewall" "control_plane" {
  for_each = local.regions
  name     = "aivo-cp-${each.value.name}"
  labels   = merge(local.common_labels, { region = each.value.name, role = "control-plane" })

  # SSH from management IPs only
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.management_ips
  }

  # K3s API server
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "6443"
    source_ips = var.management_ips
  }

  # Kubelet
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "10250"
    source_ips = [each.value.subnet_cidr]
  }

  # Flannel VXLAN
  rule {
    direction  = "in"
    protocol   = "udp"
    port       = "8472"
    source_ips = [each.value.subnet_cidr]
  }

  # etcd (HA control plane)
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "2379-2380"
    source_ips = [each.value.subnet_cidr]
  }

  # NodePort range (Cloudflare ingress)
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "30000-32767"
    source_ips = var.cloudflare_ips
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

  # NATS cluster route (cross-region)
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "6222"
    source_ips = ["0.0.0.0/0"]  # Peer region public IPs; tighten in production
  }

  # NATS gateway (cross-region)
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "7222"
    source_ips = ["0.0.0.0/0"]
  }
}

# --- Worker firewall ---
resource "hcloud_firewall" "worker" {
  for_each = local.regions
  name     = "aivo-worker-${each.value.name}"
  labels   = merge(local.common_labels, { region = each.value.name, role = "worker" })

  # SSH from management IPs
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.management_ips
  }

  # Kubelet
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "10250"
    source_ips = [each.value.subnet_cidr]
  }

  # Flannel VXLAN
  rule {
    direction  = "in"
    protocol   = "udp"
    port       = "8472"
    source_ips = [each.value.subnet_cidr]
  }

  # NodePort range
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "30000-32767"
    source_ips = var.cloudflare_ips
  }

  # HTTP/HTTPS from Cloudflare
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
}

# --- Database firewall ---
resource "hcloud_firewall" "database" {
  for_each = local.regions
  name     = "aivo-db-${each.value.name}"
  labels   = merge(local.common_labels, { region = each.value.name, role = "database" })

  # SSH from management IPs
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.management_ips
  }

  # PostgreSQL from cluster subnet
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "5432"
    source_ips = [each.value.subnet_cidr]
  }

  # PgBouncer from cluster subnet
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "6432"
    source_ips = [each.value.subnet_cidr]
  }

  # PostgreSQL streaming replication (cross-region)
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "5432"
    source_ips = ["0.0.0.0/0"]  # Tighten to peer region DB public IP
  }

  # Redis from cluster subnet
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "6379"
    source_ips = [each.value.subnet_cidr]
  }

  # Redis Sentinel
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "26379"
    source_ips = [each.value.subnet_cidr]
  }
}

# ==========================================================================
# Database Servers — One per region
# ==========================================================================
resource "hcloud_server" "database" {
  for_each = local.regions

  name        = "aivo-db-${each.value.name}"
  server_type = var.db_server_type
  location    = each.value.location
  image       = "ubuntu-22.04"
  ssh_keys    = [hcloud_ssh_key.deploy.id]
  labels      = merge(local.common_labels, { region = each.value.name, role = "database" })

  firewall_ids = [hcloud_firewall.database[each.key].id]

  user_data = templatefile("${path.module}/cloud-init/db-node.yaml", {
    region            = each.value.name
    role              = each.value.role
    pg_version        = var.pg_version
    pg_max_conn       = var.pg_max_connections
    pg_shared_buffers = var.pg_shared_buffers
    pg_cache_size     = var.pg_effective_cache_size
    redis_version     = var.redis_version
    peer_db_ip        = each.value.role == "primary" ? local.regions.us_west.db_ip : local.regions.us_east.db_ip
    replication_password = var.pg_replication_password
  })
}

resource "hcloud_server_network" "database" {
  for_each = local.regions

  server_id  = hcloud_server.database[each.key].id
  network_id = hcloud_network.region[each.key].id
  ip         = each.value.db_ip

  depends_on = [hcloud_network_subnet.region]
}

# ==========================================================================
# Control Plane Servers — 3 per region (HA etcd)
# ==========================================================================
resource "hcloud_server" "control_plane" {
  for_each = merge([
    for region_key, region in local.regions : {
      for i in range(region.cp_count) :
      "${region_key}_cp_${i}" => {
        region_key = region_key
        region     = region
        index      = i
      }
    }
  ]...)

  name        = "aivo-cp-${each.value.region.name}-${each.value.index}"
  server_type = var.cp_server_type
  location    = each.value.region.location
  image       = "ubuntu-22.04"
  ssh_keys    = [hcloud_ssh_key.deploy.id]
  labels = merge(local.common_labels, {
    region = each.value.region.name
    role   = "control-plane"
    index  = tostring(each.value.index)
  })

  firewall_ids = [hcloud_firewall.control_plane[each.value.region_key].id]

  user_data = templatefile("${path.module}/cloud-init/cp-node.yaml", {
    region         = each.value.region.name
    index          = each.value.index
    k3s_version    = var.k3s_version
    k3s_token      = var.k3s_token
    is_init_server = each.value.index == 0
    cluster_init_ip = cidrhost(each.value.region.subnet_cidr, each.value.region.cp_ip_offset)
  })
}

resource "hcloud_server_network" "control_plane" {
  for_each = merge([
    for region_key, region in local.regions : {
      for i in range(region.cp_count) :
      "${region_key}_cp_${i}" => {
        region_key = region_key
        region     = region
        index      = i
      }
    }
  ]...)

  server_id  = hcloud_server.control_plane[each.key].id
  network_id = hcloud_network.region[each.value.region_key].id
  ip         = cidrhost(each.value.region.subnet_cidr, each.value.region.cp_ip_offset + each.value.index)

  depends_on = [hcloud_network_subnet.region]
}

# ==========================================================================
# Worker Servers — 3-6 per region (scaled via HPA at K8s level)
# ==========================================================================
resource "hcloud_server" "worker" {
  for_each = merge([
    for region_key, region in local.regions : {
      for i in range(region.worker_count) :
      "${region_key}_worker_${i}" => {
        region_key = region_key
        region     = region
        index      = i
      }
    }
  ]...)

  name        = "aivo-worker-${each.value.region.name}-${each.value.index}"
  server_type = var.worker_server_type
  location    = each.value.region.location
  image       = "ubuntu-22.04"
  ssh_keys    = [hcloud_ssh_key.deploy.id]
  labels = merge(local.common_labels, {
    region = each.value.region.name
    role   = "worker"
    index  = tostring(each.value.index)
  })

  firewall_ids = [hcloud_firewall.worker[each.value.region_key].id]

  user_data = templatefile("${path.module}/cloud-init/worker-node.yaml", {
    region      = each.value.region.name
    index       = each.value.index
    k3s_version = var.k3s_version
    k3s_token   = var.k3s_token
    k3s_url     = "https://${cidrhost(each.value.region.subnet_cidr, each.value.region.cp_ip_offset)}:6443"
  })
}

resource "hcloud_server_network" "worker" {
  for_each = merge([
    for region_key, region in local.regions : {
      for i in range(region.worker_count) :
      "${region_key}_worker_${i}" => {
        region_key = region_key
        region     = region
        index      = i
      }
    }
  ]...)

  server_id  = hcloud_server.worker[each.key].id
  network_id = hcloud_network.region[each.value.region_key].id
  ip         = cidrhost(each.value.region.subnet_cidr, each.value.region.worker_ip_offset + each.value.index)

  depends_on = [hcloud_network_subnet.region]
}

# ==========================================================================
# Hetzner Object Storage — Shared assets bucket
# ==========================================================================
# Note: Hetzner Object Storage is managed via the S3-compatible API.
# The bucket is created once and accessible from both regions.

# ==========================================================================
# Outputs
# ==========================================================================
output "region_networks" {
  description = "Network IDs per region"
  value = {
    for k, v in hcloud_network.region : k => v.id
  }
}

output "database_ips" {
  description = "Database server IPs per region"
  value = {
    for k, v in hcloud_server.database : k => {
      public_ipv4  = v.ipv4_address
      private_ip   = local.regions[k].db_ip
    }
  }
}

output "control_plane_ips" {
  description = "Control plane server IPs"
  value = {
    for k, v in hcloud_server.control_plane : k => {
      public_ipv4 = v.ipv4_address
      private_ip  = hcloud_server_network.control_plane[k].ip
    }
  }
}

output "worker_ips" {
  description = "Worker server IPs"
  value = {
    for k, v in hcloud_server.worker : k => {
      public_ipv4 = v.ipv4_address
      private_ip  = hcloud_server_network.worker[k].ip
    }
  }
}

output "primary_api_endpoint" {
  description = "Primary K3s API endpoint"
  value       = "https://${hcloud_server.control_plane["us_east_cp_0"].ipv4_address}:6443"
}

output "secondary_api_endpoint" {
  description = "Secondary K3s API endpoint"
  value       = "https://${hcloud_server.control_plane["us_west_cp_0"].ipv4_address}:6443"
}
