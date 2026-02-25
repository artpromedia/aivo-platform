# Secrets Management — AIVO Platform

## Architecture Overview

The AIVO Platform uses **HashiCorp Vault** as the centralized secrets store with **External Secrets Operator (ESO)** to sync secrets into Kubernetes.

```
┌─────────────────┐     ┌────────────────────────┐     ┌──────────────────┐
│  HashiCorp Vault │────▶│  External Secrets       │────▶│  K8s Secrets     │
│  (HA / 3 nodes) │     │  Operator (ESO)          │     │  (per-service)   │
│                 │     │                          │     │                  │
│  secret/aivo/*  │     │  ClusterSecretStore      │     │  → env vars in   │
│                 │     │  ExternalSecret per svc  │     │    pod containers │
└─────────────────┘     └────────────────────────┘     └──────────────────┘
```

### Data Flow

1. **Secrets stored in Vault** under `secret/aivo/*` (KV v2 engine)
2. **ESO polls Vault** every 1 hour (configurable per `ExternalSecret`)
3. **ESO creates/updates K8s Secrets** matching each `ExternalSecret` resource
4. **Pods read env vars** from the K8s Secret via `envFrom` — zero code changes in services

### Components

| Component | Namespace | Helm Chart | Version |
|-----------|-----------|------------|---------|
| Vault (HA) | `vault` | `hashicorp/vault` | 1.15.4 |
| ESO | `external-secrets` | `external-secrets/external-secrets` | latest |

### Vault Secret Paths

| Path | Contents |
|------|----------|
| `secret/aivo/auth` | JWT key pair, internal API key |
| `secret/aivo/database` | PostgreSQL connection URLs per database |
| `secret/aivo/redis` | Redis URL and password |
| `secret/aivo/nats` | NATS URL and token |
| `secret/aivo/stripe` | Stripe API keys + webhook secret |
| `secret/aivo/ai-providers` | OpenAI, Anthropic, Google AI keys |
| `secret/aivo/email` | SMTP credentials |
| `secret/aivo/storage` | S3 / object storage credentials |

---

## How to Add New Secrets

### 1. Add the secret to Vault

```bash
# Authenticate
export VAULT_ADDR=https://vault.vault.svc.cluster.local:8200
vault login

# Add to existing path or create new path
vault kv put secret/aivo/my-category \
  my_secret_key="my-secret-value"
```

### 2. Update the ExternalSecret manifest

Edit or create `infra/k8s/overlays/{namespace}/external-secrets/{service}.yaml`:

```yaml
  data:
    # ... existing entries ...
    - secretKey: MY_ENV_VAR_NAME
      remoteRef:
        key: secret/aivo/my-category
        property: my_secret_key
```

### 3. Apply the change

```bash
kubectl apply -f infra/k8s/overlays/aivo-staging/external-secrets/{service}.yaml
```

The ESO will sync the secret within the next refresh interval (default: 1h). To force immediate sync:

```bash
kubectl annotate externalsecret {service}-secrets -n aivo-staging \
  force-sync=$(date +%s) --overwrite
```

### 4. Verify

```bash
# Check ExternalSecret status
kubectl get externalsecret {service}-secrets -n aivo-staging

# Verify the K8s secret was created/updated
kubectl get secret {service}-secrets -n aivo-staging -o yaml
```

---

## How to Rotate Secrets

### Automatic Rotation (Database Credentials)

Database credentials use Vault's **dynamic secrets engine** with automatic rotation:

- **Default TTL**: 24 hours
- **Max TTL**: 48 hours
- Vault generates unique credentials per lease
- Credentials are automatically revoked after TTL expires
- ESO refreshes every 1 hour, picking up new credentials

No manual action needed — rotation is fully automatic.

### Manual Rotation (API Keys, JWT Keys)

For static secrets (API keys, JWT key pairs):

```bash
# 1. Update the secret in Vault
vault kv put secret/aivo/auth \
  jwt_private_key=@/path/to/new-private.pem \
  jwt_public_key=@/path/to/new-public.pem \
  jwt_expires_in="7d" \
  internal_api_key="$(openssl rand -hex 32)"

# 2. Force ESO to re-sync (optional — will happen within 1h automatically)
for svc in auth-svc api-gateway tenant-svc; do
  kubectl annotate externalsecret ${svc}-secrets -n aivo-staging \
    force-sync=$(date +%s) --overwrite
done

# 3. Restart affected pods to pick up new env vars
kubectl rollout restart deployment/auth-svc -n aivo-staging
```

### Rotation for Third-Party Keys

```bash
# Stripe
vault kv put secret/aivo/stripe \
  secret_key="sk_live_NEW_KEY" \
  publishable_key="pk_live_NEW_KEY" \
  webhook_secret="whsec_NEW_SECRET"

# AI Providers
vault kv put secret/aivo/ai-providers \
  openai_api_key="sk-NEW_KEY" \
  anthropic_api_key="sk-ant-NEW_KEY"
```

---

## Local Development Setup

Local development is **unaffected** by Vault. Services continue to read from `.env` files.

