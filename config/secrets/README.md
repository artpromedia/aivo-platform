# Secrets Directory

This directory contains sensitive configuration files that should **NEVER** be committed to version control.

## Contents

After running `scripts/generate-secrets.sh`, this directory will contain:

- `jwt-private.pem` - RSA private key for signing JWTs
- `jwt-public.pem` - RSA public key for verifying JWTs
- `local.env` - Auto-generated secrets for local development

## Security Guidelines

### Local Development

1. Run `./scripts/generate-secrets.sh` to generate development secrets
2. Never share or commit these files
3. Regenerate if compromised

### Staging/Production

Secrets are managed via:

- **Google Secret Manager** for GCP deployments
- **Kubernetes Secrets** for runtime configuration
- **HashiCorp Vault** for advanced secret management (optional)

## File Permissions

Ensure proper permissions on sensitive files:

```bash
chmod 600 jwt-private.pem
chmod 644 jwt-public.pem
chmod 600 local.env
```

## Regenerating Secrets

To regenerate all secrets:

```bash
# Backup existing (if needed)
cp local.env local.env.backup

# Generate new secrets
./scripts/generate-secrets.sh
```

## Secret Rotation

For production environments, rotate secrets regularly:

1. Generate new secrets
2. Update in Secret Manager/Kubernetes
3. Deploy with new secrets
4. Verify functionality
5. Remove old secrets after grace period (24-48 hours)

## Emergency Procedures

If secrets are compromised:

1. **Immediately** rotate affected secrets
2. Invalidate all existing sessions (for JWT keys)
3. Review access logs for unauthorized usage
4. Update all deployment environments
5. Notify security team
