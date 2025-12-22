# SSO Security Audit Checklist

**Last Updated**: December 2024  
**Reviewer**: Security Team  
**Scope**: OAuth 2.0/OIDC, SAML 2.0, LTI 1.3, Session Management

This checklist is designed for auditing SSO implementations in the AIVO platform. It covers security controls required for COPPA/FERPA compliance and industry best practices.

---

## 1. OAuth 2.0 / OIDC Security

### 1.1 Authorization Flow

| Control                                                         | Status             | Notes                                                    |
| --------------------------------------------------------------- | ------------------ | -------------------------------------------------------- |
| [ ] Using Authorization Code Flow with PKCE (not Implicit Flow) | ⚠️ PKCE Missing    | `services/auth-svc/src/sso/oidc-validator.ts` lacks PKCE |
| [ ] State parameter is cryptographically random (min 32 bytes)  | ✅ Implemented     | AES-256-GCM encrypted state                              |
| [ ] State parameter is validated on callback                    | ✅ Implemented     | Validated with auth tag                                  |
| [ ] State parameter is bound to user session                    | ✅ Implemented     | Nonce included in encrypted state                        |
| [ ] State parameter expires after short time (5 minutes max)    | ✅ Implemented     | 10-minute expiry                                         |
| [ ] State parameter is single-use                               | ✅ Implemented     | Consumed on validation                                   |
| [ ] Nonce parameter used for ID token validation                | ✅ Implemented     | Validated in OIDC validator                              |
| [ ] Code verifier stored securely (not in URL or localStorage)  | ❌ Not Implemented | PKCE not implemented                                     |

### 1.2 Redirect URI Validation

| Control                                                 | Status             | Notes                      |
| ------------------------------------------------------- | ------------------ | -------------------------- |
| [ ] Exact match validation (no wildcards in production) | ❌ Missing         | No whitelist validation    |
| [ ] No open redirect vulnerabilities                    | ❌ Vulnerable      | Any valid URL accepted     |
| [ ] Redirect URIs use HTTPS only                        | ⚠️ Partial         | Only Zod URL validation    |
| [ ] No path traversal in redirect handling              | ✅ Implemented     | URL constructor normalizes |
| [ ] Registered redirect URIs stored securely            | ⚠️ Not Implemented | Per-tenant config needed   |

### 1.3 Token Security

| Control                                                 | Status           | Notes                            |
| ------------------------------------------------------- | ---------------- | -------------------------------- |
| [ ] Access tokens not exposed to frontend unnecessarily | ⚠️ Issue         | Tokens in URL params on redirect |
| [ ] Refresh tokens stored server-side only              | ✅ Implemented   | Hashed in database               |
| [ ] Tokens not logged or included in error messages     | ⚠️ Review Needed | Manual audit required            |
| [ ] Token expiry enforced                               | ✅ Implemented   | Configurable TTL                 |
| [ ] Refresh token rotation implemented                  | ✅ Implemented   | Token reuse detection            |
| [ ] Token revocation on logout                          | ✅ Implemented   | Redis blacklist                  |

### 1.4 ID Token Validation

| Control                                           | Status         | Notes                  |
| ------------------------------------------------- | -------------- | ---------------------- |
| [ ] Signature verified with provider's public key | ✅ Implemented | JWKS validation        |
| [ ] `iss` (issuer) claim validated                | ✅ Implemented | OIDC validator         |
| [ ] `aud` (audience) claim validated              | ✅ Implemented | OIDC validator         |
| [ ] `exp` (expiry) claim validated                | ✅ Implemented | OIDC validator         |
| [ ] `iat` (issued at) claim validated             | ✅ Implemented | OIDC validator         |
| [ ] `nonce` claim validated against session       | ✅ Implemented | OIDC validator         |
| [ ] `azp` claim validated if present              | ⚠️ Optional    | Not explicitly checked |

---

## 2. SAML 2.0 Security

### 2.1 Assertion Validation

