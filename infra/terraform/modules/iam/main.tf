# =============================================================================
# AIVO Platform - IAM Module
# =============================================================================
# Creates service accounts, roles, and workload identity bindings
# =============================================================================

# -----------------------------------------------------------------------------
# GKE Node Service Account
# -----------------------------------------------------------------------------
resource "google_service_account" "gke_nodes" {
  account_id   = "${var.project_prefix}-gke-nodes-${var.environment}"
  display_name = "AIVO GKE Nodes (${var.environment})"
  description  = "Service account for GKE node pools"
}

# Minimal permissions for GKE nodes
resource "google_project_iam_member" "gke_nodes_roles" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/artifactregistry.reader",
    "roles/storage.objectViewer",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# -----------------------------------------------------------------------------
# Application Service Account (for Workload Identity)
# -----------------------------------------------------------------------------
resource "google_service_account" "application" {
  account_id   = "${var.project_prefix}-app-${var.environment}"
  display_name = "AIVO Application (${var.environment})"
  description  = "Service account for AIVO application workloads"
}

# Application permissions
resource "google_project_iam_member" "application_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/storage.objectAdmin",
    "roles/pubsub.publisher",
    "roles/pubsub.subscriber",
    "roles/cloudtrace.agent",
    "roles/errorreporting.writer",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.application.email}"
}

# Workload Identity binding for application
resource "google_service_account_iam_member" "application_workload_identity" {
  service_account_id = google_service_account.application.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/aivo-app]"
}

# -----------------------------------------------------------------------------
# Per-Service Service Accounts (for fine-grained access)
# -----------------------------------------------------------------------------
resource "google_service_account" "services" {
  for_each = toset(var.service_list)

  account_id   = "${var.project_prefix}-${each.value}-${var.environment}"
  display_name = "AIVO ${replace(title(each.value), "-", " ")} (${var.environment})"
  description  = "Service account for ${each.value} service"
}

# Workload Identity bindings for services
resource "google_service_account_iam_member" "services_workload_identity" {
  for_each = toset(var.service_list)

  service_account_id = google_service_account.services[each.key].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.k8s_namespace}/${each.value}]"
}

# -----------------------------------------------------------------------------
# Cloud SQL Proxy Service Account
# -----------------------------------------------------------------------------
resource "google_service_account" "cloudsql_proxy" {
  account_id   = "${var.project_prefix}-cloudsql-${var.environment}"
  display_name = "AIVO Cloud SQL Proxy (${var.environment})"
  description  = "Service account for Cloud SQL proxy connections"
}

resource "google_project_iam_member" "cloudsql_proxy_roles" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloudsql_proxy.email}"
}

resource "google_service_account_iam_member" "cloudsql_proxy_workload_identity" {
  service_account_id = google_service_account.cloudsql_proxy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.k8s_namespace}/cloudsql-proxy]"
}

# -----------------------------------------------------------------------------
# CI/CD Service Account (for deployments)
# -----------------------------------------------------------------------------
resource "google_service_account" "cicd" {
  account_id   = "${var.project_prefix}-cicd-${var.environment}"
  display_name = "AIVO CI/CD (${var.environment})"
  description  = "Service account for CI/CD pipelines"
}

resource "google_project_iam_member" "cicd_roles" {
  for_each = toset([
    "roles/container.developer",
    "roles/artifactregistry.writer",
    "roles/storage.objectAdmin",
    "roles/secretmanager.secretAccessor",
    "roles/cloudbuild.builds.editor",
    "roles/iam.serviceAccountUser",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cicd.email}"
}

# -----------------------------------------------------------------------------
# AI Orchestrator Service Account (elevated permissions)
# -----------------------------------------------------------------------------
resource "google_service_account" "ai_orchestrator" {
  account_id   = "${var.project_prefix}-ai-orch-${var.environment}"
  display_name = "AIVO AI Orchestrator (${var.environment})"
  description  = "Service account for AI orchestration service"
}

resource "google_project_iam_member" "ai_orchestrator_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/storage.objectAdmin",
    "roles/aiplatform.user",
    "roles/ml.developer",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.ai_orchestrator.email}"
}

resource "google_service_account_iam_member" "ai_orchestrator_workload_identity" {
  service_account_id = google_service_account.ai_orchestrator.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.k8s_namespace}/ai-orchestrator]"
}

# -----------------------------------------------------------------------------
# Backup Service Account
# -----------------------------------------------------------------------------
resource "google_service_account" "backup" {
  account_id   = "${var.project_prefix}-backup-${var.environment}"
  display_name = "AIVO Backup (${var.environment})"
  description  = "Service account for backup operations"
}

resource "google_project_iam_member" "backup_roles" {
  for_each = toset([
    "roles/storage.objectAdmin",
    "roles/cloudsql.admin",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.backup.email}"
}
