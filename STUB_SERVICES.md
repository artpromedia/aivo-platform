# AIVO Platform - Stub Services Documentation

**Last Updated:** February 2026  
**Status:** Active Production Configuration  
**Owner:** Platform Engineering Team

---

## Overview

This document describes the 8 Python AI/ML services that are currently returning HTTP 501 (Not Implemented) responses. These services have been **feature-flagged** to return graceful HTTP 503 (Service Unavailable) responses with "coming soon" messaging, preventing production errors while clearly communicating feature availability to users.

---

## Quick Reference

| Service                   | Feature Flag                   | Status      | Expected Date |
| ------------------------- | ------------------------------ | ----------- | ------------- |
| rl-tutoring-svc           | `FEATURE_RL_TUTORING`          | 🔴 Disabled | Q2 2026       |
| peer-learning-svc         | `FEATURE_PEER_LEARNING`        | 🔴 Disabled | Q2 2026       |
| multimodal-analytics-svc  | `FEATURE_MULTIMODAL_ANALYTICS` | 🔴 Disabled | Q3 2026       |
| gamification-svc (Python) | `FEATURE_GAMIFICATION_PYTHON`  | 🔴 Disabled | Q1 2026       |
| content-intelligence-svc  | `FEATURE_CONTENT_INTELLIGENCE` | 🔴 Disabled | Q1 2026       |
| cognitive-load-svc        | `FEATURE_COGNITIVE_LOAD`       | 🔴 Disabled | Q2 2026       |
| accessibility-ai-svc      | `FEATURE_ACCESSIBILITY_AI`     | 🔴 Disabled | Q2 2026       |
| specialized-support-svc   | `FEATURE_SPECIALIZED_SUPPORT`  | 🔴 Disabled | Q2 2026       |

---

## Service Details

### 1. RL Tutoring Service (`rl-tutoring-svc`)

**Purpose:** Reinforcement learning-based personalized tutoring that adapts teaching strategies based on learner behavior and outcomes.

**API Prefix:** `/api/v1/rl-tutoring`

**Feature Flag:** `FEATURE_RL_TUTORING=false`

**Stub Files:**

- `services/rl-tutoring-svc/app/models/action_selector.py`
- `services/rl-tutoring-svc/app/models/state_encoder.py`
- `services/rl-tutoring-svc/app/models/reward_model.py`
- `services/rl-tutoring-svc/app/models/policy_learner.py`
- `services/rl-tutoring-svc/app/services/experience_buffer.py`
- `services/rl-tutoring-svc/app/services/policy_evaluator.py`

**Fallback Message:**

> "AI-powered personalized tutoring is coming soon. Standard tutoring is available."

**Alternative:** Use standard tutoring features in `ai-orchestrator`

---

### 2. Peer Learning Service (`peer-learning-svc`)

**Purpose:** AI-powered matching of learners for collaborative learning, forming optimal study groups based on complementary skills and learning styles.

**API Prefix:** `/api/v1/peer-learning`

**Feature Flag:** `FEATURE_PEER_LEARNING=false`

**Stub Files:**

- `services/peer-learning-svc/app/models/peer_matcher.py`
- `services/peer-learning-svc/app/models/group_former.py`
- `services/peer-learning-svc/app/models/collaboration_scorer.py`
- `services/peer-learning-svc/app/models/discussion_facilitator.py`
- `services/peer-learning-svc/app/services/matching_engine.py`

**Fallback Message:**

> "AI-matched peer learning groups coming soon. Manual group creation is available."

**Alternative:** Teachers can manually create learning groups via `classroom-svc`

---

### 3. Multimodal Analytics Service (`multimodal-analytics-svc`)

**Purpose:** Cross-modal learning analytics combining visual, audio, and interaction data to provide holistic learner insights.

**API Prefix:** `/api/v1/multimodal`

**Feature Flag:** `FEATURE_MULTIMODAL_ANALYTICS=false`

**Stub Files:**

- `services/multimodal-analytics-svc/app/models/feature_fusioner.py`
- `services/multimodal-analytics-svc/app/models/cross_modal_analyzer.py`
- `services/multimodal-analytics-svc/app/models/learning_style_detector.py`
- `services/multimodal-analytics-svc/app/models/holistic_analyzer.py`
- `services/multimodal-analytics-svc/app/services/insight_generator.py`
- `services/multimodal-analytics-svc/app/services/data_aggregator.py`

