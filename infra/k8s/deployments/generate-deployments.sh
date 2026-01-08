#!/bin/bash
# Generate K8s deployments for all AIVO services
# Uses the template and applies service-specific configurations

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/_template.yaml"

# Service configurations: service_name|port|type
# Types: core, ai, gateway, worker, realtime
declare -A SERVICE_CONFIGS=(
  # Core services
  ["ai-orchestrator"]="3000|ai"
  ["analytics-svc"]="3000|core"
  ["api-gateway"]="3000|gateway"
  ["assessment-svc"]="3000|core"
  ["baseline-svc"]="3000|core"
  ["benchmarking-svc"]="3000|worker"
  ["collaboration-svc"]="3000|core"
  ["community-svc"]="3000|core"
  ["consent-svc"]="3000|core"
  ["content-authoring-svc"]="3000|core"
  ["content-svc"]="3000|core"
  ["curriculum-svc"]="3000|core"
  ["device-mgmt-svc"]="3000|core"
  ["dsr-svc"]="3000|worker"
  ["edfi-svc"]="3000|worker"
  ["embedded-tools-svc"]="3000|core"
  ["engagement-svc"]="3000|core"
  ["executive-function-svc"]="3000|ai"
  ["experimentation-svc"]="3000|core"
  ["focus-svc"]="3000|ai"
  ["game-library-svc"]="3000|core"
  ["gamification-svc"]="3000|core"
  ["goal-svc"]="3000|core"
  ["gradebook-svc"]="3000|core"
  ["homework-helper-svc"]="3000|ai"
  ["import-export-svc"]="3000|worker"
  ["integration-svc"]="3000|worker"
  ["learner-model-svc"]="3000|ai"
  ["lti-svc"]="3000|core"
  ["marketplace-svc"]="3000|core"
  ["messaging-svc"]="3000|realtime"
  ["ml-recommendation-svc"]="3000|ai"
  ["notify-svc"]="3000|worker"
  ["parent-svc"]="3000|core"
  ["payments-svc"]="3000|core"
  ["personalization-svc"]="3000|ai"
  ["professional-dev-svc"]="3000|core"
  ["profile-svc"]="3000|core"
  ["realtime-svc"]="3000|realtime"
  ["reports-svc"]="3000|core"
  ["research-svc"]="3000|worker"
  ["retention-svc"]="3000|worker"
  ["sandbox-svc"]="3000|ai"
  ["scorm-svc"]="3000|core"
  ["session-svc"]="3000|realtime"
  ["sis-sync-svc"]="3000|worker"
  ["speech-therapy-svc"]="3000|ai"
  ["sync-svc"]="3000|realtime"
  ["teacher-planning-svc"]="3000|core"
  ["tenant-svc"]="3000|core"
  ["translation-svc"]="3000|worker"
)

# Resource configurations by type
get_resources() {
  local type=$1
  case $type in
    "core")
      echo "100m|500m|256Mi|512Mi|2|10"
      ;;
    "ai")
      echo "500m|2000m|1Gi|4Gi|2|8"
      ;;
    "gateway")
      echo "200m|1000m|512Mi|1Gi|3|20"
      ;;
    "worker")
      echo "100m|500m|256Mi|512Mi|1|5"
      ;;
    "realtime")
      echo "200m|1000m|512Mi|1Gi|2|15"
      ;;
    *)
      echo "100m|500m|256Mi|512Mi|2|10"
      ;;
  esac
}

# Generate deployment for a service
generate_deployment() {
  local service=$1
  local config=$2

  IFS='|' read -r port type <<< "$config"
  IFS='|' read -r cpu_req cpu_limit mem_req mem_limit min_rep max_rep <<< "$(get_resources $type)"

  local output_file="$SCRIPT_DIR/${service}.yaml"

  # Skip if already exists (auth-svc, billing-svc)
  if [[ -f "$output_file" ]]; then
    echo "Skipping $service (already exists)"
    return
  fi

  echo "Generating $service.yaml..."

  sed -e "s/{{SERVICE_NAME}}/$service/g" \
      -e "s/{{SERVICE_PORT}}/$port/g" \
      -e "s/{{CPU_REQUEST}}/$cpu_req/g" \
      -e "s/{{CPU_LIMIT}}/$cpu_limit/g" \
      -e "s/{{MEMORY_REQUEST}}/$mem_req/g" \
      -e "s/{{MEMORY_LIMIT}}/$mem_limit/g" \
      -e "s/{{MIN_REPLICAS}}/$min_rep/g" \
      -e "s/{{MAX_REPLICAS}}/$max_rep/g" \
      "$TEMPLATE" > "$output_file"
}

# Main
echo "Generating K8s deployments for AIVO services..."
echo "================================================"

for service in "${!SERVICE_CONFIGS[@]}"; do
  generate_deployment "$service" "${SERVICE_CONFIGS[$service]}"
done

echo "================================================"
echo "Done! Generated deployments in $SCRIPT_DIR"
