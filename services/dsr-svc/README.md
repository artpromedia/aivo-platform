# dsr-svc

Service for parent-facing Data Subject Rights (DSR) requests (export + delete/anonymize) for consumer tenants.

## Running locally

- `pnpm install --filter @aivo/dsr-svc...`
- Apply migrations (create `dsr_requests` table plus domain tables the service reads: `learners`, `assessments`, `sessions`, `events`, `recommendations`, `subscriptions`).
- `pnpm --filter @aivo/dsr-svc dev` to start with live reload; `pnpm --filter @aivo/dsr-svc test` to run the Vitest suite.

## API surface (Fastify)

- `POST /dsr/requests` (PARENT): create DSR. Body: `{ learnerId, requestType: 'EXPORT'|'DELETE', reason? }`. Performs synchronous export or deletion and returns the updated request plus export payload for EXPORT.
- `GET /dsr/requests` (PARENT): list own DSR requests.
- `GET /dsr/requests/:id` (PARENT): fetch a request; EXPORT responses include the stored export payload when available.
- `PATCH /dsr/requests/:id` (PLATFORM_ADMIN|SUPPORT): mark as `DECLINED` with a reason (stub for future back-office workflows).

## Export behavior

- Only allowed learner fields are exported (first/last name, grade_level, status, timestamps). Contact info (`email`, `phone`, `zip_code`) is intentionally excluded.
- Events metadata is stripped of raw payload and actor identifiers before returning.
- Export JSON is stored in `dsr_requests.export_location` for auditing/re-download.

## Delete/anonymize behavior

- Learner: `first_name`, `last_name`, `email`, `phone`, `zip_code` nulled; `status` set to `DELETED`; `deleted_at` stamped.
- Events: `metadata` nulled (retain record for aggregate counts).
- Sessions: `summary` nulled to drop free-text identifiers.
- Recommendations: `rationale` nulled (content kept for aggregate reporting).
- Referential records remain to preserve aggregates and retention dashboards while removing direct identifiers.

## Ops runbook (consumer tenants)

1. Verify parent-child link via `subscriptions` before approving a request.
2. Run `POST /dsr/requests` as the parent for EXPORT or DELETE; the service processes synchronously for small datasets.
3. For edge cases/denials (e.g., contractual blocks), set `DECLINED` via `PATCH /dsr/requests/:id` with a reason and communicate to the requester.
4. Archive export artifacts securely if exported data must be delivered out-of-band (they are JSON payloads stored in `export_location`).
