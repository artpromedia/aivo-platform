#!/usr/bin/env python3
"""
Push Firebase Admin SDK + OonruMail credentials to K8s secrets on production.

Targets:
  - parent-svc-secrets  → Firebase (project ID, client email, private key)
  - auth-svc-secrets    → Firebase (project ID, client email, private key)
  - notify-svc-secrets  → OonruMail API key + email config

Usage:
  # Set required environment variables (or use a .env file):
  #   FIREBASE_PROJECT_ID
  #   FIREBASE_CLIENT_EMAIL
  #   FIREBASE_PRIVATE_KEY          (PEM-encoded private key)
  #   OONRUMAIL_API_KEY
  #
  # Or pass a Firebase service-account JSON file:
  #   FIREBASE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json
  #
  pip install paramiko python-dotenv
  python scripts/hetzner/push_secrets_to_k8s.py
"""
import paramiko
import json
import os
import sys
import time

try:
    from dotenv import load_dotenv
    load_dotenv()  # Load from .env if present
except ImportError:
    pass  # python-dotenv is optional

# ── Production server ──────────────────────────────────────────────────────
APP1 = os.environ.get("HETZNER_APP1_HOST", "95.216.245.40")
NAMESPACE = os.environ.get("K8S_NAMESPACE", "aivo-prod")

# ── Firebase Admin SDK credentials ─────────────────────────────────────────
# Read from env vars directly, or from a service-account JSON file
_sa_json_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
if _sa_json_path and os.path.isfile(_sa_json_path):
    with open(_sa_json_path) as f:
        _sa = json.load(f)
    FIREBASE_PROJECT_ID = _sa["project_id"]
    FIREBASE_CLIENT_EMAIL = _sa["client_email"]
    FIREBASE_PRIVATE_KEY = _sa["private_key"]
else:
    FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "")
    FIREBASE_CLIENT_EMAIL = os.environ.get("FIREBASE_CLIENT_EMAIL", "")
    FIREBASE_PRIVATE_KEY = os.environ.get("FIREBASE_PRIVATE_KEY", "")

# ── OonruMail credentials ──────────────────────────────────────────────────
OONRUMAIL_API_KEY = os.environ.get("OONRUMAIL_API_KEY", "")

# ── Validate that required secrets are present ──────────────────────────────
_missing = []
if not FIREBASE_PROJECT_ID:
    _missing.append("FIREBASE_PROJECT_ID")
if not FIREBASE_CLIENT_EMAIL:
    _missing.append("FIREBASE_CLIENT_EMAIL")
if not FIREBASE_PRIVATE_KEY:
    _missing.append("FIREBASE_PRIVATE_KEY")
if not OONRUMAIL_API_KEY:
    _missing.append("OONRUMAIL_API_KEY")
if _missing:
    print(f"ERROR: Missing required environment variables: {', '.join(_missing)}")
    print("Set them directly or point FIREBASE_SERVICE_ACCOUNT_JSON to your service-account JSON file.")
    sys.exit(1)


