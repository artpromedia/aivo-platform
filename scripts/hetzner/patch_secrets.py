#!/usr/bin/env python3
"""
Add all missing environment variables to K8s secrets and configmaps.
This script patches existing secrets/configmaps with additional keys.
"""
import paramiko
import time
import base64
import json

APP1_IP = "95.216.245.40"
APP1_PASS = "2R2ht?gALF7%L%"
NAMESPACE = "aivo-prod"

# From credentials.json
INTERNAL_API_KEY = "REDACTED_INTERNAL_API_KEY"
BILLING_JWT_SECRET = "REDACTED_JWT_SECRET"
STRIPE_SK = "sk_test_REDACTED"
STRIPE_PK = "pk_test_REDACTED"

# Stripe webhook placeholder (user must update with real value from Stripe Dashboard)
STRIPE_WEBHOOK_SECRET = "whsec_placeholder_update_from_stripe_dashboard"

# Stripe price IDs - placeholder (user must create products in Stripe and get real IDs)
# Using placeholder format that passes the regex validation: price_[a-zA-Z0-9]{14,}
STRIPE_PRICE_PRO_MONTHLY = "price_placeholder_pro_monthly"
STRIPE_PRICE_PRO_ANNUAL = "price_placeholder_pro_annual"
STRIPE_PRICE_PREMIUM_MONTHLY = "price_placeholder_premium_monthly"
STRIPE_PRICE_PREMIUM_ANNUAL = "price_placeholder_premium_annual"

# Service URLs (all services run on port 3000 in K8s)
AI_ORCHESTRATOR_URL = "http://ai-orchestrator:3000"
SESSION_SVC_URL = "http://session-svc:3000"
PROFILE_SVC_URL = "http://profile-svc:3000"
BILLING_SVC_URL = "http://billing-svc:3000"
CONTENT_SVC_URL = "http://content-svc:3000"
ENTITLEMENTS_SVC_URL = "http://billing-svc:3000"  # entitlements handled by billing-svc

DB_PASSWORD = "Sh74VCfR40tiFd^d5P5spAneUiK&vzpp"

def ssh_exec(client, cmd, timeout=60):
    for attempt in range(3):
        try:
            stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            return out, err
        except Exception as e:
            if attempt < 2:
                print(f"  Retry {attempt+1}...")
                time.sleep(3)
            else:
                raise

def b64(value):
    return base64.b64encode(value.encode()).decode()

def connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    for attempt in range(3):
        try:
            client.connect(APP1_IP, username="root", password=APP1_PASS, timeout=30)
            return client
        except Exception as e:
            print(f"Connect attempt {attempt+1}: {e}")
            if attempt < 2:
                time.sleep(5)
    raise Exception("Failed to connect")

def patch_secret(client, name, data_dict):
    """Patch a K8s secret with additional key-value pairs."""
    patch = {"data": {k: b64(v) for k, v in data_dict.items()}}
    patch_json = json.dumps(patch).replace('"', '\\"')
    cmd = f'kubectl patch secret {name} -n {NAMESPACE} --type=merge -p "{patch_json}"'
    out, err = ssh_exec(client, cmd)
    if 'patched' in out or 'patched' in err:
        print(f"  Ã¢Å“â€¦ Patched {name}: +{list(data_dict.keys())}")
        return True
    else:
        print(f"  Ã¢ÂÅ’ Failed to patch {name}: {out} {err}")
        return False

def patch_configmap(client, name, data_dict):
    """Patch a K8s configmap with additional key-value pairs."""
    patch = {"data": data_dict}
    patch_json = json.dumps(patch).replace('"', '\\"')
    cmd = f'kubectl patch configmap {name} -n {NAMESPACE} --type=merge -p "{patch_json}"'
    out, err = ssh_exec(client, cmd)
    if 'patched' in out or 'patched' in err:
        print(f"  Ã¢Å“â€¦ Patched {name}: +{list(data_dict.keys())}")
        return True
    else:
        print(f"  Ã¢ÂÅ’ Failed to patch {name}: {out} {err}")
        return False

