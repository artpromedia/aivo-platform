#!/usr/bin/env python3
"""Fix MinIO and Helm/monitoring."""

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

def run_on(name, cmd, timeout=120):
    srv = SERVERS[name]
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(srv["public_ip"], username="root", password=srv["password"], timeout=20)
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        return out, err
    finally:
        ssh.close()

def write_file_on(name, remote_path, content):
    srv = SERVERS[name]
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(srv["public_ip"], username="root", password=srv["password"], timeout=20)
    try:
        channel = ssh.get_transport().open_session()
        channel.exec_command(f"cat > {remote_path}")
        channel.sendall(content.encode())
        channel.shutdown_write()
        return channel.recv_exit_status()
    finally:
        ssh.close()

# === Fix MinIO ===
print("=== Fix MinIO ===")
minio_pw = creds["minio_password"]

# Check MinIO environment config
out, _ = run_on("app2", "cat /etc/default/minio 2>/dev/null || echo 'no config'")
print(f"  MinIO config:\n{out}\n")

out, _ = run_on("app2", "systemctl status minio 2>/dev/null | head -10")
print(f"  MinIO status: {out[:300]}")

# Check actual MinIO root user/password
out, _ = run_on("app2", "grep -E 'MINIO_ROOT|MINIO_ACCESS' /etc/default/minio 2>/dev/null")
print(f"  MinIO credentials in config: {out}")

# The mc alias needs the correct credentials from the MinIO config
# Let's rewrite the MinIO default config with our known password
minio_conf = f"""MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD={minio_pw}
MINIO_VOLUMES="/data/secondary/minio"
MINIO_OPTS="--address :9000 --console-address :9001"
"""
print("  Writing MinIO config...")
write_file_on("app2", "/etc/default/minio", minio_conf)

print("  Restarting MinIO...")
out, err = run_on("app2", "systemctl restart minio; sleep 3; systemctl is-active minio")
print(f"  Status: {out}")

# Now set up mc alias with correct escaping via environment variable
print("  Setting up mc alias...")
mc_setup = f"""#!/bin/bash
export MC_HOST_local=http://minio:{minio_pw}@127.0.0.1:9000
mc ls local/ 2>&1 || echo "FAILED_LS"
"""
write_file_on("app2", "/tmp/mc_setup.sh", mc_setup)
out, _ = run_on("app2", "chmod +x /tmp/mc_setup.sh; bash /tmp/mc_setup.sh")
print(f"  mc ls: {out}")

# Create buckets using MC_HOST env var
buckets = ["aivo-media", "aivo-avatars", "aivo-content", "aivo-exports", "aivo-backups", "aivo-temp", "aivo-certificates"]
bucket_script = f"""#!/bin/bash
export MC_HOST_local=http://minio:{minio_pw}@127.0.0.1:9000
"""
for b in buckets:
    bucket_script += f'mc mb local/{b} --ignore-existing 2>&1\n'
bucket_script += 'mc ls local/ 2>&1\n'

write_file_on("app2", "/tmp/create_buckets.sh", bucket_script)
out, _ = run_on("app2", "bash /tmp/create_buckets.sh")
print(f"  Bucket creation:\n{out}")

# === Fix Helm/Monitoring ===
print("\n=== Fix Monitoring Stack ===")

# Helm needs KUBECONFIG set to K3s config
print("  Setting up KUBECONFIG for Helm...")
out, _ = run_on("app1", "export KUBECONFIG=/etc/rancher/k3s/k3s.yaml; helm version --short 2>&1")
print(f"  Helm with KUBECONFIG: {out}")

# But K3s stores config differently. Check:
out, _ = run_on("app1", "ls -la /etc/rancher/k3s/k3s.yaml 2>/dev/null || echo 'not found'")
print(f"  K3s config: {out}")

# K3s with --data-dir might store kubeconfig elsewhere
out, _ = run_on("app1", "cat /data/k3s/server/cred/admin.kubeconfig 2>/dev/null | head -3 || echo 'not found'")
print(f"  K3s kubeconfig in data-dir: {out}")

# Check kubectl - it works, so how?
out, _ = run_on("app1", "which kubectl; ls -la $(which kubectl)")
print(f"  kubectl: {out}")

out, _ = run_on("app1", "kubectl config view --minify 2>/dev/null | head -5")
print(f"  kubectl config: {out}")

# K3s creates a symlink at /usr/local/bin/kubectl -> k3s
# kubectl works because k3s auto-detects its config
# For helm we need explicit KUBECONFIG
out, _ = run_on("app1", "k3s kubectl config view --raw 2>/dev/null | head -3")
print(f"  k3s config raw: {out}")

# Write kubeconfig for helm to use
print("  Generating kubeconfig for helm...")
out, _ = run_on("app1", """
k3s kubectl config view --raw > /root/.kube/config 2>/dev/null || mkdir -p /root/.kube && k3s kubectl config view --raw > /root/.kube/config
chmod 600 /root/.kube/config
export KUBECONFIG=/root/.kube/config
helm version --short 2>&1
""")
print(f"  Result: {out}")

# Add repos and install
print("  Adding Helm repos...")
out, _ = run_on("app1", """
export KUBECONFIG=/root/.kube/config
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>&1
helm repo add grafana https://grafana.github.io/helm-charts 2>&1
helm repo update 2>&1
""", timeout=120)
print(f"  Repos: {out[-300:]}")

grafana_pw = creds["grafana_password"]
print("  Installing kube-prometheus-stack...")
out, err = run_on("app1", f"""
export KUBECONFIG=/root/.kube/config
kubectl create namespace monitoring 2>/dev/null || true
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
    --namespace monitoring \
    --set grafana.adminPassword='{grafana_pw}' \
    --set grafana.service.type=ClusterIP \
    --set prometheus.prometheusSpec.retention=30d \
    --set alertmanager.enabled=true \
    --set grafana.persistence.enabled=false \
    --timeout 10m \
    2>&1
""", timeout=660)
print(f"  Result: {out[-500:]}")

# Install Loki
print("  Installing Loki...")
out, _ = run_on("app1", """
export KUBECONFIG=/root/.kube/config
helm upgrade --install loki grafana/loki-stack \
    --namespace monitoring \
    --set grafana.enabled=false \
    --set promtail.enabled=true \
    --set loki.persistence.enabled=false \
    --timeout 5m \
    2>&1
""", timeout=360)
print(f"  Loki: {out[-300:]}")

# Wait and check
print("  Waiting for pods to start...")
time.sleep(20)
out, _ = run_on("app1", "export KUBECONFIG=/root/.kube/config; kubectl get pods -n monitoring --no-headers 2>/dev/null | head -15")
print(f"  Monitoring pods:\n{out}")

print("\nFixes complete!")
