#!/usr/bin/env python3
"""Verify vSwitch private network connectivity between all 3 servers."""

import paramiko

SERVERS = {
    "db1":  {"public_ip": "95.217.76.42",    "private_ip": "10.0.0.1", "password": "Ebmx9V_r?a38NM", "hostname": "aivo-db1"},
    "app1": {"public_ip": "95.216.245.40",   "private_ip": "10.0.0.2", "password": "2R2ht?gALF7%L%", "hostname": "aivo-app1"},
    "app2": {"public_ip": "95.217.195.144",  "private_ip": "10.0.0.3", "password": "j?A6M9rKcMHRGT", "hostname": "aivo-app2"},
}

def run_cmd(name, cmd, timeout=15):
    """Run a single command on a server with a fresh SSH connection."""
    srv = SERVERS[name]
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(srv["public_ip"], username="root", password=srv["password"], timeout=20)
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        ssh.close()
        return out, err
    except Exception as e:
        try:
            ssh.close()
        except:
            pass
        return f"ERROR: {e}", ""

print("=" * 60)
print("VSWITCH PRIVATE NETWORK CONNECTIVITY TEST")
print("=" * 60)

results = []

# Test ping from each server to every other server on private IPs
pairs = [
    ("db1",  "app1", "10.0.0.2"),
    ("db1",  "app2", "10.0.0.3"),
    ("app1", "db1",  "10.0.0.1"),
    ("app1", "app2", "10.0.0.3"),
    ("app2", "db1",  "10.0.0.1"),
    ("app2", "app1", "10.0.0.2"),
]

print("\n📡 Ping Tests (private network):")
for src, dst, dst_ip in pairs:
    out, err = run_cmd(src, f"ping -c 2 -W 2 {dst_ip} 2>&1 | tail -2")
    ok = "0% packet loss" in out
    symbol = "✅" if ok else "❌"
    label = f"{SERVERS[src]['hostname']} → {SERVERS[dst]['hostname']} ({dst_ip})"
    results.append((label, ok))
    rtt = [l for l in out.split('\n') if 'rtt' in l or 'round-trip' in l]
    rtt_info = rtt[0] if rtt else out
    print(f"  {symbol} {label}: {rtt_info}")

# Test services over private network
print("\n📡 Service Connectivity (private network):")

tests = [
    ("app1", "db1",  "10.0.0.1", 5432, "PostgreSQL"),
    ("app2", "db1",  "10.0.0.1", 5432, "PostgreSQL"),
    ("app1", "db1",  "10.0.0.1", 6379, "Redis"),
    ("app2", "db1",  "10.0.0.1", 6379, "Redis"),
    ("app1", "db1",  "10.0.0.1", 6432, "PgBouncer"),
    ("db1",  "app1", "10.0.0.2", 6443, "K3s API"),
    ("app2", "app1", "10.0.0.2", 6443, "K3s API"),
    ("app1", "app2", "10.0.0.3", 9000, "MinIO"),
    ("db1",  "app2", "10.0.0.3", 9000, "MinIO"),
]

for src, dst, dst_ip, port, svc in tests:
    out, _ = run_cmd(src, f"nc -z -w3 {dst_ip} {port} && echo OK || echo FAIL")
    ok = "OK" in out
    label = f"{src} → {dst} {svc}:{port}"
    results.append((label, ok))
    print(f"  {'✅' if ok else '❌'} {label}: {out}")

# Update Redis to bind on private IP too
print("\n🔧 Updating Redis to bind on private IP (10.0.0.1)...")
out, _ = run_cmd("db1", "grep '^bind ' /etc/redis/redis.conf")
print(f"  Current bind config: {out}")

if "10.0.0.1" not in out:
    out, _ = run_cmd("db1", "sed -i 's/^bind 127.0.0.1.*/bind 10.0.0.1 127.0.0.1/' /etc/redis/redis.conf && systemctl restart redis-server && sleep 2 && systemctl is-active redis-server")
    print(f"  Updated and restarted Redis: {out}")
else:
    print(f"  Redis already bound to 10.0.0.1, no change needed")

# Re-check Redis from app servers after update
out, _ = run_cmd("app1", "nc -z -w3 10.0.0.1 6379 && echo OK || echo FAIL")
print(f"  {'✅' if 'OK' in out else '❌'} app1 → db1 Redis (10.0.0.1:6379): {out}")

out, _ = run_cmd("app2", "nc -z -w3 10.0.0.1 6379 && echo OK || echo FAIL")
print(f"  {'✅' if 'OK' in out else '❌'} app2 → db1 Redis (10.0.0.1:6379): {out}")

# Also check PostgreSQL listen address
print("\n🔧 Checking PostgreSQL listen address...")
out, _ = run_cmd("db1", "grep -E '^listen_addresses' /etc/postgresql/15/main/postgresql.conf || echo 'NOT SET (uses default)'")
print(f"  Current: {out}")
if out and "10.0.0.1" not in out and "NOT SET" not in out and "*" not in out:
    print("  Updating to include 10.0.0.1...")
    run_cmd("db1", "sed -i \"s/^listen_addresses.*/listen_addresses = '10.0.0.1,127.0.0.1'/\" /etc/postgresql/15/main/postgresql.conf && systemctl restart postgresql && sleep 2 && systemctl is-active postgresql")
    out2, _ = run_cmd("db1", "systemctl is-active postgresql")
    print(f"  PostgreSQL restarted: {out2}")

# Check K3s nodes status
print("\n📡 K3s Cluster Status:")
out, _ = run_cmd("app1", "KUBECONFIG=/root/.kube/config kubectl get nodes -o wide 2>&1")
print(f"  {out}")

# Summary
print("\n" + "=" * 60)
passed = sum(1 for _, ok in results if ok)
total = len(results)
print(f"RESULTS: {passed}/{total} connectivity checks passed")
print("=" * 60)

failed = [(l, ok) for l, ok in results if not ok]
if failed:
    print("\n⚠️  FAILED:")
    for l, _ in failed:
        print(f"  ❌ {l}")
else:
    print("\n🎉 ALL CONNECTIVITY CHECKS PASSED!")
    print("   Private network (vSwitch VLAN 4000) is fully operational.")
