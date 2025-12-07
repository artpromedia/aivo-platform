# Identity & Tenancy Threat Model (draft)

## Assets

- User identities and credentials (password hashes, refresh tokens)
- JWT access/refresh tokens and signing keys
- Tenant isolation boundaries (tenant_id scoping)
- RBAC policy assignments and audit data
- Administrative surfaces (platform admin tenant/role management)

## Trust boundaries

- External clients ↔ Fastify services
- Service ↔ Prisma/database
- Service ↔ JWT issuance/verification

## Key threats

- Stolen or replayed tokens (access/refresh) enabling cross-tenant access
- Weak password hygiene or brute-force login leading to account takeover
- Tenant confusion/mixing (missing tenant_id binding in tokens or queries)
- Missing RBAC enforcement on admin endpoints (tenant creation/updates)
- Token signing key leakage or use of incorrect public key in verification
- Lack of revocation/rotation for refresh tokens and signing keys

## Current mitigations

- JWTs are signed with RSA keypair; verification uses configured public key
- Access tokens embed `tenant_id` and `roles` for downstream authorization
- Auth middleware now requires bearer token for all non-`/auth` routes in auth-svc
- Tenant-svc middleware enforces `PLATFORM_ADMIN` on `/tenants*` routes; `/tenant/resolve` kept public
- Passwords stored as bcrypt hashes
- Vitest coverage added for registration/login flows and RBAC on tenant creation
- Guidance: use HTTP-only cookies for web apps and secure keychain/keystore storage on mobile for tokens

## Gaps / TODOs

- Add rate-limiting and lockout/backoff on login and register endpoints
- Enforce password complexity and length in auth-svc input validation
- Implement refresh-token rotation with server-side revocation list (per device) and expiry enforcement
- Add key rotation story for JWT signing keys; store keys outside app config (e.g., KMS/secret manager)
- Persist audit logs for admin actions (tenant creation/update, role changes)
- Ensure all tenant-aware DB queries scope by `tenant_id`; add automated checks/tests
- Add integration tests for `/auth/refresh` and tenant update/list endpoints under RBAC
- Add SSO (Google/Microsoft) for districts with tenant binding on assertion handling
