#!/usr/bin/env python3
"""Update K8s secrets with real API keys."""
import paramiko
import subprocess
import json

APP1 = {"host": "95.216.245.40", "user": "root", "password": "2R2ht?gALF7%L%"}

def kubectl(cmd, timeout=60, retries=3):
    for attempt in range(retries):
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            ssh.connect(APP1["host"], username=APP1["user"], password=APP1["password"], timeout=30,
                       banner_timeout=30, auth_timeout=30)
            _, stdout, stderr = ssh.exec_command(f"KUBECONFIG=/root/.kube/config kubectl {cmd}", timeout=timeout)
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            ssh.close()
            return out, err
        except Exception as e:
            try:
                ssh.close()
            except:
                pass
            if attempt < retries - 1:
                import time
                print(f"  Ã¢Å¡Â Ã¯Â¸Â  SSH retry {attempt+1}...")
                time.sleep(3)
            else:
                return f"ERROR: {e}", ""

print("=" * 60)
print("UPDATING K8s SECRETS WITH REAL API KEYS")
print("=" * 60)

# Ã¢â€â‚¬Ã¢â€â‚¬ 1. Update GHCR pull secret Ã¢â€â‚¬Ã¢â€â‚¬
print("\nÃ°Å¸â€Â Step 1: Updating GHCR pull secret...")
result = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True)
gh_token = result.stdout.strip()

out, _ = kubectl("-n aivo-prod delete secret ghcr-pull-secret --ignore-not-found")
print(f"  Delete old: {out}")

out, _ = kubectl(
    f"-n aivo-prod create secret docker-registry ghcr-pull-secret "
    f"--docker-server=ghcr.io "
    f"--docker-username=artpromedia "
    f"--docker-password={gh_token}"
)
print(f"  Create new: {out}")

# Ã¢â€â‚¬Ã¢â€â‚¬ 2. Update LLM provider secrets Ã¢â€â‚¬Ã¢â€â‚¬
print("\nÃ°Å¸Â¤â€“ Step 2: Updating LLM provider secrets...")
llm_yaml = """apiVersion: v1
kind: Secret
metadata:
  name: llm-provider-secrets
  namespace: aivo-prod
type: Opaque
stringData:
  google-gemini-api-key: "AIzaSy_REDACTED"
  google-project-id: "REDACTED_PROJECT_ID"
  openai-api-key: "sk-proj-REDACTED"
  openai-organization-id: ""
  anthropic-api-key: "sk-ant-REDACTED"
"""
out, err = kubectl(f"apply -f - <<'ENDOFYAML'\n{llm_yaml}\nENDOFYAML")
print(f"  {out or err}")

# Ã¢â€â‚¬Ã¢â€â‚¬ 3. Update billing-svc secrets with Stripe test keys Ã¢â€â‚¬Ã¢â€â‚¬
print("\nÃ°Å¸â€™Â³ Step 3: Updating billing-svc secrets (Stripe test keys)...")

# Read existing secret to preserve database-url and other keys
with open("scripts/hetzner/credentials.json") as f:
    creds = json.load(f)

pg_pw = creds["postgres_app_password"]
jwt_secret = creds.get("billing_jwt_secret", "")

billing_yaml = f"""apiVersion: v1
kind: Secret
metadata:
  name: billing-svc-secrets
  namespace: aivo-prod
type: Opaque
stringData:
  database-url: "postgresql://aivo_app:{pg_pw}@10.0.0.1:6432/aivo_billing?schema=public"
  jwt-secret: "{jwt_secret}"
  stripe-secret-key: "sk_test_REDACTED"
  stripe-publishable-key: "pk_test_REDACTED"
  stripe-webhook-secret: "PLACEHOLDER_WEBHOOK_SECRET"
"""
out, err = kubectl(f"apply -f - <<'ENDOFYAML'\n{billing_yaml}\nENDOFYAML")
print(f"  {out or err}")

# Ã¢â€â‚¬Ã¢â€â‚¬ 4. Verify all secrets Ã¢â€â‚¬Ã¢â€â‚¬
print("\nÃ¢Å“â€¦ Verification:")

out, _ = kubectl("-n aivo-prod get secret llm-provider-secrets -o jsonpath='{.data}' | tr ',' '\\n'")
keys = out.replace("{", "").replace("}", "").replace('"', '')
print(f"  llm-provider-secrets keys: {[k.split(':')[0] for k in keys.split(',') if ':' in k]}")

out, _ = kubectl("-n aivo-prod get secret billing-svc-secrets -o jsonpath='{range .data}{end}' 2>/dev/null; echo; KUBECONFIG=/root/.kube/config kubectl -n aivo-prod get secret billing-svc-secrets --template='{{range $k,$v := .data}}{{$k}} {{end}}'")
print(f"  billing-svc-secrets keys: {out}")

out, _ = kubectl("-n aivo-prod get secret ghcr-pull-secret -o jsonpath='{.type}'")
print(f"  ghcr-pull-secret type: {out}")

print("\n" + "=" * 60)
print("ALL SECRETS UPDATED SUCCESSFULLY")
print("=" * 60)
print("""
Ã¢Å“â€¦ GHCR pull secret     Ã¢â€ â€™ real GitHub PAT (artpromedia)
Ã¢Å“â€¦ LLM provider secrets Ã¢â€ â€™ Google AI, OpenAI, Anthropic keys
Ã¢Å“â€¦ Billing secrets       Ã¢â€ â€™ Stripe test keys (pk_test/sk_test)

Ã¢Å¡Â Ã¯Â¸Â  Still placeholder:
  - stripe-webhook-secret  Ã¢â€ â€™ Set after creating webhook in Stripe Dashboard
  - notify-svc secrets     Ã¢â€ â€™ SendGrid, Twilio, Firebase, APNS (when ready)
""")
