#!/usr/bin/env python3
"""
Phase 4+5: Deploy AIVO Services to Hetzner K3s Cluster
=======================================================
1. Create aivo-prod namespace
2. Label nodes (app role for app1/app2)
3. Create GHCR image pull secret
4. Generate JWT RSA keys
5. Create all K8s secrets (real DB creds + placeholder API keys)
6. Set up cert-manager ClusterIssuer
7. Apply Kustomize overlay (creates all deployments + services)

Run from: Windows dev machine (SSH to app1 for kubectl)
"""

import paramiko
import json
import secrets
import base64
import textwrap
import time

# â”€â”€ Server credentials â”€â”€
APP1 = {"host": "95.216.245.40", "user": "root", "password": "2R2ht?gALF7%L%"}
DB1  = {"host": "95.217.76.42",  "user": "root", "password": "Ebmx9V_r?a38NM"}

# â”€â”€ Load generated credentials â”€â”€
with open("scripts/hetzner/credentials.json") as f:
    creds = json.load(f)

PG_PASSWORD = creds["postgres_app_password"]
REDIS_PASSWORD = creds["redis_password"]
MINIO_PASSWORD = creds["minio_password"]

# â”€â”€ Database mapping (service â†’ database name) â”€â”€
# These are the 18 services in the base K8s manifests
SERVICE_DB_MAP = {
    "auth-svc":             "aivo_auth",
    "session-svc":          "aivo_sessions",
    "consent-svc":          "aivo_consent",
    "profile-svc":          "aivo_profiles",
    "content-svc":          "aivo_content",
    "assessment-svc":       "aivo_assessment",
    "personalization-svc":  "aivo_personalization",
    "life-skills-svc":      "aivo_life_skills",
    "ai-orchestrator":      "aivo",
    "analytics-svc":        "aivo_analytics",
    "notify-svc":           "aivo_notify",
    "messaging-svc":        "aivo_messaging",
    "goal-svc":             "aivo_goals",
    "focus-svc":            None,  # stateless
    "billing-svc":          "aivo_billing",
    "payments-svc":         "aivo_billing",  # shares with billing
    "parent-svc":           "aivo_parent",
    "baseline-svc":         "aivo_baseline",
}


def run_on_app1(cmd, timeout=60):
    """Run command on app1 (K3s server) via SSH."""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(APP1["host"], username=APP1["user"], password=APP1["password"], timeout=20)
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        return out, err
    finally:
        ssh.close()


def kubectl(cmd, timeout=60):
    """Run kubectl command on app1."""
    return run_on_app1(f"KUBECONFIG=/root/.kube/config kubectl {cmd}", timeout=timeout)


def helm(cmd, timeout=120):
    """Run helm command on app1."""
    return run_on_app1(f"KUBECONFIG=/root/.kube/config helm {cmd}", timeout=timeout)


def generate_hex(n=32):
    """Generate random hex string."""
    return secrets.token_hex(n)


def generate_password(n=32):
    """Generate safe password (no special shell chars)."""
    alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return ''.join(secrets.choice(alphabet) for _ in range(n))


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
print("=" * 70)
print("PHASE 4+5: DEPLOY AIVO SERVICES TO HETZNER K3s")
print("=" * 70)

# â”€â”€ Step 1: Create namespace â”€â”€
print("\nðŸ“¦ Step 1: Creating aivo-prod namespace...")
out, err = kubectl("create namespace aivo-prod --dry-run=client -o yaml | KUBECONFIG=/root/.kube/config kubectl apply -f -")
print(f"  {out or err}")

# â”€â”€ Step 2: Label nodes â”€â”€
print("\nðŸ·ï¸  Step 2: Labeling nodes...")
for node, role in [("aivo-app1", "app"), ("aivo-app2", "app"), ("aivo-db1", "database")]:
    out, err = kubectl(f"label node {node} role={role} --overwrite")
    print(f"  {node}: role={role} â†’ {out or err}")

# â”€â”€ Step 3: GHCR pull secret â”€â”€
print("\nðŸ” Step 3: Creating GHCR pull secret (placeholder)...")
# Create a placeholder - user will update with real GitHub PAT
ghcr_config = base64.b64encode(json.dumps({
    "auths": {
        "ghcr.io": {
            "auth": base64.b64encode(b"github-user:ghp_placeholder").decode()
        }
    }
}).encode()).decode()

