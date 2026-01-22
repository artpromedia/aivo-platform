# Security Production Checklist

**Created**: January 2026  
**Purpose**: Document security requirements and placeholder secrets for production deployment  
**Status**: Sprint 6 - Production Hardening

## Overview

This checklist ensures all placeholder secrets are replaced with secure production values before deploying to production environments.

---

## Critical: Environment Variables That MUST Be Set

### 1. JWT Secrets

All services using JWT authentication must have secure secret keys:

**Services Affected:**

- `sync-svc`
- `research-svc`
- `realtime-svc`

**Environment Variable:**

```bash
JWT_SECRET="<REPLACE_WITH_SECURE_256_BIT_KEY>"
```

**Current Status:** ⚠️ `.env.example` files contain placeholder: `"your-jwt-secret-here"`

**Production Validation:** ✅ Services use `requireEnvInProduction()` to enforce non-placeholder values

**Action Required:**

1. Generate secure 256-bit key: `openssl rand -base64 32`
2. Store in secure secret management system (GCP Secret Manager, AWS Secrets Manager, etc.)
3. Set in production environment

---

### 2. Stripe Payment Keys

**Service:** `payments-svc`

**Environment Variables:**

```bash
STRIPE_SECRET_KEY=sk_live_<ACTUAL_KEY>
STRIPE_WEBHOOK_SECRET=whsec_<ACTUAL_WEBHOOK_SECRET>
```

**Current Status:** ⚠️ `.env.example` contains placeholder: `sk_test_YOUR_STRIPE_SECRET_KEY`

**Production Validation:** ✅ **EXCELLENT** - Custom `isPlaceholderValue()` check blocks service startup with placeholder values

