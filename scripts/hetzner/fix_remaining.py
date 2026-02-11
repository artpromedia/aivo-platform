#!/usr/bin/env python3
"""Fix monitoring and MinIO buckets."""

import paramiko
import json
import os
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(SCRIPT_DIR, "credentials.json")) as f:
    creds = json.load(f)

SERVERS = {
    "db1": {"public_ip": "95.217.76.42", "password": "Ebmx9V_r?a38NM"},
    "app1": {"public_ip": "95.216.245.40", "password": "2R2ht?gALF7%L%"},
    "app2": {"public_ip": "95.217.195.144", "password": "j?A6M9rKcMHRGT"},
}

def run_on(name, cmd, timeout=60):
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

# === Fix MinIO Buckets ===
print("=== Fixing MinIO Buckets ===")
minio_pw = creds["minio_password"]

# Check if MinIO is accessible and reconfigure mc alias
out, err = run_on("app2", f"""
# Set up mc alias
mc alias set local http://127.0.0.1:9000 minio '{minio_pw}' 2>&1
mc ls local/ 2>&1
""")
print(f"  mc ls output: {out}")
if err:
    print(f"  mc err: {err}")

# If no buckets, create them
if "aivo" not in out:
    print("  Creating buckets...")
    buckets = ["aivo-media", "aivo-avatars", "aivo-content", "aivo-exports", "aivo-backups", "aivo-temp", "aivo-certificates"]
    for b in buckets:
        out, err = run_on("app2", f"mc mb local/{b} --ignore-existing 2>&1")
        print(f"    {b}: {out}")
    
    out, _ = run_on("app2", "mc ls local/ 2>&1")
    print(f"  Buckets after creation: {out}")

# === Fix Monitoring ===
print("\n=== Checking Monitoring ===")
# Check what namespaces exist
out, _ = run_on("app1", "kubectl get namespaces")
print(f"  Namespaces:\n{out}")

# Check if monitoring was deployed
out, _ = run_on("app1", "kubectl get all -n monitoring 2>/dev/null || echo 'namespace not found'")
print(f"  Monitoring ns: {out}")

# Check if it was deployed with a different name
out, _ = run_on("app1", "kubectl get pods -A 2>/dev/null | grep -i 'prom\\|graf\\|loki\\|monitor'")
print(f"  Monitoring pods: {out if out else 'none found'}")

# Check helm releases
out, _ = run_on("app1", "helm list -A 2>/dev/null")
print(f"  Helm releases:\n{out}")

# If monitoring namespace doesn't exist, create it and deploy
out_ns, _ = run_on("app1", "kubectl get ns monitoring 2>&1")
if "NotFound" in out_ns or "not found" in out_ns.lower():
    print("\n  Creating monitoring namespace and deploying stack...")
    grafana_pw = creds["grafana_password"]
    
    # Create namespace
    run_on("app1", "kubectl create namespace monitoring 2>/dev/null || true")
    
    # Deploy a basic Prometheus + Grafana via Helm
    print("  Adding Helm repos...")
    run_on("app1", "helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null; helm repo add grafana https://grafana.github.io/helm-charts 2>/dev/null; helm repo update 2>/dev/null", timeout=120)
    
    print("  Installing kube-prometheus-stack (this may take a few minutes)...")
    helm_cmd = f"""helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --set grafana.adminPassword='{grafana_pw}' \
        --set grafana.service.type=ClusterIP \
        --set prometheus.prometheusSpec.retention=30d \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.accessModes[0]=ReadWriteOnce \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
        --set alertmanager.enabled=true \
        --set grafana.persistence.enabled=false \
        --timeout 5m \
        2>&1"""
    out, err = run_on("app1", helm_cmd, timeout=360)
    print(f"  Helm install output: {out[-500:]}")
    if err:
        print(f"  Helm errors: {err[-300:]}")
    
    # Install Loki
    print("  Installing Loki...")
    loki_cmd = """helm upgrade --install loki grafana/loki-stack \
        --namespace monitoring \
        --set grafana.enabled=false \
        --set promtail.enabled=true \
        --set loki.persistence.enabled=false \
        --timeout 5m \
        2>&1"""
    out, err = run_on("app1", loki_cmd, timeout=360)
    print(f"  Loki install: {out[-300:]}")
    
    # Wait and check
    time.sleep(15)
    out, _ = run_on("app1", "kubectl get pods -n monitoring --no-headers 2>/dev/null")
    print(f"\n  Monitoring pods:\n{out}")
else:
    # Namespace exists but maybe pods are starting
    time.sleep(5)
    out, _ = run_on("app1", "kubectl get pods -n monitoring --no-headers 2>/dev/null")
    print(f"  Existing monitoring pods:\n{out}")

print("\nFixes applied!")