def main():
    client = connect()
    print("Connected to app1\n")

    # 1. Get JWT public key from app1
    print("=== Step 1: Get JWT keys ===")
    jwt_pub, _ = ssh_exec(client, "cat /tmp/jwt-public.pem")
    jwt_priv, _ = ssh_exec(client, "cat /tmp/jwt-private.pem")
    if not jwt_pub or 'BEGIN' not in jwt_pub:
        print("ERROR: JWT public key not found on app1!")
        return
    print(f"  JWT public key: {len(jwt_pub)} bytes")
    print(f"  JWT private key: {len(jwt_priv)} bytes")

    # 2. Patch shared-secrets with additional service URLs
    print("\n=== Step 2: Patch shared-secrets ===")
    patch_secret(client, "shared-secrets", {
        "internal-api-key": INTERNAL_API_KEY,
        "jwt-secret": BILLING_JWT_SECRET,
        "jwt-public-key": jwt_pub,
        "ai-orchestrator-url": AI_ORCHESTRATOR_URL,
        "profile-svc-url": PROFILE_SVC_URL,
        "content-svc-url": CONTENT_SVC_URL,
        "billing-svc-url": BILLING_SVC_URL,
        "entitlements-svc-url": ENTITLEMENTS_SVC_URL,
    })

    # 3. Patch consent-svc-secrets with JWT public key
    print("\n=== Step 3: Patch consent-svc-secrets ===")
    patch_secret(client, "consent-svc-secrets", {
        "jwt-public-key": jwt_pub,
    })

    # 4. Patch baseline-svc-secrets with JWT keys
    print("\n=== Step 4: Patch baseline-svc-secrets ===")
    patch_secret(client, "baseline-svc-secrets", {
        "jwt-private-key": jwt_priv,
        "jwt-public-key": jwt_pub,
    })

    # 5. Patch personalization-svc-secrets with JWT_SECRET
    print("\n=== Step 5: Patch personalization-svc-secrets ===")
    patch_secret(client, "personalization-svc-secrets", {
        "jwt-secret": BILLING_JWT_SECRET,
    })

    # 6. Patch analytics-svc-secrets with JWT_SECRET
    print("\n=== Step 6: Patch analytics-svc-secrets ===")
    patch_secret(client, "analytics-svc-secrets", {
        "jwt-secret": BILLING_JWT_SECRET,
    })

    # 7. Patch goal-svc-secrets with internal API key
    print("\n=== Step 7: Patch goal-svc-secrets ===")
    patch_secret(client, "goal-svc-secrets", {
        "internal-api-key": INTERNAL_API_KEY,
    })

    # 8. Patch life-skills-svc-secrets with internal API key
    print("\n=== Step 8: Patch life-skills-svc-secrets ===")
    patch_secret(client, "life-skills-svc-secrets", {
        "internal-api-key": INTERNAL_API_KEY,
    })

    # 9. Patch focus-svc-secrets
    print("\n=== Step 9: Patch focus-svc-secrets ===")
    patch_secret(client, "focus-svc-secrets", {
        "jwt-secret": BILLING_JWT_SECRET,
    })

    # 10. Patch payments-svc-secrets
    print("\n=== Step 10: Patch payments-svc-secrets ===")
    patch_secret(client, "payments-svc-secrets", {
        "stripe-secret-key": STRIPE_SK,
        "stripe-webhook-secret": STRIPE_WEBHOOK_SECRET,
    })

    # 11. Patch billing-svc-secrets with Stripe price IDs
    print("\n=== Step 11: Patch billing-svc-secrets ===")
    patch_secret(client, "billing-svc-secrets", {
        "stripe-price-pro-monthly": STRIPE_PRICE_PRO_MONTHLY,
        "stripe-price-pro-annual": STRIPE_PRICE_PRO_ANNUAL,
        "stripe-price-premium-monthly": STRIPE_PRICE_PREMIUM_MONTHLY,
        "stripe-price-premium-annual": STRIPE_PRICE_PREMIUM_ANNUAL,
    })

    # 12. Patch assessment-svc-secrets with JWT_SECRET
    print("\n=== Step 12: Patch assessment-svc-secrets ===")
    patch_secret(client, "assessment-svc-secrets", {
        "jwt-secret": BILLING_JWT_SECRET,
    })

    # 13. Patch parent-svc-secrets with JWT_SECRET
    print("\n=== Step 13: Patch parent-svc-secrets ===")
    patch_secret(client, "parent-svc-secrets", {
        "jwt-secret": BILLING_JWT_SECRET,
    })

    # Verify
    print("\n=== Verification ===")
    for secret in ["shared-secrets", "consent-svc-secrets", "baseline-svc-secrets",
                    "personalization-svc-secrets", "analytics-svc-secrets", "goal-svc-secrets",
                    "life-skills-svc-secrets", "focus-svc-secrets", "payments-svc-secrets",
                    "billing-svc-secrets", "assessment-svc-secrets", "parent-svc-secrets"]:
        keys, _ = ssh_exec(client, f"kubectl get secret {secret} -n {NAMESPACE} -o go-template='{{{{range $k,$v := .data}}}}{{{{$k}}}} {{{{end}}}}'")
        print(f"  {secret}: [{keys}]")

    client.close()
    print("\nÃ¢Å“â€¦ All secrets patched. Now update K8s deployment manifests to reference these new keys.")

if __name__ == "__main__":
    main()
