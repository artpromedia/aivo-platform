# Web District

Next.js app for district administrators.

## Auth prerequisites

- Set `AUTH_PUBLIC_KEY` (PEM) so the app can verify access tokens stored in `aivo_access_token` cookie.
- Ensure district admins receive JWTs with roles that include `DISTRICT_ADMIN`; these are forwarded to consent-svc for aggregates.

## Privacy page integration

- Configure `CONSENT_SVC_URL` to point at consent-svc (default `http://localhost:4004`).
- Optional: `PRIVACY_AGGREGATES_MOCK=true` renders stub aggregates when backend is unavailable.
- `PRIVACY_POLICY_URL` controls the link surfaced to admins and parents; default `/privacy-policy` within this app.

## Running

- `pnpm --filter @aivo/web-district dev`
- Build: `pnpm --filter @aivo/web-district build`