**Fallback Message:**

> "Advanced cross-modal analytics coming soon. Standard analytics are available."

**Alternative:** Use standard analytics in `analytics-svc`

---

### 4. Gamification Python Service (`gamification-svc`)

**Purpose:** AI-optimized achievement engine and reward optimization using machine learning to maximize engagement.

**API Prefix:** `/api/v1/gamification/ai`

**Feature Flag:** `FEATURE_GAMIFICATION_PYTHON=false`

**Stub Files:**

- `services/gamification-svc/app/models/achievement_engine.py`
- `services/gamification-svc/app/models/reward_optimizer.py`
- `services/gamification-svc/app/models/challenge_calibrator.py`
- `services/gamification-svc/app/models/engagement_predictor.py`
- `services/gamification-svc/app/services/leaderboard_manager.py`
- `services/gamification-svc/app/services/streak_tracker.py`

**Fallback Message:**

> "AI-optimized rewards coming soon. Standard gamification is active."

**Alternative:** TypeScript gamification service provides core functionality

---

### 5. Content Intelligence Service (`content-intelligence-svc`)

**Purpose:** AI-powered content analysis, topic classification, readability assessment, and automatic tagging of educational materials.

**API Prefix:** `/api/v1/content-intelligence`

**Feature Flag:** `FEATURE_CONTENT_INTELLIGENCE=false`

**Stub Files:**

- `services/content-intelligence-svc/app/models/topic_classifier.py`
- `services/content-intelligence-svc/app/models/readability_analyzer.py`
- `services/content-intelligence-svc/app/models/content_recommender.py`
- `services/content-intelligence-svc/app/models/auto_tagger.py`
- `services/content-intelligence-svc/app/services/embedding_service.py`
- `services/content-intelligence-svc/app/services/content_indexer.py`

**Fallback Message:**

> "AI content analysis coming soon. Manual tagging is available."

**Alternative:** Content authors can manually tag content in Author Portal

---

### 6. Cognitive Load Service (`cognitive-load-svc`)

**Purpose:** Real-time cognitive load assessment and pacing optimization to prevent learner overwhelm.

**API Prefix:** `/api/v1/cognitive-load`

**Feature Flag:** `FEATURE_COGNITIVE_LOAD=false`

**Stub Files:**

- `services/cognitive-load-svc/app/models/complexity_analyzer.py`
- `services/cognitive-load-svc/app/models/mental_model_assessor.py`
- `services/cognitive-load-svc/app/models/pacing_optimizer.py`
- `services/cognitive-load-svc/app/services/adaptation_engine.py`

**Fallback Message:**

> "Cognitive load optimization coming soon. Standard pacing is available."

**Alternative:** Standard adaptive pacing in `session-svc`

---

### 7. Accessibility AI Service (`accessibility-ai-svc`)

**Purpose:** AI-driven accessibility adaptations including automatic alt-text generation, reading level adjustments, and sensory accommodations.

**API Prefix:** `/api/v1/accessibility-ai`

**Feature Flag:** `FEATURE_ACCESSIBILITY_AI=false`

**Stub Files:**

- `services/accessibility-ai-svc/app/models/alt_text_generator.py`
- `services/accessibility-ai-svc/app/models/reading_level_adapter.py`
- `services/accessibility-ai-svc/app/models/sensory_accommodator.py`

**Fallback Message:**

> "AI accessibility features coming soon. Manual accommodations are available."

**Alternative:** Manual accessibility settings in learner profile

---

### 8. Specialized Support Service (`specialized-support-svc`)

**Purpose:** AI-powered accommodations for special education, IEP/504 plan integration, and differentiated instruction support.

**API Prefix:** `/api/v1/specialized-support`

**Feature Flag:** `FEATURE_SPECIALIZED_SUPPORT=false`

**Stub Files:**

- `services/specialized-support-svc/app/models/iep_analyzer.py`
- `services/specialized-support-svc/app/models/differentiation_engine.py`
- `services/specialized-support-svc/app/models/accommodation_recommender.py`

**Fallback Message:**

> "AI specialized support coming soon. Standard accommodations are available."

**Alternative:** Manual IEP/504 accommodations via `iep-svc`

---

## Configuration

### Environment Variables

Add these to your environment configuration (`.env`, Kubernetes ConfigMap, etc.):