out, err = kubectl(f"""apply -f - <<'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-pull-secret
  namespace: aivo-prod
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: {ghcr_config}
EOF""")
print(f"  {out or err}")
print("  âš ï¸  NOTE: Update with real GitHub PAT using:")
print("     kubectl -n aivo-prod create secret docker-registry ghcr-pull-secret \\")
print("       --docker-server=ghcr.io --docker-username=<GITHUB_USER> --docker-password=<GITHUB_PAT>")

# â”€â”€ Step 4: Generate JWT RSA keys â”€â”€
print("\nðŸ”‘ Step 4: Generating JWT RSA key pair...")
out, err = run_on_app1("""
openssl genrsa -out /tmp/jwt-private.pem 2048 2>/dev/null && \
openssl rsa -in /tmp/jwt-private.pem -pubout -out /tmp/jwt-public.pem 2>/dev/null && \
echo "KEYS_GENERATED"
""")
print(f"  {out}")

jwt_private, _ = run_on_app1("cat /tmp/jwt-private.pem")
jwt_public, _ = run_on_app1("cat /tmp/jwt-public.pem")
print(f"  Private key: {len(jwt_private)} bytes")
print(f"  Public key:  {len(jwt_public)} bytes")

# â”€â”€ Step 5: Generate additional secrets â”€â”€
print("\nðŸ”‘ Step 5: Generating encryption keys...")
sso_key = generate_hex(16)
mfa_key = generate_hex(16)
jwt_secret = generate_password(32)
internal_api_key = generate_password(48)
print(f"  SSO encryption key: {sso_key[:8]}...")
print(f"  MFA encryption key: {mfa_key[:8]}...")
print(f"  JWT secret (billing): {jwt_secret[:8]}...")
print(f"  Internal API key: {internal_api_key[:8]}...")

# â”€â”€ Step 6: Create all K8s secrets â”€â”€
print("\nðŸ” Step 6: Creating K8s secrets in aivo-prod...")

# Escape special characters in password for shell usage
def shell_escape(s):
    """Escape string for use in shell heredoc."""
    return s.replace("\\", "\\\\").replace("'", "'\\''")

# 6a. shared-secrets
redis_url = f"redis://:{REDIS_PASSWORD}@10.0.0.1:6379"
nats_url = ""  # NATS not installed yet
session_svc_url = "http://session-svc.aivo-prod.svc.cluster.local:3000"

shared_yaml = f"""apiVersion: v1
kind: Secret
metadata:
  name: shared-secrets
  namespace: aivo-prod
type: Opaque
stringData:
  redis-url: "{shell_escape(redis_url)}"
  nats-url: "{nats_url}"
  session-svc-url: "{session_svc_url}"
  postgres-host: "10.0.0.1"
  postgres-port: "6432"
  postgres-user: "aivo_app"
  postgres-password: "{shell_escape(PG_PASSWORD)}"
"""
out, err = kubectl(f"apply -f - <<'ENDOFYAML'\n{shared_yaml}\nENDOFYAML")
print(f"  shared-secrets: {out or err}")

# 6b. Per-service secrets with database URLs
for svc, db_name in SERVICE_DB_MAP.items():
    if db_name is None:
        # Stateless service (focus-svc) â€” create with empty database-url
        db_url = ""
    else:
        db_url = f"postgresql://aivo_app:{PG_PASSWORD}@10.0.0.1:6432/{db_name}?schema=public"
    
    secret_name = f"{svc}-secrets"
    
    # Build extra keys for special services
    extra_data = ""
    if svc == "auth-svc":
        # Escape the PEM keys â€” replace newlines for YAML
        priv_escaped = jwt_private.replace("\\", "\\\\")
        pub_escaped = jwt_public.replace("\\", "\\\\")
        extra_data = f"""  jwt-private-key: |-
    {chr(10).join('    ' + line if i > 0 else line for i, line in enumerate(jwt_private.split(chr(10))))}
  jwt-public-key: |-
    {chr(10).join('    ' + line if i > 0 else line for i, line in enumerate(jwt_public.split(chr(10))))}
  sso-state-encryption-key: "{sso_key}"
  mfa-encryption-key: "{mfa_key}"
"""
    elif svc == "billing-svc":
        extra_data = f"""  jwt-secret: "{jwt_secret}"
  stripe-secret-key: "sk_test_REDACTED"
  stripe-publishable-key: "pk_test_REDACTED"
  stripe-webhook-secret: "whsec_PLACEHOLDER"
"""
    elif svc == "ai-orchestrator":
        extra_data = f"""  internal-api-key: "{internal_api_key}"
"""

    yaml_content = f"""apiVersion: v1
kind: Secret
metadata:
  name: {secret_name}
  namespace: aivo-prod
type: Opaque
stringData:
  database-url: "{shell_escape(db_url)}"
{extra_data}"""

    out, err = kubectl(f"apply -f - <<'ENDOFYAML'\n{yaml_content}\nENDOFYAML")
    print(f"  {secret_name}: {out or err}")

