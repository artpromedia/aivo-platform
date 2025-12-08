# Homework & Focus Agent Guardrails

This document describes the safety guardrails implemented for the **HOMEWORK_HELPER** and **FOCUS** AI agents in AIVO. These guardrails ensure that AI responses are appropriate, safe, and pedagogically sound.

## Overview

| Agent           | Primary Guardrail      | Safety Concern                             |
| --------------- | ---------------------- | ------------------------------------------ |
| HOMEWORK_HELPER | No direct answers      | Must scaffold learning, not solve problems |
| FOCUS           | No diagnostic language | Must not make clinical assessments         |

Both agents also share common safety guardrails:

- Self-harm keyword detection (BLOCKED)
- Explicit content detection (BLOCKED)
- Diagnosis-like statements (NEEDS_REVIEW)

## HOMEWORK_HELPER Guardrails

### Purpose

The Homework Helper agent assists students with their homework by providing guidance, hints, and scaffolding—**without giving away answers**.

### Prohibited Patterns

The agent must NOT produce responses containing:

```
✗ "The answer is..."
✗ "The final answer is 42"
✗ "x = 5" (giving variable values)
✗ "Therefore, the answer is..."
✗ "So the value is..."
✗ "The main theme is that..." (for ELA)
```

### Expected Behavior

Instead, responses should:

```
✓ "Let's think about this step by step..."
✓ "What operation do you think we should use?"
✓ "Try breaking this into smaller parts..."
✓ "What do you notice about these numbers?"
✓ "Can you identify any patterns?"
```

### Detection Patterns

Located in `services/homework-helper-svc/src/guardrails/directAnswerFilter.ts`:

```typescript
const DIRECT_ANSWER_PATTERNS = [
  /\bthe answer is\b/i,
  /\bfinal answer[:\s]/i,
  /\bx\s*=\s*-?\d+(\.\d+)?(?!\s*\?)/i,
  /\btherefore,?\s+the\s+(answer|result|value)\b/i,
  // ... more patterns
];
```

### Testing

Run the safety evaluation suite:

```bash
cd services/ai-orchestrator
pnpm run eval:homework-safety
```

Test cases are in `eval/homework_helper_safety_test_set.json`.

---

## FOCUS Agent Guardrails

### Purpose

The Focus agent helps students manage attention, take breaks, and maintain focus during study sessions. It must provide supportive guidance **without making clinical assessments**.

### Prohibited Patterns

The agent must NOT produce responses containing:

```
✗ "You have ADHD"
✗ "You are autistic"
✗ "You have attention deficit..."
✗ "You need medication"
✗ "You seem depressed"
✗ "Anxiety disorder"
```

### Critical Safety (BLOCKED)

Self-harm related content is immediately blocked:

```
✗ "kill myself" → BLOCKED
✗ "suicide" → BLOCKED
✗ "hurt myself" → BLOCKED
✗ "end it all" → BLOCKED
```

Fallback message: "I'm not able to answer that. Please talk to a trusted adult or professional."

### Expected Behavior

Responses should:

```
✓ "It sounds like a good time for a short break"
✓ "Let's try a quick breathing exercise"
✓ "That's completely normal to feel that way"
✓ "Would you like to stretch for a minute?"
✓ "Welcome back! Ready to continue?"
```

### Detection Patterns

Located in `services/ai-orchestrator/src/safety/SafetyAgent.ts`:

```typescript
const DIAGNOSIS_PATTERNS = ['you are autistic', 'you have adhd', 'you have autism', 'you are adhd'];

const SELF_HARM_KEYWORDS = ['kill myself', 'suicide', 'hurt myself', 'end it all'];
```

### Testing

Run the safety evaluation suite:

```bash
cd services/ai-orchestrator
pnpm run eval:focus-safety
```

Test cases are in `eval/focus_safety_test_set.json`.

---

## Observability & Metrics

### Agent-Specific Metrics

The telemetry system tracks metrics broken down by agent type:

| Metric                    | Description                                      |
| ------------------------- | ------------------------------------------------ |
| `callsByAgent`            | Total AI calls per agent type                    |
| `safetyViolationsByAgent` | BLOCKED responses per agent                      |
| `needsReviewByAgent`      | NEEDS_REVIEW responses per agent                 |
| `avgLatencyByAgent`       | Average response time per agent                  |
| `callsByUseCase`          | Calls by use case (e.g., HOMEWORK_STEP_SCAFFOLD) |

### API Endpoints

```
GET /internal/ai/metrics/summary
GET /internal/ai/metrics/agents
```

### Use Cases

Each agent call can include a `useCase` field for granular tracking:

**HOMEWORK_HELPER use cases:**

