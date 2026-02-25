#!/usr/bin/env bash
set -euo pipefail

# Resource tiers
declare -A TIER_CPU_REQUEST TIER_CPU_LIMIT TIER_MEM_REQUEST TIER_MEM_LIMIT

# Tier 1: Critical path
TIER_CPU_REQUEST[1]="200m"; TIER_CPU_LIMIT[1]="1000m"
TIER_MEM_REQUEST[1]="256Mi"; TIER_MEM_LIMIT[1]="512Mi"

# Tier 2: High traffic
TIER_CPU_REQUEST[2]="150m"; TIER_CPU_LIMIT[2]="750m"
TIER_MEM_REQUEST[2]="192Mi"; TIER_MEM_LIMIT[2]="384Mi"

# Tier 3: Standard
TIER_CPU_REQUEST[3]="100m"; TIER_CPU_LIMIT[3]="500m"
TIER_MEM_REQUEST[3]="128Mi"; TIER_MEM_LIMIT[3]="256Mi"

# Tier 4: AI/ML (higher memory)
TIER_CPU_REQUEST[4]="250m"; TIER_CPU_LIMIT[4]="2000m"
TIER_MEM_REQUEST[4]="512Mi"; TIER_MEM_LIMIT[4]="2Gi"

# Tier 5: Web frontends
TIER_CPU_REQUEST[5]="50m"; TIER_CPU_LIMIT[5]="500m"
TIER_MEM_REQUEST[5]="128Mi"; TIER_MEM_LIMIT[5]="256Mi"

generate_patch() {
  local svc=$1 tier=$2 namespace=$3
  cat > "infra/k8s/overlays/${namespace}/patches/${svc}-resources.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${svc}
spec:
  template:
    spec:
      containers:
        - name: ${svc}
          resources:
            requests:
              cpu: ${TIER_CPU_REQUEST[$tier]}
              memory: ${TIER_MEM_REQUEST[$tier]}
            limits:
              cpu: ${TIER_CPU_LIMIT[$tier]}
              memory: ${TIER_MEM_LIMIT[$tier]}
EOF
}

for ns in aivo-staging aivo-prod; do
  mkdir -p "infra/k8s/overlays/${ns}/patches"
  
  # Tier 1: Critical
  for svc in auth-svc api-gateway tenant-svc billing-svc; do
    generate_patch "$svc" 1 "$ns"
  done
  
  # Tier 2: High traffic
  for svc in session-svc content-svc assessment-svc gamification-svc realtime-svc; do
    generate_patch "$svc" 2 "$ns"
  done
  
  # Tier 3: Standard
  for svc in profile-svc parent-svc messaging-svc notify-svc audit-svc compliance-svc reports-svc sis-sync-svc iep-svc; do
    generate_patch "$svc" 3 "$ns"
  done
  
  # Tier 4: AI/ML
  for svc in python-api-gateway ai-inference-svc brain-engine ml-recommendation-svc curriculum-py-svc training-svc grading-engine speech-analysis-svc vision-analysis-svc document-intelligence-svc question-generation-svc writing-assessment-svc cognitive-load-svc content-intelligence-svc knowledge-graph-svc accessibility-ai-svc specialized-support-svc rl-tutoring-svc peer-learning-svc multimodal-analytics-svc research-svc; do
    generate_patch "$svc" 4 "$ns"
  done
  
  # Tier 5: Web
  for svc in web-learner web-teacher web-parent web-district web-marketing web-platform-admin web-author web-creator web-dev-portal; do
    generate_patch "$svc" 5 "$ns"
  done
done

echo "Generated resource patches for all services"
