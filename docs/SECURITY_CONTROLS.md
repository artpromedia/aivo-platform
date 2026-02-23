# AIVO Platform — Security Controls Documentation

> Technical security controls reference for enterprise procurement, SOC 2 audits,
> and compliance reviews. Last updated: 2026-02-23.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Multi-Factor Authentication (MFA)](#2-multi-factor-authentication-mfa)
3. [Session Management](#3-session-management)
4. [Transport Security](#4-transport-security)
5. [CSRF Protection](#5-csrf-protection)
6. [Secrets Management](#6-secrets-management)
7. [Audit Logging](#7-audit-logging)
8. [Encryption](#8-encryption)
9. [Input Validation](#9-input-validation)
10. [Rate Limiting](#10-rate-limiting)
11. [Multi-Tenancy Isolation](#11-multi-tenancy-isolation)
12. [Dependency Management](#12-dependency-management)
13. [Penetration Testing](#13-penetration-testing)
14. [Incident Response](#14-incident-response)

---

## 1. Authentication

| Control | Detail |
|---------|--------|
| **Algorithm** | RS256 (RSA-2048 asymmetric) |
| **Access Token TTL** | 15 minutes |
| **Refresh Token TTL** | 7 days (single-use, rotated on each refresh) |
| **Key Rotation** | Every 90 days, automated via `jwt-rotation.service.ts` |
| **Grace Period** | Previous public key retained for 24 hours after rotation (in-flight token support) |
| **Password Storage** | bcrypt, cost factor 12 |
| **Account Lockout** | 5 failed attempts → 15-minute lockout |
| **Password Requirements** | Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 digit |

### Token Flow

```
Client → POST /auth/login → { accessToken (15m), refreshToken (7d) }
Client → POST /auth/refresh → { newAccessToken, newRefreshToken }
         (old refreshToken is invalidated)
```

---

## 2. Multi-Factor Authentication (MFA)

| Control | Detail |
|---------|--------|
| **Protocol** | TOTP (RFC 6238) |
| **Algorithm** | SHA-1 (per RFC), 6-digit codes, 30-second window |
| **Backup Codes** | 10 single-use codes generated at enrollment |
| **Code Encryption** | TOTP secrets encrypted at rest with AES-256-GCM |
| **Enforcement** | Optional per-user; can be mandated per-tenant by district admins |
| **Recovery** | Backup codes → admin reset flow |

---

## 3. Session Management

| Control | Detail |
|---------|--------|
| **Storage** | Redis (server-side session state) |
| **Session ID** | 256-bit cryptographically random token |
| **Per-Device** | Each device/browser gets a separate session |
| **Revocation** | Individual session revocation + "revoke all" |
| **Idle Timeout** | 30 minutes of inactivity |
| **Absolute Timeout** | 24 hours |
| **Cookie Flags** | `HttpOnly`, `Secure` (production), `SameSite=Strict` |

---

## 4. Transport Security

| Control | Detail |
|---------|--------|
| **TLS Version** | TLS 1.2+ required (1.3 preferred) |
| **HSTS** | `Strict-Transport-Security: max-age=31536000; includeSubDomains` |
| **Certificate** | Let's Encrypt (auto-renewed) via cert-manager in K8s |
| **Internal Traffic** | mTLS between services via service mesh (planned) |
| **Cipher Suites** | Modern cipher suites only; RC4, DES, 3DES disabled |

---

## 5. CSRF Protection

| Control | Detail |
|---------|--------|
| **Pattern** | Double-Submit Cookie |
| **Implementation** | `GET /auth/csrf-token` → sets `__csrf` cookie + returns token in JSON body |
| **Validation** | All POST/PUT/PATCH/DELETE requests must include `X-CSRF-Token` header matching the `__csrf` cookie |
| **Comparison** | Constant-time (`crypto.timingSafeEqual`) to prevent timing attacks |
| **Cookie Flags** | `SameSite=Strict`, `Secure` (production), NOT `HttpOnly` (must be readable by JS) |
| **Exemptions** | SCIM (Bearer auth), Webhooks (HMAC signature), SSO callbacks (IdP-initiated), Health probes |
| **Token Lifetime** | 1 hour |

---

## 6. Secrets Management

| Control | Detail |
|---------|--------|
| **Production** | Kubernetes Secrets, mounted as environment variables or volumes |
| **JWT Keys** | RSA key pair mounted at `/secrets/jwt/` from `jwt-keys` K8s Secret |
| **Rotation** | JWT keys rotated every 90 days; other secrets rotated per policy |
| **Validation** | Zod schema validation at startup (`@aivo/env-validation/secrets-loader`) |
| **Source Code** | No secrets in source code or container images — validated in CI |
| **Local Dev** | `.env` files (git-ignored), generated dummy keys via `scripts/generate-keys.sh` |
| **Sealed Secrets** | Production values encrypted with Bitnami Sealed Secrets (planned) |

### Secret Inventory

| Secret | Service | Rotation Frequency |
|--------|---------|-------------------|
| JWT Private Key | auth-svc | 90 days |
| JWT Public Key | auth-svc, all verifiers | 90 days |
| Cookie Secret | auth-svc | On compromise |
| Database URL | All backend services | On credential rotation |
| Internal API Key | Service-to-service | Quarterly |
| SSO State Key | auth-svc | On compromise |
| MFA Encryption Key | auth-svc | On compromise |

---

## 7. Audit Logging

| Control | Detail |
|---------|--------|
| **Service** | Dedicated `audit-svc` (port 4050) |
| **Storage** | Append-only PostgreSQL table with immutability triggers |
| **Retention** | 7 years (FERPA requirement for educational records) |
| **Events Logged** | Login, logout, failed auth, password change, MFA enrollment, data access, admin actions, SCIM sync, SSO sessions |
| **Fields** | Timestamp, actor ID, tenant ID, action, resource, IP, user-agent, result |
| **Integrity** | SHA-256 chain hash linking sequential audit records |
| **Access** | Read-only for compliance team; no delete API |

---

## 8. Encryption

### In Transit

- TLS 1.2+ for all external traffic
- Internal service communication over cluster network (mTLS planned)

### At Rest

- PostgreSQL: transparent encryption at the storage layer (cloud provider or LUKS)
- Redis: in-memory only; persistence encrypted at disk level
- File uploads: S3-compatible storage with server-side encryption (SSE-S3)
- MFA TOTP secrets: AES-256-GCM application-level encryption

---

## 9. Input Validation

| Control | Detail |
|---------|--------|
| **Schema** | Zod validation on all API request bodies |
| **SQL** | Parameterized queries via Prisma ORM (no raw SQL interpolation) |
| **XSS** | Output encoding by default (React/Flutter); CSP headers |
| **File Upload** | Type allowlist, size limits (10 MB), ClamAV scanning (planned) |
| **Content Safety** | 4-layer AI output safety pipeline (see Sprint A2) |

---

## 10. Rate Limiting

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| `/auth/login` | 5 requests | 1 minute |
| `/auth/register` | 3 requests | 1 minute |
| `/auth/forgot-password` | 3 requests | 5 minutes |
| `/auth/mfa/*` | 5 requests | 1 minute |
| General API | 100 requests | 1 minute |
| AI endpoints | 60 requests | 1 minute |
| File uploads | 10 requests | 5 minutes |

Rate limit state is stored in Redis. Headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` are returned.

---

## 11. Multi-Tenancy Isolation

| Control | Detail |
|---------|--------|
| **Data Isolation** | `tenantId` column on all tenant-scoped tables; enforced at ORM query layer |
| **Row-Level Security** | PostgreSQL RLS policies (planned — currently ORM-enforced) |
| **Token Scoping** | JWT `tenantId` claim; verified on every request |
| **Cross-Tenant** | Impossible via API — tenant context is server-derived, never client-provided for data queries |
| **Admin** | Platform admins can access cross-tenant data via dedicated admin endpoints with full audit trail |

---

## 12. Dependency Management

| Control | Detail |
|---------|--------|
| **Scanning** | Dependabot (GitHub), Snyk (CI pipeline) |
| **Lock Files** | `pnpm-lock.yaml` committed; reproducible builds |
| **Update Cadence** | Security patches: same day; minor updates: weekly; major: quarterly |
| **Container Scanning** | Trivy scan on Docker images in CI |
| **SBOM** | Generated per release (planned — CycloneDX format) |

---

## 13. Penetration Testing

| Item | Detail |
|------|--------|
| **Internal** | Quarterly automated scans (OWASP ZAP) |
| **External** | Annual third-party pen test |
| **Scope** | Authentication, authorization, API security, data isolation |
| **Contact** | security@aivo.com for pen test coordination |

---

## 14. Incident Response

| Phase | Action | SLA |
|-------|--------|-----|
| **Detection** | Automated alerting via audit log anomalies + uptime monitoring | — |
| **Triage** | Assess severity using CVSS v3.1 | 2 hours |
| **Containment** | Isolate affected service, revoke compromised credentials | 4 hours |
| **Eradication** | Deploy fix, rotate all affected secrets | 24 hours (Critical) |
| **Notification** | Notify affected tenants per breach notification obligations | 72 hours |
| **Post-Mortem** | Root cause analysis + remediation plan | 7 days |

---

## Contact

For security questions, audits, or compliance inquiries:

**Email:** security@aivo.com
**Response SLA:** 1–2 business days