# 6c. LLM provider secrets (all placeholders â€” user fills in)
llm_yaml = """apiVersion: v1
kind: Secret
metadata:
  name: llm-provider-secrets
  namespace: aivo-prod
type: Opaque
stringData:
  google-gemini-api-key: "PLACEHOLDER_GEMINI_KEY"
  google-project-id: "PLACEHOLDER_PROJECT_ID"
  openai-api-key: "PLACEHOLDER_OPENAI_KEY"
  openai-organization-id: ""
  anthropic-api-key: "PLACEHOLDER_ANTHROPIC_KEY"
"""
out, err = kubectl(f"apply -f - <<'ENDOFYAML'\n{llm_yaml}\nENDOFYAML")
print(f"  llm-provider-secrets: {out or err}")

# â”€â”€ Step 7: cert-manager ClusterIssuer â”€â”€
print("\nðŸ”’ Step 7: Creating cert-manager ClusterIssuer...")
issuer_yaml = """apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@aivolearning.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            class: nginx
"""
out, err = kubectl(f"apply -f - <<'ENDOFYAML'\n{issuer_yaml}\nENDOFYAML")
print(f"  {out or err}")

# Also create staging issuer for testing
staging_issuer_yaml = """apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@aivolearning.com
    privateKeySecretRef:
      name: letsencrypt-staging-account-key
    solvers:
      - http01:
          ingress:
            class: nginx
"""
out, err = kubectl(f"apply -f - <<'ENDOFYAML'\n{staging_issuer_yaml}\nENDOFYAML")
print(f"  Staging issuer: {out or err}")

# â”€â”€ Step 8: Verify everything â”€â”€
print("\nâœ… Step 8: Verification...")

out, _ = kubectl("get namespace aivo-prod")
print(f"\n  Namespace:\n  {out}")

out, _ = kubectl("get nodes --show-labels | grep -o 'role=[a-z]*'")
print(f"\n  Node labels: {out}")

out, _ = kubectl("-n aivo-prod get secrets --no-headers | wc -l")
print(f"\n  Secrets count: {out}")

out, _ = kubectl("-n aivo-prod get secrets --no-headers")
print(f"\n  Secrets:")
for line in out.split("\n"):
    if line.strip():
        print(f"    {line.strip()}")

out, _ = kubectl("get clusterissuer")
print(f"\n  ClusterIssuers:\n  {out}")

# â”€â”€ Save generated secrets to local file â”€â”€
generated = {
    "jwt_private_key_path": "/tmp/jwt-private.pem (on app1)",
    "jwt_public_key_path": "/tmp/jwt-public.pem (on app1)",
    "sso_encryption_key": sso_key,
    "mfa_encryption_key": mfa_key,
    "billing_jwt_secret": jwt_secret,
    "internal_api_key": internal_api_key,
}
creds.update(generated)
with open("scripts/hetzner/credentials.json", "w") as f:
    json.dump(creds, f, indent=2)
print("\n  ðŸ’¾ Updated credentials.json with generated keys")

print("\n" + "=" * 70)
print("PHASE 4+5 STEP 1 COMPLETE: Namespace, secrets, and cert-manager ready")
print("=" * 70)
print("""
âš ï¸  PLACEHOLDERS TO UPDATE (when you have the real keys):
  1. GHCR pull secret:
     kubectl -n aivo-prod delete secret ghcr-pull-secret
     kubectl -n aivo-prod create secret docker-registry ghcr-pull-secret \\
       --docker-server=ghcr.io --docker-username=YOUR_GITHUB_USER \\
       --docker-password=YOUR_GITHUB_PAT

  2. LLM provider secrets:
     kubectl -n aivo-prod edit secret llm-provider-secrets
     (set openai-api-key, anthropic-api-key, google-gemini-api-key)

  3. Billing/Stripe secrets:
     kubectl -n aivo-prod edit secret billing-svc-secrets
     (set stripe-secret-key, stripe-publishable-key, stripe-webhook-secret)

  4. Notification secrets (SendGrid, Twilio, Firebase, APNS):
     kubectl -n aivo-prod edit secret notify-svc-secrets
     (add sendgrid-api-key, twilio creds, firebase creds, apns creds)
""")