| Control                                                | Status             | Notes                   |
| ------------------------------------------------------ | ------------------ | ----------------------- |
| [ ] XML signature verified                             | ⚠️ Optional        | Returns true if missing |
| [ ] Signature covers entire assertion (not just parts) | ⚠️ Unclear         | Uses regex parsing      |
| [ ] Certificate chain validated                        | ✅ Implemented     | X.509 validation        |
| [ ] Assertion encrypted (recommended)                  | ❌ Not Implemented | Plaintext assertions    |
| [ ] `Issuer` validated                                 | ✅ Implemented     | SAML validator          |
| [ ] `Audience` restriction validated                   | ✅ Implemented     | SAML validator          |
| [ ] `NotBefore` and `NotOnOrAfter` validated           | ✅ Implemented     | Timestamp validation    |
| [ ] `InResponseTo` validated against request ID        | ❌ Not Implemented | Request ID not tracked  |

### 2.2 XML Security

| Control                                          | Status             | Notes                   |
| ------------------------------------------------ | ------------------ | ----------------------- |
| [ ] XML external entity (XXE) protection enabled | ⚠️ Review Needed   | Manual audit required   |
| [ ] XML signature wrapping attack prevention     | ❌ Vulnerable      | Regex parsing           |
| [ ] DTD processing disabled                      | ⚠️ Review Needed   | Not explicitly disabled |
| [ ] Entity expansion limits enforced             | ⚠️ Review Needed   | Not explicitly limited  |
| [ ] Schema validation enabled                    | ❌ Not Implemented | No schema validation    |

### 2.3 Binding Security

| Control                                             | Status           | Notes             |
| --------------------------------------------------- | ---------------- | ----------------- |
| [ ] HTTP-POST binding used for assertions (not GET) | ⚠️ Review Needed | Check routes      |
| [ ] RelayState validated and sanitized              | ⚠️ Partial       | Basic validation  |
| [ ] HTTPS required for all endpoints                | ✅ Enforced      | Production config |

---

## 3. LTI 1.3 Security

### 3.1 Launch Validation

| Control                                                | Status         | Notes                       |
| ------------------------------------------------------ | -------------- | --------------------------- |
| [ ] JWT signature verified with platform's public key  | ✅ Implemented | JWKS validation             |
| [ ] `iss` claim validated against registered platforms | ✅ Implemented | Platform registry check     |
| [ ] `aud` claim matches our client ID                  | ✅ Implemented | JWT validator               |
| [ ] `exp` claim validated (max 1 hour)                 | ✅ Implemented | Configurable max age        |
| [ ] `iat` claim validated (not too old)                | ✅ Implemented | Clock skew tolerance        |
| [ ] `nonce` validated (not replayed)                   | ✅ Implemented | Database-backed nonce store |
| [ ] `deployment_id` validated                          | ✅ Implemented | Deployment registry         |

### 3.2 Message Security

| Control                                       | Status         | Notes               |
| --------------------------------------------- | -------------- | ------------------- |
| [ ] Deep linking response signed              | ✅ Implemented | RS256 signing       |
| [ ] Score passback uses proper authentication | ✅ Implemented | Service tokens      |
| [ ] Platform public keys cached and refreshed | ✅ Implemented | JWKS cache with TTL |

---

## 4. Session Security

### 4.1 Session Management

| Control                                                   | Status             | Notes                    |
| --------------------------------------------------------- | ------------------ | ------------------------ |
| [ ] Sessions are server-side (not JWT-only)               | ✅ Implemented     | Database sessions        |
| [ ] Session ID is cryptographically random (min 128 bits) | ✅ Implemented     | UUID v4                  |
| [ ] Session ID regenerated on authentication              | ❌ Not Implemented | Missing regeneration     |
| [ ] Session ID regenerated on privilege change            | ❌ Not Implemented | Missing regeneration     |
| [ ] Session timeout enforced (idle and absolute)          | ✅ Implemented     | 7-day max, idle tracking |
| [ ] Concurrent session limits enforced                    | ⚠️ Configurable    | Per-tenant setting       |
| [ ] Session invalidation on password change               | ✅ Implemented     | Revokes all sessions     |

### 4.2 Cookie Security

