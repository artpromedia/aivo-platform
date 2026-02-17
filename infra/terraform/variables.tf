# =============================================================================
# AIVO Platform — Terraform Variables
# =============================================================================

# --- Hetzner Cloud ---
variable "hetzner_api_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
}

variable "management_ips" {
  description = "IP addresses allowed to SSH into servers"
  type        = list(string)
  default     = ["0.0.0.0/0"] # MUST be restricted in production.tfvars
}

variable "use_cloud_servers" {
  description = "Use Hetzner Cloud servers (true) vs reference dedicated servers (false)"
  type        = bool
  default     = false
}

# --- Cloudflare ---
variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the domain"
  type        = string
}

variable "cloudflare_ips" {
  description = "Cloudflare edge IP ranges (for firewall rules)"
  type        = list(string)
  default = [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
  ]
}

# --- Public IPs (for dedicated servers) ---
variable "app_primary_public_ip" {
  description = "Public IP of app primary server (for DNS records)"
  type        = string
  default     = ""
}

# --- K3s ---
variable "k3s_token" {
  description = "K3s cluster join token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "k3s_version" {
  description = "K3s version to install"
  type        = string
  default     = "v1.30.2+k3s1"
}

# --- PostgreSQL ---
variable "pg_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15"
}

variable "pg_max_connections" {
  description = "PostgreSQL max connections"
  type        = number
  default     = 200
}

variable "pg_shared_buffers" {
  description = "PostgreSQL shared_buffers (e.g., 32GB for 128GB server)"
  type        = string
  default     = "32GB"
}

variable "pg_effective_cache_size" {
  description = "PostgreSQL effective_cache_size"
  type        = string
  default     = "96GB"
}

# --- Redis ---
variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "7"
}

# --- Backups ---
variable "backup_s3_bucket" {
  description = "S3-compatible bucket for database backups"
  type        = string
  default     = "aivo-backups"
}

variable "backup_encryption_key" {
  description = "AES-256 encryption key for backup encryption at rest"
  type        = string
  sensitive   = true
  default     = ""
}