```bash
# Stub Service Feature Flags (all disabled by default)
FEATURE_RL_TUTORING=false
FEATURE_PEER_LEARNING=false
FEATURE_MULTIMODAL_ANALYTICS=false
FEATURE_GAMIFICATION_PYTHON=false
FEATURE_CONTENT_INTELLIGENCE=false
FEATURE_COGNITIVE_LOAD=false
FEATURE_ACCESSIBILITY_AI=false
FEATURE_SPECIALIZED_SUPPORT=false
```

### Kubernetes Configuration

Apply the ConfigMap:

```bash
kubectl apply -f k8s/stub-services-config.yaml
```

### Enabling a Service

When a service is fully implemented and tested:

1. **Via Environment Variable:**

   ```bash
   export FEATURE_CONTENT_INTELLIGENCE=true
   ```

2. **Via Kubernetes:**

   ```bash
   kubectl patch configmap stub-services-config -n aivo \
     --type merge -p '{"data":{"FEATURE_CONTENT_INTELLIGENCE":"true"}}'
   ```

3. **Restart the API Gateway:**
   ```bash
   kubectl rollout restart deployment/python-api-gateway -n aivo
   ```

---

## API Response Format

### When Service is Disabled (HTTP 503)

```json
{
  "error": "SERVICE_NOT_AVAILABLE",
  "error_code": "FEATURE_COMING_SOON",
  "message": "AI-powered personalized tutoring is coming soon. Standard tutoring is available.",
  "service": "Reinforcement Learning Tutoring",
  "expected_availability": "2026-Q2",
  "documentation": "https://docs.aivo.ai/features/coming-soon",
  "support": "support@aivo.ai"
}
```

**Response Headers:**

- `Retry-After: 86400` (1 day)
- `X-Feature-Status: coming-soon`
- `X-Service-Name: rl-tutoring-svc`

### When Service is Enabled (Normal Response)

The service will process requests normally and return appropriate responses.

---

## Monitoring & Alerts

### Prometheus Alerts

| Alert                          | Severity | Description                  |
| ------------------------------ | -------- | ---------------------------- |
| `UnhandledStubService501`      | Critical | HTTP 501 responses detected  |
| `HighStubServiceUsageAttempts` | Warning  | High volume of 503 responses |

### Grafana Dashboard

Access the stub services dashboard at:

```
https://grafana.aivo.ai/d/stub-services
```

### Check Service Status

```bash
# API endpoint
curl https://api.aivo.ai/api/v1/stub-services/status

# Health check
curl https://api.aivo.ai/api/v1/stub-services/health
```

---

## Implementation Roadmap

### Q1 2026

- [ ] `gamification-svc` Python models
- [ ] `content-intelligence-svc` core features

### Q2 2026

- [ ] `rl-tutoring-svc` full implementation
- [ ] `peer-learning-svc` matching engine
- [ ] `cognitive-load-svc` assessment
- [ ] `accessibility-ai-svc` adaptations
- [ ] `specialized-support-svc` IEP integration

### Q3 2026

- [ ] `multimodal-analytics-svc` cross-modal analysis

---

## Troubleshooting

### HTTP 501 Still Appearing

If you see HTTP 501 responses in production:

1. **Check if path is configured:**

   ```python
   # In services/python-api-gateway/app/core/stub_services.py
   # Ensure the API prefix is listed in STUB_SERVICE_CONFIGS
   ```

2. **Verify middleware is active:**

   ```bash
   curl -I https://api.aivo.ai/api/v1/stub-services/health
   ```

3. **Check for direct service calls:**
   Ensure all traffic goes through the API gateway, not directly to stub services.

### Service Doesn't Start After Enabling

1. **Check implementation status:**
   The service code may still have `raise NotImplementedError`

2. **Verify dependencies:**
   ML models and dependencies must be properly installed

3. **Check logs:**
   ```bash
   kubectl logs -f deployment/python-api-gateway -n aivo
   ```

---

## Contact

- **Platform Team:** platform@aivo.ai
- **On-Call:** #aivo-platform-oncall (Slack)
- **Documentation:** https://docs.aivo.ai/features/coming-soon

---

## Changelog

| Date       | Change                                   |
| ---------- | ---------------------------------------- |
| 2026-02-01 | Initial feature flag implementation      |
| 2026-02-01 | Added middleware and API gateway routing |
| 2026-02-01 | Created Kubernetes configuration         |
| 2026-02-01 | Added monitoring alerts                  |
