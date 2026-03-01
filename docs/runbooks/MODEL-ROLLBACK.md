# Model Rollback Runbook

| Field           | Value                             |
| --------------- | --------------------------------- |
| **Service**     | ai-orchestrator, ai-inference-svc |
| **Severity**    | P1 – User-facing AI degradation   |
| **Responders**  | AI Platform On-Call, Backend Lead |
| **Last Update** | 2026-03                           |

---

## Overview

This runbook covers rolling back AI model versions when a newly deployed model
causes regressions in quality, latency, safety, or cost. Rollback is achieved
through environment variable overrides — no code deploy is required.

---

## Decision Matrix

| Symptom                                    | Action                        | Rollback Target         |
| ------------------------------------------ | ----------------------------- | ----------------------- |
| Tutoring quality drop (CSAT < 3.5)         | Roll back primary tutor model | Claude 3.5 Sonnet       |
| Safety filter false-positives > 5%         | Roll back safety model        | Gemini 2.0 Pro          |
| P95 latency > 8s on tutor responses        | Roll back to lower-tier model | Claude Sonnet 4.6       |
| Cost spike > 2× daily budget               | Roll back to cheaper model    | GPT-4o / Gemini Flash   |
| Model returns errors / 5xx > 1%            | Roll back + open provider bug | Previous stable version |
| Hallucination rate increase (eval failure) | Roll back + rerun eval suite  | Previous stable version |

---

## Prerequisites

- SSH / console access to the deployment environment (Hetzner nodes or container orchestrator)
- Access to the environment variable configuration (`.env`, Kubernetes ConfigMap, or Hetzner secrets)
- Grafana / observability dashboard access for health verification

---

## Rollback Procedure

### Step 1 — Identify the Problem Model

Check the orchestrator logs to identify which model is causing issues:

```bash
# ai-orchestrator (Node.js)
grep -i "provider.*error\|model.*fail\|timeout" /var/log/ai-orchestrator/*.log | tail -50

# ai-inference-svc (Python)
grep -i "provider.*error\|model.*fail\|timeout" /var/log/ai-inference-svc/*.log | tail -50
```

Check the model selection dashboard:

- Grafana → AI Models → Error Rate by Model
- Grafana → AI Models → P95 Latency by Model

### Step 2 — Set Environment Variable Override

Override the model generation to fall back to the previous stable version.

**For ai-orchestrator (TypeScript):**

```bash
# Roll back Anthropic models to legacy (pre-2026) generation
export ANTHROPIC_MODEL_GENERATION=legacy

# Roll back OpenAI models to legacy generation
export OPENAI_MODEL_GENERATION=legacy

# Roll back Gemini models to legacy generation
export GEMINI_MODEL_GENERATION=legacy

# Roll back ALL providers to legacy generation
export AI_MODEL_GENERATION=legacy
```

**For ai-inference-svc (Python):**

```bash
# Set the fallback model explicitly
export AI_PRIMARY_PROVIDER=anthropic
export AI_PRIMARY_MODEL=claude-3.5-sonnet-20241022

# Or force fallback provider
export AI_FORCE_FALLBACK=true
```

**Provider-specific model overrides:**

```bash
# Override specific model selections
export TUTOR_MODEL=claude-3.5-sonnet-20241022      # Was: claude-opus-4-20250855
export SAFETY_MODEL=gemini-2.0-pro                  # Was: gemini-3.1-pro
export REASONING_MODEL=gpt-4o                       # Was: gpt-5.2-thinking
export STT_MODEL=whisper-1                          # Was: voxtral-stt-v1
export TTS_MODEL=tts-1                              # Was: openai-tts-aura-2
```

### Step 3 — Restart Services

```bash
# ai-orchestrator
systemctl restart ai-orchestrator
# or in Docker/K8s:
docker restart ai-orchestrator
# kubectl rollout restart deployment/ai-orchestrator -n aivo

# ai-inference-svc
systemctl restart ai-inference-svc
# or in Docker/K8s:
docker restart ai-inference-svc
# kubectl rollout restart deployment/ai-inference-svc -n aivo
```

