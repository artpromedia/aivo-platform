# Secret Rotation Procedures

This document describes procedures for rotating secrets in the AIVO platform.

## Overview

Regular secret rotation is a security best practice. All secrets should be rotated:

- **Immediately** if compromised
- **Quarterly** for API keys and passwords
- **Annually** for encryption keys and JWT keys

## Pre-Rotation Checklist

- [ ] Schedule rotation during low-traffic period
- [ ] Ensure monitoring is active
- [ ] Have rollback plan ready
- [ ] Notify relevant team members
- [ ] Test rotation in staging first

## JWT Key Rotation

JWT keys require special handling due to token validation.

### Procedure

1. **Generate new key pair**

   ```bash
   # Generate new keys with unique ID
   NEW_KEY_ID=$(openssl rand -hex 8)
   openssl genrsa -out jwt-private-${NEW_KEY_ID}.pem 4096
   openssl rsa -in jwt-private-${NEW_KEY_ID}.pem -pubout -out jwt-public-${NEW_KEY_ID}.pem
   ```

2. **Add new public key to validation set**

   ```bash
   # Update secret to include both old and new public keys
   kubectl create secret generic jwt-keys-new \
     --from-file=JWT_PRIVATE_KEY=jwt-private-${NEW_KEY_ID}.pem \
     --from-file=JWT_PUBLIC_KEY=jwt-public-${NEW_KEY_ID}.pem \
     --from-file=JWT_PUBLIC_KEY_OLD=jwt-public-old.pem \
     --from-literal=JWT_KEY_ID=${NEW_KEY_ID} \
     -n aivo-prod --dry-run=client -o yaml | kubectl apply -f -
   ```

3. **Rolling deployment**

   ```bash
   # Restart auth service to pick up new keys
   kubectl rollout restart deployment/auth-svc -n aivo-prod
   kubectl rollout status deployment/auth-svc -n aivo-prod
   ```

4. **Wait for token expiry** (default: 15 minutes for access tokens)

5. **Remove old public key** after grace period (recommended: 24 hours)

### Rollback

```bash
# Restore previous secret
kubectl get secret jwt-keys -n aivo-prod -o yaml > jwt-keys-backup.yaml
kubectl apply -f jwt-keys-previous-backup.yaml
kubectl rollout restart deployment/auth-svc -n aivo-prod
```

## Database Password Rotation

### Procedure

1. **Create new database user/password**

   ```sql
   -- In PostgreSQL
   CREATE ROLE auth_new WITH LOGIN PASSWORD 'new_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE aivo_auth TO auth_new;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO auth_new;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO auth_new;
   ```

2. **Update Kubernetes secret**

   ```bash
   # For Google Secret Manager
   echo -n "postgresql://auth_new:new_password@host:5432/aivo_auth" | \
     gcloud secrets versions add aivo-prod-auth-database-url --data-file=-
   ```

3. **Trigger secret refresh**

   ```bash
   # If using External Secrets Operator
   kubectl annotate externalsecret database-credentials \
     force-sync=$(date +%s) -n aivo-prod
   ```

4. **Rolling restart**

   ```bash
   kubectl rollout restart deployment/auth-svc -n aivo-prod
   ```

5. **Verify connectivity**

   ```bash
   kubectl logs -l app=auth-svc -n aivo-prod --tail=50
   ```

6. **Remove old user** after verification
   ```sql
   DROP ROLE auth_old;
   ```

## API Key Rotation (OpenAI, SendGrid, Stripe)

### Procedure

1. **Generate new key** in provider's dashboard

2. **Update secret**

   ```bash
   # Google Secret Manager
   echo -n "sk-new-key" | \
     gcloud secrets versions add aivo-prod-openai-api-key --data-file=-
   ```

3. **Trigger refresh and restart**

   ```bash
   kubectl annotate externalsecret external-services \
     force-sync=$(date +%s) -n aivo-prod
   kubectl rollout restart deployment/ai-orchestrator -n aivo-prod
   ```

4. **Verify functionality**

   ```bash
   # Check logs for API errors
   kubectl logs -l app=ai-orchestrator -n aivo-prod --tail=100 | grep -i error
   ```

5. **Revoke old key** in provider's dashboard

## Redis Password Rotation

### Procedure

1. **Update Redis AUTH**

   ```bash
   # Connect to Redis and set new password
   redis-cli -h redis-host CONFIG SET requirepass "new_password"
   ```

2. **Update Kubernetes secret**

3. **Rolling restart all services** that use Redis

4. **Persist Redis config**
   ```bash
   redis-cli -h redis-host CONFIG REWRITE
   ```

## Encryption Key Rotation

⚠️ **Critical**: Encryption key rotation requires data re-encryption.

### Procedure

1. **Generate new key**

   ```bash
   NEW_KEY=$(openssl rand -hex 32)
   ```

2. **Update application to support both keys**
   - Configure OLD_ENCRYPTION_KEY and NEW_ENCRYPTION_KEY
   - Application decrypts with old, encrypts with new

3. **Run migration job**

   ```bash
   kubectl apply -f jobs/encryption-migration.yaml
   ```

4. **Verify all data migrated**

5. **Remove old key support**

## Emergency Procedures

### Compromised Secret Response

1. **Immediately rotate** the compromised secret
2. **Invalidate sessions** if auth-related
3. **Review audit logs** for unauthorized access
4. **Notify security team**
5. **Document incident**

### Commands for Emergency Rotation

```bash
# Quick JWT key rotation
./scripts/emergency-rotate-jwt.sh

# Invalidate all sessions
kubectl exec -it deployment/auth-svc -n aivo-prod -- \
  npm run invalidate-all-sessions

# Force secret sync
kubectl annotate externalsecret --all force-sync=$(date +%s) -n aivo-prod
```

## Automation

Consider implementing automated rotation using:

- Google Secret Manager automatic rotation
- HashiCorp Vault dynamic secrets
- AWS Secrets Manager rotation lambdas

## Monitoring

After rotation, monitor:

- Authentication success/failure rates
- API error rates
- Database connection errors
- Service health checks