def ssh_connect(host):
    """Connect to production server via SSH."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    for attempt in range(3):
        try:
            client.connect(host, username="root", timeout=15)
            return client
        except Exception as e:
            if attempt < 2:
                print(f"  Connection attempt {attempt+1} failed: {e}, retrying...")
                time.sleep(3)
            else:
                raise
    raise Exception(f"Failed to connect to {host}")


def ssh_exec(client, cmd, timeout=60):
    """Execute command via SSH, return (stdout, stderr, exit_code)."""
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    rc = stdout.channel.recv_exit_status()
    return out, err, rc


def patch_secret(client, secret_name, string_data):
    """Patch a K8s secret with new key-value pairs using strategic merge."""
    patch = json.dumps({"stringData": string_data})

    # Use SFTP to transfer the patch file (avoids shell escaping issues with PEM keys)
    sftp = client.open_sftp()
    with sftp.file("/tmp/secret-patch.json", "w") as f:
        f.write(patch)
    sftp.close()

    # Verify patch file is valid JSON
    out, err, rc = ssh_exec(client, "python3 -c \"import json; json.load(open('/tmp/secret-patch.json')); print('valid')\"")
    if "valid" not in out:
        print(f"  ERROR: patch file is not valid JSON: {err}")
        return False

    # Apply the patch
    out, err, rc = ssh_exec(
        client,
        f"kubectl -n {NAMESPACE} patch secret {secret_name} --type=merge --patch-file=/tmp/secret-patch.json"
    )
    if rc != 0:
        print(f"  ERROR patching {secret_name}: {err}")
        # Clean up
        ssh_exec(client, "rm -f /tmp/secret-patch.json")
        return False

    print(f"  {out}")

    # Clean up
    ssh_exec(client, "rm -f /tmp/secret-patch.json")
    return True


def verify_secret_keys(client, secret_name):
    """List all keys in a K8s secret."""
    out, err, rc = ssh_exec(
        client,
        f"kubectl -n {NAMESPACE} get secret {secret_name} -o jsonpath='{{.data}}' "
        f"| python3 -c \"import sys,json; d=json.load(sys.stdin); print(', '.join(sorted(d.keys())))\""
    )
    if rc == 0 and out:
        return out
    return f"ERROR: {err or 'not found'}"


def main():
    print("=" * 70)
    print("AIVO — Push Secrets to Kubernetes (Hetzner Production)")
    print("=" * 70)

    print(f"\nConnecting to {APP1}...")
    client = ssh_connect(APP1)
    print("  Connected!")

    # ── 1. parent-svc-secrets: Firebase credentials ────────────────────────
    print("\n[1/4] Patching parent-svc-secrets with Firebase credentials...")
    ok = patch_secret(client, "parent-svc-secrets", {
        "firebase-project-id": FIREBASE_PROJECT_ID,
        "firebase-client-email": FIREBASE_CLIENT_EMAIL,
        "firebase-private-key": FIREBASE_PRIVATE_KEY.strip(),
    })
    if ok:
        keys = verify_secret_keys(client, "parent-svc-secrets")
        print(f"  Keys: {keys}")
    else:
        print("  FAILED — check if parent-svc-secrets exists")

    # ── 2. auth-svc-secrets: Firebase credentials ──────────────────────────
    print("\n[2/4] Patching auth-svc-secrets with Firebase credentials...")
    ok = patch_secret(client, "auth-svc-secrets", {
        "firebase-project-id": FIREBASE_PROJECT_ID,
        "firebase-client-email": FIREBASE_CLIENT_EMAIL,
        "firebase-private-key": FIREBASE_PRIVATE_KEY.strip(),
    })
    if ok:
        keys = verify_secret_keys(client, "auth-svc-secrets")
        print(f"  Keys: {keys}")
    else:
        print("  FAILED — check if auth-svc-secrets exists")

    # ── 3. notify-svc-secrets: OonruMail + email config ────────────────────
    print("\n[3/4] Patching notify-svc-secrets with OonruMail credentials...")
    ok = patch_secret(client, "notify-svc-secrets", {
        "oonrumail-api-key": OONRUMAIL_API_KEY,
        "email-primary-provider": "oonrumail",
        "email-enabled": "true",
        "oonrumail-enabled": "true",
    })
    if ok:
        keys = verify_secret_keys(client, "notify-svc-secrets")
        print(f"  Keys: {keys}")
    else:
        print("  FAILED — check if notify-svc-secrets exists")

    # ── 4. Restart deployments to pick up new secrets ──────────────────────
    print("\n[4/4] Rolling restart of affected deployments...")
    for svc in ["parent-svc", "auth-svc", "notify-svc"]:
        out, err, rc = ssh_exec(
            client,
            f"kubectl -n {NAMESPACE} rollout restart deployment {svc} 2>/dev/null"
        )
        if rc == 0:
            print(f"  {svc}: {out}")
        else:
            print(f"  {svc}: skipped ({err or 'deployment not found'})")

    # ── Summary ────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("DONE — Secrets pushed to K8s. Rollout in progress.")
    print("=" * 70)
    print("""
Verify with:
  ssh root@95.216.245.40
  kubectl -n aivo-prod get secret parent-svc-secrets -o jsonpath='{.data}' | python3 -c "import sys,json; print(sorted(json.load(sys.stdin).keys()))"
  kubectl -n aivo-prod get secret auth-svc-secrets -o jsonpath='{.data}' | python3 -c "import sys,json; print(sorted(json.load(sys.stdin).keys()))"
  kubectl -n aivo-prod get secret notify-svc-secrets -o jsonpath='{.data}' | python3 -c "import sys,json; print(sorted(json.load(sys.stdin).keys()))"
  kubectl -n aivo-prod rollout status deployment parent-svc auth-svc notify-svc
""")

    client.close()


if __name__ == "__main__":
    main()
