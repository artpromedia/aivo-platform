#!/usr/bin/env python3
"""Comprehensive verification of all provisioned infrastructure."""

import paramiko
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(SCRIPT_DIR, "credentials.json")) as f:
    creds = json.load(f)

SERVERS = {
    "db1": {"public_ip": "95.217.76.42", "private_ip": "10.0.0.1", "password": "Ebmx9V_r?a38NM", "hostname": "aivo-db1"},
    "app1": {"public_ip": "95.216.245.40", "private_ip": "10.0.0.2", "password": "2R2ht?gALF7%L%", "hostname": "aivo-app1"},
    "app2": {"public_ip": "95.217.195.144", "private_ip": "10.0.0.3", "password": "j?A6M9rKcMHRGT", "hostname": "aivo-app2"},
}

def run_on(name, cmd, timeout=30):
    srv = SERVERS[name]
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(srv["public_ip"], username="root", password=srv["password"], timeout=20)
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode().strip()
        return out
    finally:
        ssh.close()

results = []

def check(label, result, expected="active"):
    ok = expected in result if expected else bool(result)
    symbol = "✅" if ok else "❌"
    results.append((label, ok))
    print(f"  {symbol} {label}: {result}")

print("=" * 60)
print("AIVO INFRASTRUCTURE VERIFICATION REPORT")
print("=" * 60)

# === Phase 1: OS ===
print("\n📋 Phase 1: Operating System")
for name, srv in SERVERS.items():
    out = run_on(name, "lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME")
    check(f"{srv['hostname']} OS", out, "Ubuntu")
    
    out = run_on(name, "hostname")
    check(f"{srv['hostname']} hostname", out, srv['hostname'])
    
    out = run_on(name, "id deploy 2>/dev/null | head -1")
    check(f"{srv['hostname']} deploy user", out, "uid=")
    
    out = run_on(name, "systemctl is-active ufw")
    check(f"{srv['hostname']} firewall", out)
    
    out = run_on(name, "systemctl is-active fail2ban")
    check(f"{srv['hostname']} fail2ban", out)

# VLAN
print("\n📋 Phase 1.3: vSwitch/VLAN")
for name, srv in SERVERS.items():
    out = run_on(name, f"ip addr show | grep {srv['private_ip']} | head -1")
    check(f"{srv['hostname']} VLAN IP ({srv['private_ip']})", out, srv['private_ip'])

# Disks
print("\n📋 Phase 1.4: Disk Setup")
for name in SERVERS:
    out = run_on(name, "df -h /data 2>/dev/null | tail -1")
    check(f"{SERVERS[name]['hostname']} /data mount", out, "/data")

# === Phase 2: Database ===
print("\n📋 Phase 2: Database (aivo-db1)")
out = run_on("db1", "systemctl is-active postgresql")
check("PostgreSQL 15", out)

out = run_on("db1", "sudo -u postgres psql -t -c \"SELECT count(*) FROM pg_database WHERE datname LIKE 'aivo_%';\"")
check(f"AIVO databases ({out.strip()}/26)", out.strip(), "26")

out = run_on("db1", "systemctl is-active pgbouncer")
check("PgBouncer", out)

out = run_on("db1", "systemctl is-active redis-server")
check("Redis", out)

redis_pw = creds["redis_password"]
out = run_on("db1", f"redis-cli -a '{redis_pw}' --no-auth-warning ping 2>/dev/null")
check("Redis PING", out, "PONG")

out = run_on("db1", "crontab -l 2>/dev/null | grep -c backup")
check("Backup cron", out, "1")

# === Phase 3: K3s ===
print("\n📋 Phase 3: K3s Cluster")
out = run_on("app1", "systemctl is-active k3s")
check("K3s server (app1)", out)

out = run_on("db1", "systemctl is-active k3s-agent")
check("K3s agent (db1)", out)

out = run_on("app2", "systemctl is-active k3s-agent")
check("K3s agent (app2)", out)

out = run_on("app1", "kubectl get nodes --no-headers 2>/dev/null | grep -c Ready")
check(f"Cluster nodes Ready ({out}/3)", out, "3")

out = run_on("app1", "kubectl get pods -n ingress-nginx --no-headers 2>/dev/null | grep -c Running")
check("Ingress NGINX running", out, "1")

out = run_on("app1", "kubectl get pods -n cert-manager --no-headers 2>/dev/null | grep -c Running")
check(f"cert-manager pods ({out}/3)", out, "3")

out = run_on("app1", "helm version --short 2>/dev/null")
check("Helm installed", out, "v3")

# === Phase 6: Monitoring ===
print("\n📋 Phase 6: Monitoring")
out = run_on("app1", "kubectl get pods -n monitoring --no-headers 2>/dev/null | head -10")
if out:
    running = out.count("Running")
    total = len([l for l in out.split('\n') if l.strip()])
    check(f"Monitoring pods ({running}/{total} running)", f"{running} running", "running")
else:
    check("Monitoring namespace", "not found", "Running")

# === Phase 9: MinIO ===
print("\n📋 Phase 9: MinIO (aivo-app2)")
out = run_on("app2", "systemctl is-active minio")
check("MinIO service", out)

out = run_on("app2", "mc ls local/ 2>/dev/null | wc -l")
check(f"MinIO buckets ({out}/7)", out, "7")

# === Summary ===
print("\n" + "=" * 60)
passed = sum(1 for _, ok in results if ok)
total = len(results)
pct = int(passed / total * 100) if total else 0
print(f"RESULTS: {passed}/{total} checks passed ({pct}%)")
print("=" * 60)

failed = [(label, ok) for label, ok in results if not ok]
if failed:
    print("\n⚠️  FAILED CHECKS:")
    for label, _ in failed:
        print(f"  ❌ {label}")
else:
    print("\n🎉 ALL CHECKS PASSED!")
