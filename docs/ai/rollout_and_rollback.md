# AI Agent Rollout and Rollback

## Rollout Strategy

- Multiple active configs per agent are allowed.
- Each config has `rollout_percentage`; selection is deterministic via hashing a rollout key.
- Rollout key defaults to `learnerId`, else `tenantId`, else a stable fallback.
- Percentages over 100 are normalized; a warning is emitted.

## Rollback Procedure

1. Set the target config `rollout_percentage` to `0`.
2. Optionally set `is_active=false` to fully disable.
3. Verify via `GET /internal/ai/configs/rollout-plan?agentType=...`.
4. Monitor after rollback:
   - Error rate and latency.
   - Safety status (`BLOCKED`/`NEEDS_REVIEW`).
   - Token/cost spikes.
5. Re-enable gradually by restoring rollout percentage.

## Recommended Monitoring Thresholds

- Error rate increase > 2x baseline over 5–10 minutes.
- Safety violations > 0.5–1% of calls.
- Latency p95 > 2x baseline.
- Cost spike > 2x expected per-call cost.

## Fast Disable Endpoint

- `POST /internal/ai/configs/:id/disable` (internal API key required)
  - Sets `rollout_percentage` to 0 and `is_active` to false.

## Notes

- Rollout selection is deterministic; no randomness.
- Avoid storing prompts/responses in telemetry; only metrics are stored.
