#!/usr/bin/env python3
"""Reset MinIO with a simpler password that doesn't have shell-problematic chars."""

import paramiko
import json
import os
import time
import secrets
import string

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
creds_path = os.path.join(SCRIPT_DIR, "credentials.json")
with open(creds_path) as f:
    creds = json.load(f)

# Generate a new MinIO password without $, #, %, !, @, etc.
safe_chars = string.ascii_letters + string.digits + "-_"
new_minio_pw = ''.join(secrets.choice(safe_chars) for _ in range(32))
print(f"New MinIO password: {new_minio_pw}")

# Update credentials file
creds["minio_password"] = new_minio_pw
with open(creds_path, "w") as f:
    json.dump(creds, f, indent=2)
print("Credentials file updated.")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("95.217.195.144", username="root", password="j?A6M9rKcMHRGT", timeout=20)

def run(cmd, timeout=60):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

# Stop MinIO
print("\nStopping MinIO...")
run("systemctl stop minio")

# Remove old data (fresh start with new credentials)
print("Cleaning old MinIO data...")
run("rm -rf /data/extra/minio/.minio.sys 2>/dev/null")

# Rewrite service file with safe password
channel = ssh.get_transport().open_session()
channel.exec_command("cat > /etc/systemd/system/minio.service")
service = f"""[Unit]
Description=MinIO Object Storage
After=network.target

[Service]
User=deploy
Group=deploy
ExecStart=/usr/local/bin/minio server /data/extra/minio --console-address ":9001" --address ":9000"
Environment="MINIO_ROOT_USER=aivo-admin"
Environment="MINIO_ROOT_PASSWORD={new_minio_pw}"
Restart=always
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
"""
channel.sendall(service.encode())
channel.shutdown_write()
channel.recv_exit_status()
print("Service file written.")

# Remove any overrides
run("rm -rf /etc/systemd/system/minio.service.d")

# Ensure data dir exists with correct ownership
run("mkdir -p /data/extra/minio; chown -R deploy:deploy /data/extra/minio")

# Restart
print("Starting MinIO...")
run("systemctl daemon-reload")
out, _ = run("systemctl start minio; sleep 3; systemctl is-active minio")
print(f"Status: {out}")

# Create buckets
print("Creating buckets...")
mc_url = f"http://aivo-admin:{new_minio_pw}@127.0.0.1:9000"
out, _ = run(f"mc alias set local {mc_url} 2>&1", timeout=15)
print(f"mc alias set: {out}")

buckets = ["aivo-media", "aivo-avatars", "aivo-content", "aivo-exports", "aivo-backups", "aivo-temp", "aivo-certificates"]
for b in buckets:
    out, _ = run(f"mc mb local/{b} --ignore-existing 2>&1")
    print(f"  {b}: {out}")

# Verify
out, _ = run("mc ls local/ 2>&1")
print(f"\nBuckets:\n{out}")

# Set public policy on media bucket for serving content
run("mc anonymous set download local/aivo-media 2>/dev/null")
run("mc anonymous set download local/aivo-avatars 2>/dev/null")

ssh.close()
print("\nMinIO setup complete!")