| Control                                  | Status             | Notes                         |
| ---------------------------------------- | ------------------ | ----------------------------- |
| [ ] `HttpOnly` flag set                  | ✅ Implemented     | All session cookies           |
| [ ] `Secure` flag set (HTTPS only)       | ⚠️ Prod Only       | Development allows HTTP       |
| [ ] `SameSite=Strict` or `SameSite=Lax`  | ✅ Implemented     | Lax default, Strict for admin |
| [ ] Cookie scope limited (path, domain)  | ✅ Implemented     | Scoped to service             |
| [ ] No sensitive data in cookies         | ✅ Implemented     | Only session IDs              |
| [ ] `__Host-` or `__Secure-` prefix used | ❌ Not Implemented | Enhancement needed            |

### 4.3 CSRF Protection

| Control                                                | Status             | Notes                   |
| ------------------------------------------------------ | ------------------ | ----------------------- |
| [ ] CSRF tokens on all state-changing operations       | ⚠️ Partial         | SameSite relied upon    |
| [ ] CSRF tokens bound to session                       | ⚠️ Partial         | Nonce in state          |
| [ ] Double-submit cookie pattern or synchronizer token | ❌ Not Implemented | No explicit CSRF tokens |
| [ ] `SameSite` cookie attribute as defense-in-depth    | ✅ Implemented     | Primary defense         |

---

## 5. Account Security

### 5.1 Account Linking

| Control                                        | Status           | Notes                   |
| ---------------------------------------------- | ---------------- | ----------------------- |
| [ ] Email verification required before linking | ✅ Implemented   | Email verification flow |
| [ ] Confirmation required for account linking  | ⚠️ Review Needed | UX flow check           |
| [ ] Rate limiting on link attempts             | ✅ Implemented   | Account lockout         |
| [ ] Audit logging for account linking          | ✅ Implemented   | Audit events            |

### 5.2 Account Takeover Prevention

| Control                                      | Status           | Notes                     |
| -------------------------------------------- | ---------------- | ------------------------- |
| [ ] Email change requires verification       | ✅ Implemented   | Re-verification required  |
| [ ] SSO unlinking requires re-authentication | ⚠️ Review Needed | Check flow                |
| [ ] Suspicious login detection               | ⚠️ Basic         | New device detection      |
| [ ] Account lockout on failed attempts       | ✅ Implemented   | 5 attempts, 15 min window |

---

## 6. Logging & Monitoring

### 6.1 Security Logging

| Control                                 | Status           | Notes                   |
| --------------------------------------- | ---------------- | ----------------------- |
| [ ] All authentication events logged    | ✅ Implemented   | Auth events published   |
| [ ] Failed attempts logged with details | ✅ Implemented   | Includes IP, user agent |
| [ ] Successful logins logged            | ✅ Implemented   | With session metadata   |
| [ ] Session creation/destruction logged | ✅ Implemented   | Lifecycle events        |
| [ ] Token issuance logged               | ⚠️ Review Needed | May need enhancement    |
| [ ] Logs don't contain secrets/tokens   | ⚠️ Review Needed | Manual audit required   |

### 6.2 Alerting

| Control                                | Status           | Notes                  |
| -------------------------------------- | ---------------- | ---------------------- |
| [ ] Alert on brute force attempts      | ✅ Implemented   | Account lockout alerts |
| [ ] Alert on unusual login patterns    | ⚠️ Basic         | Device change only     |
| [ ] Alert on token theft indicators    | ⚠️ Partial       | Reuse detection        |
| [ ] Alert on SSO configuration changes | ⚠️ Review Needed | Audit trail exists     |

---

## 7. Compliance Controls (COPPA/FERPA)

### 7.1 COPPA Requirements

| Control                                        | Status           | Notes           |
| ---------------------------------------------- | ---------------- | --------------- |
| [ ] Parental consent verification for under-13 | ⚠️ App Layer     | Consent service |
| [ ] Age-gating on registration                 | ⚠️ App Layer     | Profile service |
| [ ] No behavioral tracking without consent     | ⚠️ Review Needed | Analytics audit |

### 7.2 FERPA Requirements

| Control                                        | Status         | Notes          |
| ---------------------------------------------- | -------------- | -------------- |
| [ ] Educational records access logging         | ✅ Implemented | Audit trail    |
| [ ] School official access controls            | ✅ Implemented | RBAC           |
| [ ] Legitimate educational interest validation | ⚠️ Policy      | Business rules |

