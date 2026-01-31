# Terraform Node Pool Configuration Mismatch - FIX

**Issue Date:** January 29, 2026  
**Severity:** HIGH - Configuration Drift  
**Status:** IDENTIFIED - Requires Immediate Fix

---

## Problem Summary

**DevOps is experiencing a Terraform state vs GCP reality mismatch:**

- **Terraform State Shows:** `disk_size_gb = 50`, `node_count = 2`, `pod_ipv4_cidr_block = "10.11.16.0/20"`
- **GCP Reality Shows:** `application-pool` is RUNNING, disk type `pd-ssd` 50GB
- **Root Cause:** Parameter name mismatch between environment config and GKE module

---

## Root Cause Analysis

### Issue 1: Parameter Name Mismatch

**Environment configs** (production/staging/main.tf) are using:

```hcl
app_pool_min_count = 3
app_pool_max_count = 20
```

**GKE module** (modules/gke/variables.tf) expects:

```hcl
app_min_nodes = 2   # NOT app_pool_min_count
app_max_nodes = 10  # NOT app_pool_max_count
```

### Issue 2: Missing app_disk_size Parameter

**Environment configs** are NOT passing `app_disk_size`, so module uses default:

```hcl
variable "app_disk_size" {
  default = 100  # Default is 100GB, not 50GB
}
```

But Terraform state shows 50GB, indicating someone manually changed it or there's state drift.

### Issue 3: Pod CIDR Block Confusion

The `pod_ipv4_cidr_block = "10.11.16.0/20"` in Terraform state doesn't match any environment configuration:

- **Dev:** Should use `10.100.0.0/14` (from vpc_cidr_range 10.0.0.0/16)
- **Staging:** Should use `10.110.0.0/14` (from vpc_cidr_range 10.10.0.0/16)
- **Production:** Should use `10.120.0.0/14` (from vpc_cidr_range 10.20.0.0/16)

The `10.11.16.0/20` suggests this might be an OLD dev/staging configuration that was manually created.

---

## Files Requiring Changes

### 1. Fix Environment Configurations

#### File: `infra/terraform/environments/production/main.tf`

**Current (Lines 58-62):**

```hcl
  # Production sizing - high availability
  app_pool_min_count = 3
  app_pool_max_count = 20
  app_machine_type   = "e2-standard-8"
```

**Should be:**

```hcl
  # Production sizing - high availability
  app_min_nodes    = 3
  app_max_nodes    = 20
  app_machine_type = "e2-standard-8"
  app_disk_size    = 100  # Explicitly set
```

#### File: `infra/terraform/environments/staging/main.tf`

**Current (Lines 56-59):**

```hcl
  # Staging sizing - mirrors production structure at smaller scale
  app_pool_min_count = 2
  app_pool_max_count = 5
  app_machine_type   = "e2-standard-4"
```

**Should be:**

```hcl
  # Staging sizing - mirrors production structure at smaller scale
  app_min_nodes    = 2
  app_max_nodes    = 5
  app_machine_type = "e2-standard-4"
  app_disk_size    = 50  # Explicitly set for staging
```

#### File: `infra/terraform/environments/dev/main.tf`

**Current (assumed similar pattern):**

```hcl
  app_pool_min_count = 1
  app_pool_max_count = 3
  app_machine_type   = "e2-standard-2"
```

**Should be:**

```hcl
  app_min_nodes    = 1
  app_max_nodes    = 3
  app_node_count   = 2  # For non-production static sizing
  app_machine_type = "e2-standard-2"
  app_disk_size    = 50  # Explicitly set for dev
```

### 2. Fix System Pool Parameters (Same Issue)

All environment files also have:

```hcl
system_pool_min_count = X
system_pool_max_count = Y
```

Should be:

```hcl
system_min_nodes = X
system_max_nodes = Y
```

### 3. Fix GPU Pool Parameters

**Current:**

