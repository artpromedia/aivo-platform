#!/usr/bin/env python3
"""Final fix for MinIO and Grafana."""

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

def run_on(name, cmd, timeout=120):
    ssh = connect(name)
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        return out, err
    finally:
        ssh.close()

# === Fix MinIO ===
print("=== Fix MinIO ===")
minio_pw = creds["minio_password"]

# The service file uses aivo-admin as root user and has the password embedded
# The override conflicts. Remove override and use the service file as-is
# The issue is the $ in the password - systemd interprets $ as variable substitution
# We need to escape $ as $$ in systemd unit files

escaped_pw = minio_pw.replace("$", "$$")

# Rewrite the service file with properly escaped password
ssh = connect("app2")
try:
    channel = ssh.get_transport().open_session()
    channel.exec_command("cat > /etc/systemd/system/minio.service")
    service_content = f"""[Unit]
Description=MinIO Object Storage
After=network.target

[Service]
User=deploy
Group=deploy
ExecStart=/usr/local/bin/minio server /data/extra/minio --console-address ":9001" --address ":9000"
Environment="MINIO_ROOT_USER=aivo-admin"
Environment="MINIO_ROOT_PASSWORD={escaped_pw}"
Restart=always
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
"""
    channel.sendall(service_content.encode())
    channel.shutdown_write()
    channel.recv_exit_status()
    print("  Service file rewritten with escaped password.")
finally:
    ssh.close()

# Remove the override that conflicts
run_on("app2", "rm -f /etc/systemd/system/minio.service.d/override.conf; rmdir /etc/systemd/system/minio.service.d 2>/dev/null || true")

# Also ensure the data directory has correct ownership
run_on("app2", "mkdir -p /data/extra/minio; chown -R deploy:deploy /data/extra/minio")

# Restart
print("  Restarting MinIO...")
out, _ = run_on("app2", "systemctl daemon-reload; systemctl restart minio; sleep 3; systemctl is-active minio")
print(f"  Status: {out}")

# Create buckets using the correct username (aivo-admin)
print("  Creating buckets with correct credentials...")
bucket_script = f'''#!/usr/bin/env python3
import subprocess, os, urllib.parse

user = "aivo-admin"
password = """{minio_pw}"""
encoded_password = urllib.parse.quote(password, safe="")

os.environ["MC_HOST_local"] = f"http://{{user}}:{{encoded_password}}@127.0.0.1:9000"

# Test connection
r = subprocess.run(["mc", "admin", "info", "local"], capture_output=True, text=True, env=os.environ)
print(f"MinIO info: {{r.stdout[:200]}}")
if r.stderr:
    print(f"Error: {{r.stderr[:200]}}")

buckets = ["aivo-media", "aivo-avatars", "aivo-content", "aivo-exports", "aivo-backups", "aivo-temp", "aivo-certificates"]
for b in buckets:
    r = subprocess.run(["mc", "mb", f"local/{{b}}", "--ignore-existing"], capture_output=True, text=True, env=os.environ)
    status = "OK" if r.returncode == 0 else r.stderr.strip()[:80]
    print(f"  {{b}}: {{status}}")

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

# === Fix Grafana ===
print("\n=== Fix Grafana ===")
# Check Grafana logs
out, _ = run_on("app1", "export KUBECONFIG=/root/.kube/config; kubectl logs -n monitoring -l app.kubernetes.io/name=grafana --tail=30 2>/dev/null")
print(f"  Grafana logs:\n{out[:1000]}")

# Describe the pod for events
out, _ = run_on("app1", "export KUBECONFIG=/root/.kube/config; kubectl describe pod -n monitoring -l app.kubernetes.io/name=grafana 2>/dev/null | tail -20")
print(f"\n  Events:\n{out}")

# Try deleting the pod to let it restart fresh
print("  Restarting Grafana pod...")
out, _ = run_on("app1", "export KUBECONFIG=/root/.kube/config; kubectl delete pod -n monitoring -l app.kubernetes.io/name=grafana 2>/dev/null")
print(f"  {out}")

time.sleep(15)
out, _ = run_on("app1", "export KUBECONFIG=/root/.kube/config; kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana --no-headers 2>/dev/null")
print(f"  Grafana pod: {out}")

print("\nDone!")