- Located in: [`services/payments-svc/src/config.ts`](services/payments-svc/src/config.ts#L23-L26)
- Validates against: `sk_test_placeholder`, `whsec_placeholder`, `placeholder`, `your_key_here`, `REPLACE_ME`
- Throws startup error if placeholder detected in production

**Action Required:**

1. Obtain live keys from: https://dashboard.stripe.com/apikeys
2. Configure webhook endpoint and retrieve webhook secret
3. Store in GCP Secret Manager
4. Mount secrets in production environment

---

### 3. Admin Tokens

**Service:** `sandbox-svc`

**Environment Variable:**

```bash
ADMIN_TOKEN_SECRET=<SECURE_RANDOM_STRING>
```

**Current Status:** ⚠️ `.env.example` contains placeholder: `change-this-to-a-secure-random-string-in-production`

**Production Validation:** ⚠️ No validation detected - recommend adding validation

**Action Required:**

1. Generate secure random string: `openssl rand -base64 48`
2. Store in secret manager
3. Add startup validation similar to payments-svc

---

### 4. SIS Integration Secrets

**Service:** `sis-sync-svc`

**Environment Variables:**

```bash
CLEVER_CLIENT_SECRET=<ACTUAL_CLEVER_SECRET>
CLASSLINK_CLIENT_SECRET=<ACTUAL_CLASSLINK_SECRET>
GOOGLE_WORKSPACE_CLIENT_SECRET=<ACTUAL_GOOGLE_SECRET>
MICROSOFT_ENTRA_CLIENT_SECRET=<ACTUAL_MICROSOFT_SECRET>
```

**Current Status:** ⚠️ `.env.example` has empty strings `""`

**Production Validation:** Unknown - requires code review

**Action Required:**

1. Register OAuth applications with each provider
2. Obtain client secrets
3. Store in secret manager
4. Only enable integrations that are actively used
5. Add validation for non-empty secrets when integration is enabled

---

### 5. AWS Credentials

**Service:** `research-svc`

**Environment Variables:**

```bash
AWS_SECRET_ACCESS_KEY=<ACTUAL_AWS_SECRET>
```

**Current Status:** ⚠️ `.env.example` contains empty string `""`

**Production Validation:** ⚠️ No validation detected

**Action Required:**

1. Create IAM user with minimal required permissions
2. Generate access keys
3. Store in secret manager
4. Configure service to use IAM roles instead of access keys (recommended)

---

### 6. De-identification Salt

**Service:** `research-svc`

**Environment Variable:**

```bash
# Add this to research-svc .env.example
RESEARCH_DEIDENTIFICATION_SALT=<SECURE_RANDOM_SALT>
```

**Current Status:** ⚠️ Warning comment in `.env.example` but no actual env var

**Production Validation:** ⚠️ No validation detected

**Action Required:**

1. Generate cryptographically secure salt: `openssl rand -base64 32`
2. Store in secret manager
3. **CRITICAL**: Once set, this value must NEVER change or all de-identified data becomes irrecoverable
4. Add backup/disaster recovery plan for this secret

---

## Validation Summary

### ✅ Services with Excellent Security Validation

1. **payments-svc** (⭐ BEST PRACTICE)
   - Location: [`services/payments-svc/src/config.ts`](services/payments-svc/src/config.ts)
   - Implements: `isPlaceholderValue()`, `requireStripeKey()`
   - Blocks startup if placeholder detected in production
   - Provides helpful error messages
   - Allows placeholders in development for easier onboarding

### ⚠️ Services Needing Enhanced Validation

1. **sync-svc** - Has `requireEnvInProduction()` but could add placeholder check
2. **research-svc** - Has `requireEnvInProduction()` but could add placeholder check
3. **realtime-svc** - Needs validation review
4. **sandbox-svc** - Needs validation for ADMIN_TOKEN_SECRET
5. **sis-sync-svc** - Needs validation for OAuth client secrets

---

## Recommended Next Steps

### Phase 1: Code Hardening (Sprint 6)

- [ ] Add `isPlaceholderValue()` helper to `@aivo/ts-api-utils`
- [ ] Update all services to use placeholder validation
- [ ] Add startup checks for all critical secrets
- [ ] Create security linter rule to detect placeholder usage in config files

### Phase 2: Secret Management (Pre-Production)

- [ ] Set up GCP Secret Manager
- [ ] Generate all production secrets
- [ ] Document secret rotation policy
- [ ] Create secret backup/recovery procedures
- [ ] Set up automated secret scanning in CI/CD

### Phase 3: Production Deployment

- [ ] Mount secrets from GCP Secret Manager
- [ ] Test all services start successfully with production secrets
- [ ] Verify webhook endpoints are reachable
- [ ] Test OAuth flows for all SIS integrations
- [ ] Run security audit scan

---

## Docker Secrets Best Practices

For Docker deployments, use Docker secrets or Kubernetes secrets:

```yaml
# docker-compose.production.yml example
services:
  payments-svc:
    environment:
      - STRIPE_SECRET_KEY=/run/secrets/stripe_secret_key
    secrets:
      - stripe_secret_key

secrets:
  stripe_secret_key:
    external: true
```

---

## Monitoring & Alerting

Set up monitoring for:

1. **Secret Rotation Reminders** - Alert 30 days before secrets expire
2. **Failed Secret Access** - Alert on repeated secret retrieval failures
3. **Placeholder Detection** - Alert if placeholder detected in logs
4. **Unauthorized Access Attempts** - Monitor for suspicious API key usage

---

## Compliance Notes

- **COPPA**: JWT secrets ensure user session integrity for minors
- **FERPA**: De-identification salt protects student PII in research data
- **PCI-DSS**: Stripe webhooks require HTTPS and secret validation
- **SOC 2**: All secrets must be stored in approved secret management system

---

## References

- Stripe API Documentation: https://stripe.com/docs/api
- GCP Secret Manager: https://cloud.google.com/secret-manager/docs
- OWASP Secret Management: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

---

## Audit Log

| Date       | Action                             | Author  |
| ---------- | ---------------------------------- | ------- |
| 2026-01-20 | Initial security checklist created | Copilot |
