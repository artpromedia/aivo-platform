#!/usr/bin/env python3
"""Fix MinIO credentials and check Grafana."""

import paramiko
import json
import os
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(SCRIPT_DIR, "credentials.json")) as f:
    creds = json.load(f)

SERVERS = {
    "app1": {"public_ip": "95.216.245.40", "password": "2R2ht?gALF7%L%"},
    "app2": {"public_ip": "95.217.195.144", "password": "j?A6M9rKcMHRGT"},
}

def connect(name):
    srv = SERVERS[name]
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(srv["public_ip"], username="root", password=srv["password"], timeout=20)
    return ssh

def run_on(name, cmd, timeout=60):
    ssh = connect(name)
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        return out, err
    finally:
        ssh.close()

# === Fix MinIO ===
print("=== Fixing MinIO ===")

# Check current MinIO service file to understand how it's configured
out, _ = run_on("app2", "cat /etc/systemd/system/minio.service 2>/dev/null")
print(f"  Service file:\n{out}\n")

# Check MinIO logs for clues
out, _ = run_on("app2", "journalctl -u minio --no-pager -n 10 2>/dev/null")
print(f"  MinIO logs:\n{out}\n")

# Check what env MinIO is actually using
out, _ = run_on("app2", "cat /etc/default/minio 2>/dev/null || echo 'no /etc/default/minio'")
print(f"  /etc/default/minio: {out}")

# The issue is likely that /etc/default/minio is not being read.
# Let's check the service EnvironmentFile directive
out, _ = run_on("app2", "grep -i environment /etc/systemd/system/minio.service")
print(f"  EnvironmentFile: {out}")

# Write env directly into the service file as override
print("\n  Creating proper MinIO config...")
minio_pw = creds["minio_password"]

# Write to the file that the service actually reads
ssh = connect("app2")
try:
    # First let's see what file it reads
    stdin, stdout, stderr = ssh.exec_command("systemctl show minio.service -p EnvironmentFiles", timeout=10)
    env_files = stdout.read().decode().strip()
    print(f"  Actual env files: {env_files}")
    
    # Create a systemd override with environment vars embedded
    channel = ssh.get_transport().open_session()
    channel.exec_command("mkdir -p /etc/systemd/system/minio.service.d && cat > /etc/systemd/system/minio.service.d/override.conf")
    override = f"""[Service]
Environment="MINIO_ROOT_USER=minio"
Environment="MINIO_ROOT_PASSWORD={minio_pw}"
"""
    channel.sendall(override.encode())
    channel.shutdown_write()
    channel.recv_exit_status()
    print("  Override written.")
    
    # Also write /etc/default/minio
    channel2 = ssh.get_transport().open_session()
    channel2.exec_command("cat > /etc/default/minio")
    default_conf = f"""MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD={minio_pw}
MINIO_VOLUMES="/data/secondary/minio"
MINIO_OPTS="--address :9000 --console-address :9001"
"""
    channel2.sendall(default_conf.encode())
    channel2.shutdown_write()
    channel2.recv_exit_status()
    print("  /etc/default/minio written.")
finally:
    ssh.close()

# Restart MinIO
print("  Restarting MinIO...")
out, err = run_on("app2", "systemctl daemon-reload; systemctl restart minio; sleep 3; systemctl is-active minio")
print(f"  Status: {out}")

# Test with mc using environment variable (avoids shell escaping)
print("  Testing MinIO access...")
ssh = connect("app2")
try:
    # Use python to call mc with env var
    channel = ssh.get_transport().open_session()
    channel.update_environment({"MC_HOST_local": f"http://minio:{minio_pw}@127.0.0.1:9000"})
    channel.exec_command("mc ls local/ 2>&1")
    result = channel.makefile().read().decode().strip()
    print(f"  mc ls: {result}")
    
    if "Access Key" in result or "ERROR" in result:
        # Try different approach - use mc alias set via a temp script
        print("  Trying alternate approach...")
finally:
    ssh.close()

# Write a Python script on the server to create buckets (avoids shell escaping entirely)
print("  Creating buckets via Python script on server...")
bucket_script = f'''#!/usr/bin/env python3
import subprocess, os
os.environ["MC_HOST_local"] = "http://minio:{minio_pw}@127.0.0.1:9000"
buckets = ["aivo-media", "aivo-avatars", "aivo-content", "aivo-exports", "aivo-backups", "aivo-temp", "aivo-certificates"]
for b in buckets:
    r = subprocess.run(["mc", "mb", f"local/{{b}}", "--ignore-existing"], capture_output=True, text=True, env=os.environ)
    print(f"  {{b}}: {{r.stdout.strip()}} {{r.stderr.strip()}}")
r = subprocess.run(["mc", "ls", "local/"], capture_output=True, text=True, env=os.environ)
print(f"\\nBuckets:\\n{{r.stdout}}")
'''

ssh = connect("app2")
try:
    channel = ssh.get_transport().open_session()
    channel.exec_command("cat > /tmp/create_buckets.py")
    channel.sendall(bucket_script.encode())
    channel.shutdown_write()
    channel.recv_exit_status()
finally:
    ssh.close()

out, err = run_on("app2", "python3 /tmp/create_buckets.py 2>&1")
print(f"  {out}")

# === Check Grafana ===
print("\n=== Check Monitoring ===")
time.sleep(10)
out, _ = run_on("app1", "export KUBECONFIG=/root/.kube/config; kubectl get pods -n monitoring --no-headers 2>/dev/null")
print(f"  Pods:\n{out}")

running = sum(1 for line in out.split('\n') if 'Running' in line) if out else 0
total = len([l for l in out.split('\n') if l.strip()]) if out else 0
print(f"\n  {running}/{total} pods running")

print("\nDone!")
