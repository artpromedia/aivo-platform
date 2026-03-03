#!/usr/bin/env python3
"""
Push Firebase Admin SDK + OonruMail credentials to K8s secrets on production.

Targets:
  - parent-svc-secrets  → Firebase (project ID, client email, private key)
  - auth-svc-secrets    → Firebase (project ID, client email, private key)
  - notify-svc-secrets  → OonruMail API key + email config

Usage:
  pip install paramiko
  python scripts/hetzner/push_secrets_to_k8s.py
"""
import paramiko
import json
import sys
import time

# ── Production server ──────────────────────────────────────────────────────
APP1 = "95.216.245.40"
NAMESPACE = "aivo-prod"

# ── Firebase Admin SDK credentials ─────────────────────────────────────────
FIREBASE_PROJECT_ID = "aivo-learning-7eee8"
FIREBASE_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@aivo-learning-7eee8.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY = """-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQD3sYqrRGV4byZp
y+zmjIrZjuZ27B3V6fpy2qCKEJSwDH96wh/OT8EFDPR/RoNvS5Jctg/wTwQiSbR9
h/p8nH3I7zAQDk/Fs+nhi3Q0kK5MDl4tsWgNYVTEteHUZq72KAWi5RMykxIl4xVb
oEmmuhB+aMEnpvEI0wCVKsdtVsY2oQnEfr8Z/UCTPiwFocl4Utl27vt99y8aSYi+
+zOpKbY/p/iJQ4igIFqFlNjb16EW4WiDoV7nYHPleLKAGnt1kLLZA7x2eaSeG32z
CbIHWWJr5lSXfZzEVxi6Dl+nVMflkcQwCpjbIgvVfOVZquzCfYfACVxIdb+EDDUh
PWab6pZDAgMBAAECggEALOH/iixRJMMjV01sBpTV/jk+OrNrbp1A1DoYmBwMDWCe
Yvy1LbnW9JbV4RBCddLgWStmdPmkeqAXdB3FPnpO8q+g6m/ldaI10bhm3LWQ19hM
qYP5ol8OMLzyiH3420MCTnOrCGGNCs98yccgQXV60qUhxxEhoSM2+lCvpXjxXulx
LKjaQt3Tmzn0rgFV/tFofOfb3GTFAXGDdmdJ1j2CJs0K3R9ZSNt2KqYPVVtzG1q2
Kx2bS7jjElxXLfZpHFPQYQPzlqE9t4f2EnIrO5UeAUWVQGMNIqWt3KGawedTz3HD
6KTRk5FIE1x0aea/Z0nk3+b9L+V52HjBdhNolJ29ZQKBgQD7/4oXyA32/sKlFW9I
lwi8/CQLAX6KgdSrRuqhgF2YIYnKPVrpHm2UcMqcXZpwmrMN05B0VLzXtgOR8KU5
7h3Z7srQGbRGs38u4eVGV4G9muy+YTNJYQWSCLE8XUmP2H5KPSVuYt51uOwHEOEZ
vGXlJ9JkNNoG+sTeIXaCYnI/1wKBgQD7oICSKDsX2M5Z382HzqqVPDHNuFqP9f3q
am9wJE5YgkR5KQ6mz1zj5GPBOKWffHnba0WU+USaJJV7vWpjwadz5Ew/NEIe1bfP
94TwLnXnDXOAdjNFIm+ZEwHFXYIJVMtnW5029uoUJDUKVtGI/w7u8WukQTVlODjj
J8+hJj6/dQKBgBN6u2f/NOUk6FLuhz2rPyesrfST1v5J7vCWeMinLZT28rnJaF+g
1IOm/GJ98dRGgRTOh9oWOsrJ7Ri462zA9VnFVbQkaIUWlvw+xgRb+1F2ylolFVvU
viN9vIWYCHmwGIMQmvYfembLNqONMHlW0OGX5HGOjFQBynoJSCnoBkDdAoGBAJqJ
1qztHG3m78Tu2NIBsW56S7Qm9yfXUpz3xX1ALwXY66jl+GOmk0w7ZrCy07WBw21p
EpEODn4E3fHjQUYHF4rruZBPzhQV+hA12mWQg0TmU/ufnJlnLtb6f2nxpf2JIGtY
LtQlDVpVamXxMDtNOqSxjQSSL/L8dqO8PZ6hWIRJAoGAYlGilly0K1Xya7bWEv8N
bZJIXeJt6lnvxDVfapcskNi4Ccc/n8/jRVk0JL3Z8Y5MoZZ3Wri1GAYu+sF+fwn7
xriwKL1pLQJKLI6uURLt07hgXPEhWp7SocTzS/Z8cjIaFRPHzhOi/mOO76eeKg2b
UZOPdSWOKlhlmnZp5VmNDow=
-----END PRIVATE KEY-----
"""

# ── OonruMail credentials ──────────────────────────────────────────────────
OONRUMAIL_API_KEY = "em_pp4uwR1Z9tOjrdILu9DSWE54uSPBp6vbwwjrQg5f3qc"


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