### Step 4 — Verify Health Endpoints

Confirm both services are healthy after restart:

```bash
# ai-orchestrator health
curl -sf http://localhost:4010/health | jq .
# Expected: {"status":"ok","version":"...","models":{"generation":"legacy",...}}

# ai-inference-svc health
curl -sf http://localhost:8000/health | jq .
# Expected: {"status":"healthy","provider":"anthropic","model":"claude-3.5-sonnet-20241022"}
```

Verify the rollback took effect:

```bash
# Send a test request and check which model responds
curl -X POST http://localhost:4010/api/v1/ai/complete \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","context":"TUTOR","maxTokens":10}' | jq '.model, .provider'

# Expected output should show the legacy model, e.g.:
# "claude-3.5-sonnet-20241022"
# "anthropic"
```

### Step 5 — Monitor for 15 Minutes

After rollback, monitor the following metrics for **15 minutes** to confirm stability:

| Metric                     | Dashboard Location               | Healthy Threshold  |
| -------------------------- | -------------------------------- | ------------------ |
| Error rate (5xx)           | Grafana → AI Models → Errors     | < 0.1%             |
| P95 response latency       | Grafana → AI Models → Latency    | < 5s (tutor)       |
| Successful completions/min | Grafana → AI Models → Throughput | > 90% of baseline  |
| Safety filter accuracy     | Grafana → Safety → Precision     | > 98%              |
| Cost per 1K tokens         | Grafana → AI Models → Cost       | Within 1.5× budget |

If all metrics are green after 15 minutes, the rollback is successful.

### Step 6 — Notify the Team

Post in the **#ai-platform** Slack channel:

```
🔄 MODEL ROLLBACK EXECUTED
- Service: [ai-orchestrator / ai-inference-svc / both]
- Rolled back: [new model] → [legacy model]
- Reason: [brief description]
- Status: Stable after 15min monitoring
- Ticket: [link to incident ticket]
```

---

## Investigation Before Re-enabling

Before re-enabling the new model generation, complete the following:

1. **Run the evaluation suite** against the problematic model:

   ```bash
   # From the workspace root
   pnpm --filter @aivo/ai-orchestrator eval:baseline
   ```

2. **Compare eval results** with the previous baseline in `services/ai-orchestrator/eval/baselines/`

3. **Check provider status pages**:
   - Anthropic: https://status.anthropic.com
   - OpenAI: https://status.openai.com
   - Google AI: https://status.cloud.google.com

4. **Review model changelogs** for any provider-side changes that may have affected behavior

5. **Test in staging** before re-enabling in production:

   ```bash
   # Set the new model generation in staging only
   export AI_MODEL_GENERATION=2026-03
   # Run integration tests
   pnpm --filter @aivo/ai-orchestrator vitest run test/providers-2026.integration.test.ts
   ```

6. **Gradual re-enable**: Use percentage-based rollout if supported:
   ```bash
   export AI_NEW_MODEL_ROLLOUT_PERCENT=10   # Start with 10%
   # Monitor for 1 hour, then increase
   export AI_NEW_MODEL_ROLLOUT_PERCENT=50
   # Monitor for 1 hour, then full rollout
   export AI_NEW_MODEL_ROLLOUT_PERCENT=100
   ```

---

## Escalation Path

| Level    | Contact               | When                                            |
| -------- | --------------------- | ----------------------------------------------- |
| L1       | AI Platform On-Call   | First responder, executes rollback              |
| L2       | Backend Lead          | Rollback doesn't resolve, or root cause unclear |
| L3       | CTO / VP Engineering  | Extended outage > 30min, data integrity risk    |
| Provider | Provider support team | Confirmed provider-side issue                   |

---

## Related Runbooks

- [Region Failover](region-failover.md) — Multi-region failover procedures
- [Service Down](service-down.md) — General service recovery
- [High Error Rate](high-error-rate.md) — Error rate investigation
- [Performance Degradation](performance-degradation.md) — Latency investigation
