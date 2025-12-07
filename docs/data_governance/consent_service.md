# Consent Service

Purpose-built service to manage parental/school consent with auditable state transitions for minors (COPPA/FERPA context).

## State machine

- Allowed: `PENDING → GRANTED`, `PENDING → REVOKED`, `GRANTED → REVOKED`, `GRANTED → EXPIRED`
- All other transitions are rejected (HTTP 400) and never write audit rows.

## Data model

- `consents` — one row per learner/consent type per tenant. Key fields: `status`, `granted_by_parent_id`, `granted_at`, `revoked_at`, `expires_at`.
- `consent_audit_log` — append-only log for every transition. Captures `previous_status`, `new_status`, `changed_by_user_id`, `change_reason`, and optional metadata JSON.

## API surface (JWT required, tenant-scoped)

- `GET /consents?learnerId=...&consentType=...` — list learner consents (roles: parent/teacher/district admin/platform admin/support).
- `POST /consents` — create a PENDING consent (roles: teacher/district admin/platform admin/support).
- `POST /consents/:id/grant` — move to GRANTED (roles: parent/teacher/district admin).
- `POST /consents/:id/revoke` — move to REVOKED (roles: parent/teacher/district admin).
- `POST /consents/:id/expire` — system/internal expiry (roles: platform admin/support only).

## Integration notes

- Parent app: after displaying the consent screen, call `POST /consents/:id/grant` with the parent JWT and a brief reason; store optional metadata (device, locale) in the request body to land in the audit log.
- Gateway `consent_gate` plugin: before forwarding baseline assessment or AI tutor traffic, query `GET /consents` (or a cached projection) for the learner/type; block unless status is `GRANTED` and `expires_at` is either null or in the future.

## Compliance guardrails

- Tenant isolation enforced via `tenant_id` from the JWT on every query/mutation.
- Audit log is immutable (append-only) and automatically captures actor + reason for every transition.
- Expiry is a distinct terminal state to align with time-bound parental approvals.