```bash
# Copy the example env file
cp services/auth-svc/.env.example services/auth-svc/.env

# Edit with your local values
# DATABASE_URL=postgresql://postgres:password@localhost:5432/aivo_auth
# JWT_PUBLIC_KEY=<paste PEM here>
# etc.
```

The precedence is:
1. Environment variables (set by K8s Secrets in production)
2. `.env` file (local development)
3. Default values in code

**Never commit `.env` files** — they are already in `.gitignore`.

---

## Emergency Procedures

### Vault Seal/Unseal

If Vault becomes sealed (e.g., after a pod restart without auto-unseal):

```bash
# Check seal status
vault status

# If sealed, unseal with Shamir key shares (need threshold keys)
vault operator unseal <key-share-1>
vault operator unseal <key-share-2>
vault operator unseal <key-share-3>
```

**Important**: Shamir unseal keys are distributed to platform administrators. A minimum of 3 out of 5 key shares are needed to unseal.

### Vault Pod Recovery

```bash
# Check Vault pod status
kubectl get pods -n vault

# If pods are in CrashLoopBackOff, check logs
kubectl logs vault-0 -n vault

# Force restart
kubectl delete pod vault-0 -n vault
```

### ESO Not Syncing

```bash
# Check ESO operator status
kubectl get pods -n external-secrets

# Check ExternalSecret sync status
kubectl get externalsecrets -n aivo-staging

# Check ESO logs for errors
kubectl logs -l app.kubernetes.io/name=external-secrets -n external-secrets

# Force resync all ExternalSecrets
kubectl get externalsecrets -n aivo-staging -o name | xargs -I{} \
  kubectl annotate {} -n aivo-staging force-sync=$(date +%s) --overwrite
```

### Fallback: Direct K8s Secrets

If Vault is completely unavailable, you can create K8s Secrets directly as a temporary measure:

```bash
# Create/update a secret directly (bypasses Vault)
kubectl create secret generic auth-svc-secrets -n aivo-staging \
  --from-literal=JWT_PUBLIC_KEY="<pem>" \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=INTERNAL_API_KEY="..." \
  --dry-run=client -o yaml | kubectl apply -f -
```

**Warning**: Direct K8s secrets will be overwritten by ESO on next sync. Only use this as an emergency measure.

---

## Audit Log Access

Vault audit logs record every operation (reads, writes, authentication attempts).

### View Audit Logs

```bash
# Audit logs are stored on the Vault audit PV
kubectl exec -n vault vault-0 -- cat /vault/audit/vault-audit.log | tail -100

# Filter for specific operations
kubectl exec -n vault vault-0 -- \
  grep '"operation":"read"' /vault/audit/vault-audit.log | \
  jq -r '[.time, .auth.display_name, .request.path] | @tsv'
```

### Audit Log Format

Each entry is a JSON object:

```json
{
  "time": "2026-02-24T10:00:00Z",
  "type": "response",
  "auth": {
    "client_token": "hmac-sha256:...",
    "accessor": "hmac-sha256:...",
    "display_name": "kubernetes-external-secrets",
    "policies": ["external-secrets-read"]
  },
  "request": {
    "id": "...",
    "operation": "read",
    "path": "secret/data/aivo/auth",
    "remote_address": "10.42.0.15"
  },
  "response": {
    "data": { "keys": ["jwt_public_key", "internal_api_key", "..."] }
  }
}
```

### Forward Audit Logs to Observability Stack

Vault audit logs can be forwarded to the Loki/Grafana stack via Promtail:

```yaml
# infra/loki/promtail-vault.yaml (example)
scrape_configs:
  - job_name: vault-audit
    static_configs:
      - targets: [localhost]
        labels:
          job: vault-audit
          __path__: /vault/audit/vault-audit.log
```

---

## CI/CD Integration

The deploy pipeline (`.github/workflows/deploy-hetzner-staging.yml`) verifies ExternalSecret sync status after deployment:

1. Checks ESO pods are running in `external-secrets` namespace
2. Verifies all ExternalSecrets in `aivo-staging` have `status.conditions[0].status == "True"`
3. Reports any out-of-sync ExternalSecrets

This runs automatically on every push to `main`.

---

## Setup Checklist

For first-time Vault + ESO setup on a new cluster:

1. [ ] Install Vault Helm chart: `helm install vault hashicorp/vault -n vault --create-namespace -f infra/helm/vault/values.yaml`
2. [ ] Initialize Vault: `vault operator init`
3. [ ] Unseal Vault (3 of 5 Shamir keys)
4. [ ] Enable KV v2: `vault secrets enable -path=secret kv-v2`
5. [ ] Seed secrets: `./scripts/vault/seed-secrets.sh`
6. [ ] Configure rotation: `./scripts/vault/rotation-policies.sh`
7. [ ] Install ESO: `helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace -f infra/helm/external-secrets/values.yaml`
8. [ ] Apply ClusterSecretStore: `kubectl apply -f infra/k8s/base/external-secrets/cluster-secret-store.yaml`
9. [ ] Generate ExternalSecrets: `./scripts/generate-external-secrets.sh`
10. [ ] Apply ExternalSecrets: `kubectl apply -f infra/k8s/overlays/aivo-staging/external-secrets/`
11. [ ] Verify sync: `kubectl get externalsecrets -n aivo-staging`
