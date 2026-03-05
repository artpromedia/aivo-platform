#!/usr/bin/env python3
"""Install Cloudflare Origin Certificate as K8s TLS secret.

Usage:
  # Set environment variables:
  #   CF_ORIGIN_CERT   - PEM-encoded Cloudflare origin certificate
  #   CF_ORIGIN_KEY    - PEM-encoded private key for the origin certificate
  # Or point to files:
  #   CF_ORIGIN_CERT_FILE=/path/to/cf-origin.crt
  #   CF_ORIGIN_KEY_FILE=/path/to/cf-origin.key
  pip install paramiko python-dotenv
  python scripts/hetzner/install_cf_origin_cert.py
"""

import os
import sys
import paramiko

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

APP1 = os.environ.get("HETZNER_APP1_HOST", "95.216.245.40")

# Load cert/key from env vars or files
_cert_file = os.environ.get("CF_ORIGIN_CERT_FILE")
_key_file = os.environ.get("CF_ORIGIN_KEY_FILE")

if _cert_file and os.path.isfile(_cert_file):
    with open(_cert_file) as f:
        CERT = f.read()
else:
    CERT = os.environ.get("CF_ORIGIN_CERT", "")

if _key_file and os.path.isfile(_key_file):
    with open(_key_file) as f:
        KEY = f.read()
else:
    KEY = os.environ.get("CF_ORIGIN_KEY", "")

if not CERT or not KEY:
    print("ERROR: Missing CF_ORIGIN_CERT/CF_ORIGIN_KEY environment variables")
    print("  Set them directly or point CF_ORIGIN_CERT_FILE/CF_ORIGIN_KEY_FILE to PEM files.")
    sys.exit(1)

def run_ssh(host, cmd):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username="root")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    rc = stdout.channel.recv_exit_status()
    ssh.close()
    return out, err, rc

def main():
    # Write cert and key to server
    cert_escaped = CERT.replace("'", "'\\''")
    key_escaped = KEY.replace("'", "'\\''")

    run_ssh(APP1, f"cat > /tmp/cf-origin.crt << 'EOF'\n{CERT}\nEOF")
    run_ssh(APP1, f"cat > /tmp/cf-origin.key << 'EOF'\n{KEY}\nEOF")
    print("Wrote cert and key files to server")

    # Delete existing secret if any
    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod delete secret cloudflare-origin-tls 2>/dev/null; echo ok")
    print(f"Delete old secret: {out.strip()}")

    # Create TLS secret
    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod create secret tls cloudflare-origin-tls --cert=/tmp/cf-origin.crt --key=/tmp/cf-origin.key")
    print(f"Create secret: {out.strip()} {err.strip()}")

    if rc != 0:
        print(f"FAILED with rc={rc}")
        return

    # Verify secret
    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod get secret cloudflare-origin-tls -o jsonpath='{.type}'")
    print(f"Secret type: {out}")

    # Verify ingresses reference it
    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod get ingress -o wide")
    print(f"\n=== Ingresses ===\n{out}")

    # Clean up
    run_ssh(APP1, "rm -f /tmp/cf-origin.crt /tmp/cf-origin.key")
    print("Cleaned up temp files. Done!")

if __name__ == "__main__":
    main()
