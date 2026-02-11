#!/usr/bin/env python3
"""Create MinIO buckets with the new password."""

import paramiko
import json
import os
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(SCRIPT_DIR, "credentials.json")) as f:
    creds = json.load(f)

pw = creds["minio_password"]
print(f"Using password: {pw}")

def run_on_app2(cmd, timeout=30):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect("95.217.195.144", username="root", password="j?A6M9rKcMHRGT", timeout=20)
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        return out, err
    finally:
        ssh.close()

# Check MinIO is running
out, _ = run_on_app2("systemctl is-active minio")
print(f"MinIO status: {out}")

# Check MinIO logs to confirm the new password is working
out, _ = run_on_app2("journalctl -u minio --no-pager -n 5")
print(f"MinIO logs:\n{out}\n")

# mc alias set with explicit separate arguments 
out, err = run_on_app2(f"mc alias set local http://127.0.0.1:9000 aivo-admin {pw} --api S3v4 2>&1", timeout=30)
print(f"mc alias set: {out}")
if err:
    print(f"mc alias err: {err}")

# Create buckets one at a time
buckets = ["aivo-media", "aivo-avatars", "aivo-content", "aivo-exports", "aivo-backups", "aivo-temp", "aivo-certificates"]
for b in buckets:
    out, err = run_on_app2(f"mc mb local/{b} --ignore-existing 2>&1", timeout=15)
    print(f"  {b}: {out}")

# List
out, _ = run_on_app2("mc ls local/ 2>&1", timeout=15)
print(f"\nBuckets:\n{out}")

# Set public download on media/avatars
run_on_app2("mc anonymous set download local/aivo-media 2>/dev/null")
run_on_app2("mc anonymous set download local/aivo-avatars 2>/dev/null")
print("\nDone!")