- `HOMEWORK_STEP_SCAFFOLD` - Step-by-step guidance
- `HOMEWORK_HINT` - Providing hints
- `HOMEWORK_EXPLANATION` - Explaining concepts
- `HOMEWORK_VALIDATION` - Checking student work

**FOCUS use cases:**

- `FOCUS_BREAK_SUGGESTION` - Suggesting breaks
- `FOCUS_MOOD_CHECK` - Checking in on mood
- `FOCUS_SESSION_START` - Starting a focus session
- `FOCUS_ENCOURAGEMENT` - Providing encouragement

---

## Alerting

### Alert Thresholds

Defined in `services/ai-orchestrator/src/safety/alerting.ts`:

| Alert               | Severity | Threshold         |
| ------------------- | -------- | ----------------- |
| Safety BLOCKED      | CRITICAL | ≥1 in 5 minutes   |
| Safety NEEDS_REVIEW | WARNING  | ≥5 in 60 minutes  |
| Safety NEEDS_REVIEW | CRITICAL | ≥20 in 60 minutes |
| Direct Answer (HW)  | WARNING  | ≥3 in 60 minutes  |
| Direct Answer (HW)  | CRITICAL | ≥10 in 60 minutes |
| Diagnostic Language | WARNING  | ≥1 in 60 minutes  |
| Diagnostic Language | CRITICAL | ≥3 in 60 minutes  |

### Integration

Register alert handlers:

```typescript
import { onAlert, evaluateAlerts, dispatchAlerts } from './safety/alerting';

// Register Slack handler
onAlert(async (alert) => {
  await slack.post('#safety-alerts', formatAlert(alert));
});

// Register PagerDuty handler for critical alerts
onAlert(async (alert) => {
  if (alert.severity === 'CRITICAL') {
    await pagerduty.trigger(alert);
  }
});

// Evaluate and dispatch
const alerts = evaluateAlerts(metricsSnapshot);
await dispatchAlerts(alerts);
```

---

## Safety Evaluation CI/CD

### Running Safety Tests

```bash
# Run all safety tests
pnpm run eval:homework-safety
pnpm run eval:focus-safety

# Or combined
pnpm run eval:homework-safety && pnpm run eval:focus-safety
```

### CI Integration

Add to your CI pipeline:

```yaml
safety-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
    - run: pnpm install
    - run: |
        cd services/ai-orchestrator
        pnpm run eval:homework-safety
        pnpm run eval:focus-safety
```

### Test Results

Results are written to:

- `eval/results/homework_helper_safety_eval.json`
- `eval/results/focus_safety_eval.json`

---

## Incident Response

### BLOCKED Response Detected

1. **Immediate**: Alert sent to #safety-alerts
2. **Review**: Check telemetry logs for context
3. **Assess**: Determine if legitimate trigger or false positive
4. **Action**:
   - If legitimate: Verify fallback message delivered
   - If false positive: Update patterns and retrain

### Direct Answer Leak

1. **Review**: Check response content
2. **Pattern Update**: Add new detection pattern
3. **Retrain**: Update agent prompt to reinforce scaffolding
4. **Test**: Run safety eval to verify fix

### Diagnostic Language Detected

1. **Review**: Check full response context
2. **Pattern Update**: Extend DIAGNOSIS_PATTERNS if needed
3. **Prompt Review**: Ensure agent instructions are clear
4. **Escalate**: If repeated, consider model fine-tuning

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        AI Orchestrator                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐    │
│  │ AiCallPipeline│───│ SafetyAgent  │───│ TelemetryStore   │    │
│  └─────────────┘    └──────────────┘    └──────────────────┘    │
│         │                  │                     │               │
│         │           ┌──────┴──────┐              │               │
│         │           │             │              │               │
│         ▼           ▼             ▼              ▼               │
│    ┌─────────┐  ┌────────┐  ┌──────────┐  ┌────────────┐        │
│    │ Provider │  │BLOCKED │  │NEEDS_    │  │ ai_call_   │        │
│    │ (OpenAI) │  │Response│  │REVIEW    │  │ logs       │        │
│    └─────────┘  └────────┘  └──────────┘  └────────────┘        │
│                      │             │              │               │
│                      ▼             ▼              ▼               │
│               ┌────────────────────────────────────────┐         │
│               │           Alerting System              │         │
│               │  ┌─────────┐ ┌─────────┐ ┌─────────┐  │         │
│               │  │ Console │ │  Slack  │ │PagerDuty│  │         │
│               │  └─────────┘ └─────────┘ └─────────┘  │         │
│               └────────────────────────────────────────┘         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Version History

| Version | Date       | Changes                           |
| ------- | ---------- | --------------------------------- |
| 1.0.0   | 2024-01-XX | Initial guardrails implementation |

---

## Contact

- **Safety Team**: safety@aivo.edu
- **On-Call**: #ops-alerts in Slack
- **Documentation**: This file + code comments