```hcl
gpu_pool_min_count = 0
gpu_pool_max_count = 5
```

**Should be:**

```hcl
gpu_min_nodes = 0
gpu_max_nodes = 5
```

---

## Immediate Action Required

### Step 1: Backup Current State

```bash
cd infra/terraform/environments/<environment>
terraform state pull > state-backup-$(date +%Y%m%d).json
```

### Step 2: Review What Terraform Thinks vs Reality

```bash
# Check current state
terraform state show 'module.gke.google_container_node_pool.application'

# Compare with GCP
gcloud container node-pools describe application-pool \
  --cluster=aivo-gke-<environment> \
  --region=<region>
```

### Step 3: Fix Configuration Files

Update all three environment configs (dev, staging, production) with correct parameter names.

### Step 4: Plan and Verify (DO NOT APPLY YET)

```bash
terraform plan -out=fix.tfplan

# Review carefully - ensure no destructive changes
# Should show:
# - Parameter name corrections
# - No node pool recreation
# - No cluster disruption
```

### Step 5: State Reconciliation (If Needed)

If Terraform wants to recreate resources due to drift:

```bash
# Import existing node pool into correct state
terraform import 'module.gke.google_container_node_pool.application' \
  projects/<project-id>/locations/<region>/clusters/aivo-gke-<env>/nodePools/application-pool
```

### Step 6: Apply Fix

```bash
terraform apply fix.tfplan
```

---

## Complete Fix for All Environments

### Production (`infra/terraform/environments/production/main.tf`)

```hcl
module "gke" {
  source = "../../modules/gke"

  project_id  = local.project_id
  region      = local.region
  environment = local.environment

  vpc_id                        = module.networking.vpc_id
  subnet_id                     = module.networking.subnet_id
  pods_secondary_range_name     = module.networking.pods_secondary_range_name
  services_secondary_range_name = module.networking.services_secondary_range_name
  master_cidr                   = "10.125.0.0/28"

  # Application Node Pool - CORRECTED
  app_min_nodes    = 3
  app_max_nodes    = 20
  app_machine_type = "e2-standard-8"
  app_disk_size    = 100

  # System Node Pool - CORRECTED
  system_min_nodes    = 2
  system_max_nodes    = 5
  system_machine_type = "e2-standard-4"

  # GPU Pool - CORRECTED
  enable_gpu_pool = true
  gpu_min_nodes   = 0
  gpu_max_nodes   = 5
  gpu_machine_type = "n1-standard-8"
  gpu_type        = "nvidia-tesla-t4"
  gpu_count       = 1

  gke_service_account_email = var.gke_service_account_email

  depends_on = [module.networking]
}
```

### Staging (`infra/terraform/environments/staging/main.tf`)

```hcl
module "gke" {
  source = "../../modules/gke"

  project_id  = local.project_id
  region      = local.region
  environment = local.environment

  vpc_id                        = module.networking.vpc_id
  subnet_id                     = module.networking.subnet_id
  pods_secondary_range_name     = module.networking.pods_secondary_range_name
  services_secondary_range_name = module.networking.services_secondary_range_name
  master_cidr                   = "10.115.0.0/28"

  # Application Node Pool - CORRECTED
  app_min_nodes    = 2
  app_max_nodes    = 5
  app_machine_type = "e2-standard-4"
  app_disk_size    = 50  # Smaller disk for staging

  # System Node Pool - CORRECTED
  system_min_nodes    = 1
  system_max_nodes    = 3
  system_machine_type = "e2-standard-2"

  # GPU Pool - CORRECTED
  enable_gpu_pool = true
  gpu_min_nodes   = 0
  gpu_max_nodes   = 1
  gpu_machine_type = "n1-standard-4"
  gpu_type        = "nvidia-tesla-t4"
  gpu_count       = 1

  gke_service_account_email = var.gke_service_account_email

  depends_on = [module.networking]
}
```

