#!/usr/bin/env python3
"""Update GHCR pull secret on K3s with real GitHub token."""
import paramiko
import subprocess

APP1 = {"host": "95.216.245.40", "user": "root", "password": "2R2ht?gALF7%L%"}

# Get the GitHub token from gh CLI
result = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True)
token = result.stdout.strip()
print(f"GitHub token: {token[:10]}...{token[-4:]}")

def kubectl(cmd, timeout=30):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(APP1["host"], username=APP1["user"], password=APP1["password"], timeout=20)
    try:
        _, stdout, stderr = ssh.exec_command(f"KUBECONFIG=/root/.kube/config kubectl {cmd}", timeout=timeout)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        return out, err
    finally:
        ssh.close()

# Delete the old placeholder secret
print("\n🗑️  Deleting old placeholder pull secret...")
out, err = kubectl("-n aivo-prod delete secret ghcr-pull-secret --ignore-not-found")
print(f"  {out or err}")

# Create real pull secret
print("\n🔐 Creating GHCR pull secret with real token...")
out, err = kubectl(
    f"-n aivo-prod create secret docker-registry ghcr-pull-secret "
    f"--docker-server=ghcr.io "
    f"--docker-username=artpromedia "
    f"--docker-password={token}"
)
print(f"  {out or err}")

# Verify
print("\n✅ Verifying...")
out, _ = kubectl("-n aivo-prod get secret ghcr-pull-secret -o jsonpath='{.type}'")
print(f"  Type: {out}")
out, _ = kubectl("-n aivo-prod get secret ghcr-pull-secret -o jsonpath='{.data}'")
print(f"  Has data: {'yes' if out else 'no'}")

print("\n🎉 GHCR pull secret updated! Pods will now be able to pull images from ghcr.io/artpromedia/*")

# Check if any images actually exist in GHCR
print("\n📦 Checking for existing images in GHCR...")
result = subprocess.run(
    ["gh", "api", "orgs/artpromedia/packages?package_type=container", "--jq", ".[].name"],
    capture_output=True, text=True
)
if result.stdout.strip():
    print("  Existing container images:")
    for img in result.stdout.strip().split("\n"):
        print(f"    📦 ghcr.io/artpromedia/{img}")
else:
    # Try user packages instead of org
    result = subprocess.run(
        ["gh", "api", "user/packages?package_type=container", "--jq", ".[].name"],
        capture_output=True, text=True
    )
    if result.stdout.strip():
        print("  Existing container images (user):")
        for img in result.stdout.strip().split("\n"):
            print(f"    📦 ghcr.io/artpromedia/{img}")
    else:
        print("  ⚠️  No container images found in GHCR yet.")
        print("  Images need to be built and pushed first.")
        print("  The CI/CD pipeline (deploy-hetzner-staging.yml) will do this on push to main.")