---

## 8. Provider-Specific Checks

### 8.1 Google OAuth

| Control                                        | Status           | Notes                |
| ---------------------------------------------- | ---------------- | -------------------- |
| [ ] `hd` claim validated for Workspace domains | ⚠️ Review Needed | Check implementation |
| [ ] `email_verified` claim checked             | ✅ Implemented   | OIDC validator       |

### 8.2 Microsoft Azure AD / Entra ID

| Control                                   | Status           | Notes                |
| ----------------------------------------- | ---------------- | -------------------- |
| [ ] `tid` claim validated for tenant      | ⚠️ Review Needed | Check implementation |
| [ ] Supports both v1.0 and v2.0 endpoints | ⚠️ Review Needed | Configuration check  |

### 8.3 Clever

| Control                            | Status           | Notes            |
| ---------------------------------- | ---------------- | ---------------- |
| [ ] District-based access controls | ⚠️ Review Needed | Tenant mapping   |
| [ ] Student data scope limited     | ⚠️ Review Needed | Permission check |

### 8.4 ClassLink

| Control                        | Status           | Notes          |
| ------------------------------ | ---------------- | -------------- |
| [ ] Roster sync security       | ⚠️ Review Needed | SIS sync audit |
| [ ] OneClick launch validation | ⚠️ Review Needed | LTI audit      |

---

## 9. Critical Findings Summary

### 🔴 Critical (Fix Immediately)

1. **SAML Signature Validation Optional** - `services/auth-svc/src/sso/saml-validator.ts` returns `true` when signature is missing
2. **Hardcoded Encryption Keys** - Multiple fallback secrets in SSO state and JWT config
3. **Open Redirect Vulnerability** - No redirect URI whitelist in SSO callback

### 🟠 High Priority (Fix This Sprint)

4. **PKCE Not Implemented** - Authorization code flow vulnerable to interception
5. **Tokens in URL Parameters** - Access tokens leaked via Referer headers
6. **SAML XML Parsing** - Regex-based parsing vulnerable to manipulation
7. **Session Not Regenerated** - Session fixation possible

### 🟡 Medium Priority (Fix This Quarter)

8. **In-Memory State Storage** - Won't scale with multiple instances
9. **Missing CSRF Tokens** - Relies solely on SameSite cookies
10. **InResponseTo Not Validated** - SAML response replay possible

### 🟢 Low Priority (Backlog)

11. **Cookie Prefixes** - Add `__Host-` prefix for additional security
12. **HS256 in Embedded Tools** - Migrate to RS256

---

## 10. Audit Sign-Off

| Role               | Name | Date | Signature |
| ------------------ | ---- | ---- | --------- |
| Security Lead      |      |      |           |
| Engineering Lead   |      |      |           |
| Compliance Officer |      |      |           |

---

## Appendix A: File References

| Component      | File Path                                          |
| -------------- | -------------------------------------------------- |
| OIDC Validator | `services/auth-svc/src/sso/oidc-validator.ts`      |
| SAML Validator | `services/auth-svc/src/sso/saml-validator.ts`      |
| SSO State      | `services/auth-svc/src/sso/state.ts`               |
| SSO Service    | `services/auth-svc/src/sso/service.ts`             |
| SSO Routes     | `services/auth-svc/src/sso/routes.ts`              |
| LTI Validator  | `services/lti-svc/src/validators/jwt-validator.ts` |
| LTI Launch     | `services/lti-svc/src/launch-service.ts`           |
| Auth Service   | `services/auth-svc/src/services/auth.service.ts`   |
| JWT (Shared)   | `libs/ts-shared/src/auth/jwt.ts`                   |
| SIS OAuth      | `services/sis-sync-svc/src/oauth/`                 |

## Appendix B: Related Documentation

- [Authentication Architecture](../authentication.md)
- [SSO Integration Guide](../platform/sso-integration.md)
- [LTI Integration Guide](../platform/lti-integration.md)
- [Security Incident Response](./incident-response.md)
