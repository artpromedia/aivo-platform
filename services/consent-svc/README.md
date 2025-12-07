# consent-svc

Consent service for COPPA/FERPA-style parental and school consent management. Provides a small FSM with immutable audit logging and REST endpoints secured via JWT + RBAC.

## FSM

- `PENDING → GRANTED`
- `PENDING → REVOKED`
- `GRANTED → REVOKED`
- `GRANTED → EXPIRED`

Any other transition is rejected with HTTP 400.

## Database

See `migrations/0001_create_consents.sql` for the schema of `consents` and `consent_audit_log` (immutable append-only entries for every state change).

## API (all routes require Bearer JWT)

- `GET /consents?learnerId=...` — list consents for a learner (role: parent, teacher, district/platform admin, support)
- `POST /consents` — create a new PENDING consent (role: teacher, district/platform admin, support)
- `POST /consents/:id/grant` — transition to GRANTED (role: parent, teacher, district/platform admin)
- `POST /consents/:id/revoke` — transition to REVOKED (role: parent, teacher, district/platform admin)
- `POST /consents/:id/expire` — internal/system expire (role: platform admin or support)

All operations are tenant-scoped using `tenant_id` from the JWT.

## Integration hints

- Parent app: after displaying the consent screen, call `POST /consents/:id/grant` with the parent's token; include a short reason (e.g., "parent accepted baseline assessment").
- Gateway plugin (`consent_gate`): cache or query `GET /consents?learnerId=...&consentType=...` before allowing baseline assessment or AI tutor requests; block if not `GRANTED`.

## Running locally

```bash
pnpm --filter @aivo/consent-svc install
pnpm --filter @aivo/consent-svc dev
```

Required env vars:

- `DATABASE_URL` (default: `postgres://postgres:postgres@localhost:5432/aivo`)
- `JWT_PUBLIC_KEY` or `JWT_PUBLIC_KEY_PATH`
- `PGSSL` (set to `true` to enable TLS)
