# @aivo/ts-policy-engine

Policy Engine library for managing global and tenant-specific policies across the Aivo platform.

## Overview

The Policy Engine provides:

- **Two-layer policy model**: Global defaults + tenant-specific overrides
- **Type-safe API**: Strongly typed policy access and validation
- **Deep merge resolution**: Tenant policies override global defaults at the key level
- **Integration hooks**: For AI orchestrator, retention jobs, and compliance systems

## Policy Scopes

- `GLOBAL` - Platform-wide default policies (only one active at a time)
- `TENANT` - Per-tenant overrides (one active per tenant)

## Policy Keys

### Safety Policies

- `safety.min_severity_for_incident` - Minimum severity to create an incident (LOW, MEDIUM, HIGH)
- `safety.blocked_content_action` - Action for blocked content (FALLBACK, REJECT)

### AI Policies

- `ai.allowed_providers` - List of allowed AI providers (OPENAI, ANTHROPIC, GEMINI)
- `ai.allowed_models` - List of allowed model names
- `ai.max_tokens_per_call` - Maximum tokens per AI call
- `ai.max_latency_ms` - Maximum acceptable latency
- `ai.fallback_provider` - Fallback provider when primary fails

### Retention Policies

- `retention.ai_call_logs_days` - Days to retain AI call logs
- `retention.session_events_days` - Days to retain session events
- `retention.homework_uploads_days` - Days to retain homework uploads
- `retention.consent_logs_days` - Days to retain consent logs

## Usage

```typescript
import { PolicyEngine } from '@aivo/ts-policy-engine';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const engine = new PolicyEngine(pool);

// Get effective policy for a tenant (merges global + tenant overrides)
const policy = await engine.getEffectivePolicy('tenant-123');

// Access typed policy values
if (policy.ai.allowed_models.includes('gpt-4o')) {
  // Model is allowed
}

// Check safety threshold
if (safetyLabel >= policy.safety.min_severity_for_incident) {
  // Create incident
}
```

## Integration Points

### AI Orchestrator

- Validates model/provider against policy before making calls
- Enforces max tokens and latency budgets
- Uses safety thresholds for incident creation

### Retention Service

- Uses policy retention windows for data lifecycle management

### Platform Admin

- UI for viewing/editing tenant policy overrides

## Schema

See `migrations/0001_policy_documents.sql` for database schema.
