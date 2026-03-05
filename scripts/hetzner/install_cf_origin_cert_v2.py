#!/usr/bin/env python3
"""Install Cloudflare Origin Certificate v2 (with SANs) as K8s TLS secret.

Usage:
  # Set environment variables:
  #   CF_ORIGIN_CERT   - PEM-encoded Cloudflare origin certificate
  #   CF_ORIGIN_KEY    - PEM-encoded private key for the origin certificate
  # Or point to files:
  #   CF_ORIGIN_CERT_FILE=/path/to/cf-origin.crt
  #   CF_ORIGIN_KEY_FILE=/path/to/cf-origin.key
  pip install paramiko python-dotenv
  python scripts/hetzner/install_cf_origin_cert_v2.py
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
    run_ssh(APP1, f"cat > /tmp/cf-origin.crt << 'EOF'\n{CERT}\nEOF")
    run_ssh(APP1, f"cat > /tmp/cf-origin.key << 'EOF'\n{KEY}\nEOF")
    print("Wrote cert and key files to server")

    # Check SANs on new cert
    out, err, rc = run_ssh(APP1, "openssl x509 -in /tmp/cf-origin.crt -noout -subject -issuer -ext subjectAltName 2>&1")
    print(f"Cert details:\n{out}")

    # Delete existing secret and recreate
    run_ssh(APP1, "kubectl -n aivo-prod delete secret cloudflare-origin-tls 2>/dev/null")
    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod create secret tls cloudflare-origin-tls --cert=/tmp/cf-origin.crt --key=/tmp/cf-origin.key")
    print(f"Create secret: {out.strip()} {err.strip()}")

    # Force NGINX to reload by restarting the ingress controller
    out, err, rc = run_ssh(APP1, "kubectl -n ingress-nginx rollout restart deploy/ingress-nginx-controller 2>/dev/null || kubectl -n ingress-nginx rollout restart daemonset/ingress-nginx-controller 2>/dev/null")
    print(f"Restart ingress: {out.strip()} {err.strip()}")

    # Wait for reload
    import time
    print("Waiting 15s for NGINX to reload...")
    time.sleep(15)

    # Verify cert served by NGINX
    out, err, rc = run_ssh(APP1, "echo | openssl s_client -connect localhost:443 -servername api.aivolearning.com 2>/dev/null | openssl x509 -noout -subject -issuer -ext subjectAltName 2>/dev/null")
    print(f"NGINX serving cert:\n{out}")

    # Test HTTPS through Cloudflare
    out, err, rc = run_ssh(APP1, "curl -sv --resolve api.aivolearning.com:443:104.26.0.176 --max-time 10 https://api.aivolearning.com/health 2>&1 | tail -10")
    print(f"Cloudflare test:\n{out}")

    # Clean up
    run_ssh(APP1, "rm -f /tmp/cf-origin.crt /tmp/cf-origin.key")
    print("Done!")

if __name__ == "__main__":
    main()