### Dev (`infra/terraform/environments/dev/main.tf`)

```hcl
module "gke" {
  source = "../../modules/gke"

  project_id  = local.project_id
  region      = local.region
  environment = local.environment

  vpc_id                        = module.networking.vpc_id
  subnet_id                     = module.networking.subnet_id
  pods_secondary_range_name     = module.networking.pods_secondary_range_name
  services_secondary_range_name = module.networking.services_secondary_range_name
  master_cidr                   = "10.105.0.0/28"

  # Application Node Pool - CORRECTED
  app_node_count   = 2     # Static for dev
  app_min_nodes    = 1     # Not used in dev (no autoscaling)
  app_max_nodes    = 3     # Not used in dev (no autoscaling)
  app_machine_type = "e2-standard-2"
  app_disk_size    = 50

  # System Node Pool - CORRECTED
  system_node_count   = 1  # Static for dev
  system_machine_type = "e2-standard-2"

  # No GPU in dev
  enable_gpu_pool = false

  gke_service_account_email = var.gke_service_account_email

  depends_on = [module.networking]
}
```

---

## Validation Steps

After applying fixes:

```bash
# 1. Verify Terraform state matches config
terraform state show 'module.gke.google_container_node_pool.application'

# 2. Verify GCP reality
gcloud container node-pools describe application-pool \
  --cluster=aivo-gke-<environment> \
  --region=<region> \
  --format=json | jq '{
    name: .name,
    diskSizeGb: .config.diskSizeGb,
    diskType: .config.diskType,
    machineType: .config.machineType,
    nodeCount: .initialNodeCount,
    autoscaling: .autoscaling
  }'

# 3. Check pod CIDR
gcloud container clusters describe aivo-gke-<environment> \
  --region=<region> \
  --format=json | jq '{
    clusterIpv4Cidr: .clusterIpv4Cidr,
    servicesIpv4Cidr: .servicesIpv4Cidr,
    ipAllocationPolicy: .ipAllocationPolicy
  }'
```

---

## Prevention Measures

### 1. Add Validation to Module

Add variable validation in `modules/gke/variables.tf`:

```hcl
variable "app_disk_size" {
  description = "Disk size in GB for application nodes"
  type        = number
  default     = 100

  validation {
    condition     = var.app_disk_size >= 50 && var.app_disk_size <= 500
    error_message = "Disk size must be between 50GB and 500GB"
  }
}
```

### 2. Add Pre-Commit Hook

Create `.pre-commit-config.yaml`:

```yaml
- repo: https://github.com/antonbabenko/pre-commit-terraform
  hooks:
    - id: terraform_validate
    - id: terraform_fmt
```

### 3. CI/CD Validation

Add to GitHub Actions:

```yaml
- name: Terraform Validate
  run: |
    cd infra/terraform/environments/${{ matrix.env }}
    terraform init -backend=false
    terraform validate
```

---

## Risk Assessment

**CRITICAL:** These are parameter name mismatches, not infrastructure changes.

**Safe to fix because:**

- ✅ Node pool already exists with correct name (`application-pool`)
- ✅ Disk size already set (50GB in reality)
- ✅ No resource recreation required
- ✅ Only updating Terraform to match reality

**Risks:**

- ⚠️ If Terraform tries to recreate node pool → STOP and import existing
- ⚠️ Pod CIDR mismatch needs investigation
- ⚠️ Coordinate with running workloads

---

## Timeline

1. **Immediate:** Review this document with DevOps team
2. **Within 1 hour:** Backup all Terraform states
3. **Within 2 hours:** Apply fixes to dev environment
4. **Within 4 hours:** Apply fixes to staging (if dev successful)
5. **Within 24 hours:** Apply fixes to production (during maintenance window)

---

## Contact

For questions or concerns:

- DevOps Team Lead
- Infrastructure Engineer
- Platform Architect

**DO NOT apply Terraform changes without review and approval.**
