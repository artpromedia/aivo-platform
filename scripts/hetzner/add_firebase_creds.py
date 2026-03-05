#!/usr/bin/env python3
"""Add Firebase credentials to parent-svc-secrets in K8s.

Usage:
  # Set env vars or point to service-account JSON:
  #   FIREBASE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json
  # Or set individually:
  #   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
  pip install paramiko python-dotenv
  python scripts/hetzner/add_firebase_creds.py
"""

import paramiko
import json
import os
import sys

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Load Firebase credentials from env or service-account JSON ─────────────
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

_missing = []
if not FIREBASE_PROJECT_ID:
    _missing.append("FIREBASE_PROJECT_ID")
if not FIREBASE_CLIENT_EMAIL:
    _missing.append("FIREBASE_CLIENT_EMAIL")
if not FIREBASE_PRIVATE_KEY:
    _missing.append("FIREBASE_PRIVATE_KEY")
if _missing:
    print(f"ERROR: Missing required environment variables: {', '.join(_missing)}")
    print("Set them directly or point FIREBASE_SERVICE_ACCOUNT_JSON to your service-account JSON file.")
    sys.exit(1)

APP1 = os.environ.get("HETZNER_APP1_HOST", "95.216.245.40")

def run_ssh(host, cmd):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username="root")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    ssh.close()
    return out, err

def main():
    # Build the patch JSON
    patch = json.dumps({
        "stringData": {
            "firebase-project-id": FIREBASE_PROJECT_ID,
            "firebase-client-email": FIREBASE_CLIENT_EMAIL,
            "firebase-private-key": FIREBASE_PRIVATE_KEY.strip(),
        }
    })

    # Write patch file on server
    # Escape for shell
    patch_escaped = patch.replace("'", "'\\''")
    out, err = run_ssh(APP1, f"echo '{patch_escaped}' > /tmp/fb-patch.json")
    print(f"Write patch file: {out}{err}")

    # Verify
    out, err = run_ssh(APP1, "python3 -c \"import json; d=json.load(open('/tmp/fb-patch.json')); print('Keys:', list(d['stringData'].keys())); print('PK starts with:', d['stringData']['firebase-private-key'][:30])\"")
    print(f"Verify: {out}{err}")

    # Apply patch
    out, err = run_ssh(APP1, "kubectl -n aivo-prod patch secret parent-svc-secrets --type=merge --patch-file=/tmp/fb-patch.json")
    print(f"Patch result: {out}{err}")

    # Verify secret has all keys
    out, err = run_ssh(APP1, "kubectl -n aivo-prod get secret parent-svc-secrets -o jsonpath='{.data}' | python3 -c \"import sys,json; d=json.loads(sys.stdin.read()); print('Secret keys:', sorted(d.keys()))\"")
    print(f"Secret keys: {out}{err}")

    # Clean up
    run_ssh(APP1, "rm -f /tmp/fb-patch.json")
    print("Done! Cleaned up patch file.")

if __name__ == "__main__":
    main()
