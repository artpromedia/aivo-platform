# =============================================================================
# Multi-Region Variables
# =============================================================================

# --- Provider credentials ---
variable "hetzner_api_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for aivolearning.com"
  type        = string
}

# --- SSH ---
variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
}

variable "management_ips" {
  description = "IP CIDRs allowed SSH/API access"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict in production.tfvars
}

# --- Cloudflare edge IPs (for firewall rules) ---
variable "cloudflare_ips" {
  description = "Cloudflare edge IP ranges"
  type        = list(string)
  default = [
    "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22",
    "103.31.4.0/22", "141.101.64.0/18", "108.162.192.0/18",
    "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22",
    "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
    "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22"
  ]
}

# --- Server types ---
variable "cp_server_type" {
  description = "Hetzner server type for control plane nodes"
  type        = string
  default     = "cx31"
}

variable "worker_server_type" {
  description = "Hetzner server type for worker nodes"
  type        = string
  default     = "cx41"
}

variable "db_server_type" {
  description = "Hetzner server type for database nodes"
  type        = string
  default     = "cx41"
}

# --- Cluster sizing ---
variable "control_plane_count" {
  description = "Number of control plane nodes per region (3 recommended for HA)"
  type        = number
  default     = 3
}

variable "worker_count_primary" {
  description = "Number of worker nodes in primary (us-east) region"
  type        = number
  default     = 4
}

variable "worker_count_secondary" {
  description = "Number of worker nodes in secondary (us-west) region"
  type        = number
  default     = 3
}

# --- K3s ---
variable "k3s_version" {
  description = "K3s version"
  type        = string
  default     = "v1.30.2+k3s1"
}

variable "k3s_token" {
  description = "K3s cluster join token"
  type        = string
  sensitive   = true
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
  description = "PostgreSQL shared_buffers"
  type        = string
  default     = "8GB"
}

variable "pg_effective_cache_size" {
  description = "PostgreSQL effective_cache_size"
  type        = string
  default     = "24GB"
}

variable "pg_replication_password" {
  description = "Password for PostgreSQL streaming replication user"
  type        = string
  sensitive   = true
}

# --- Redis ---
variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "7"
}

# --- Backups ---
variable "backup_s3_bucket" {
  description = "S3-compatible bucket for backups"
  type        = string
  default     = "aivo-backups"
}

variable "backup_encryption_key" {
  description = "AES-256 encryption key for backup encryption"
  type        = string
  sensitive   = true
  default     = ""
}
