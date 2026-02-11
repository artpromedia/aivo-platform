#!/usr/bin/env python3
"""Find K3s token and fix cluster."""

import paramiko
import time

SERVERS = {
    "db1": {"public_ip": "95.217.76.42", "private_ip": "10.0.0.1", "password": "Ebmx9V_r?a38NM", "hostname": "aivo-db1", "nic": "eno1"},
    "app1": {"public_ip": "95.216.245.40", "private_ip": "10.0.0.2", "password": "2R2ht?gALF7%L%", "hostname": "aivo-app1", "nic": "eno1"},
    "app2": {"public_ip": "95.217.195.144", "private_ip": "10.0.0.3", "password": "j?A6M9rKcMHRGT", "hostname": "aivo-app2", "nic": "enp5s0"},
}

def run_on(name, cmd, timeout=60):
    srv = SERVERS[name]
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(srv["public_ip"], username="root", password=srv["password"], timeout=30)
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        return out, err
    finally:
        ssh.close()

# Check data-dir config
print("=== K3s data directory ===")
out, _ = run_on("app1", "cat /etc/systemd/system/k3s.service | grep ExecStart")
print(f"ExecStart: {out}")

out, _ = run_on("app1", "cat /etc/systemd/system/k3s.service.env 2>/dev/null || echo 'no env'")
print(f"Env: {out}")

# Search for token in /data/k3s
out, _ = run_on("app1", "find /data/k3s -name 'node-token' 2>/dev/null || echo 'not in /data/k3s'")
print(f"Token in /data/k3s: {out}")

# Check /data/k3s structure
out, _ = run_on("app1", "ls -la /data/k3s/server/ 2>/dev/null || echo 'no server dir'")
print(f"/data/k3s/server/: {out}")

# Check K3s ExecStart full
out, _ = run_on("app1", "systemctl cat k3s | grep -A5 ExecStart")
print(f"\nFull ExecStart:\n{out}")

# Also check default location just in case
out, _ = run_on("app1", "ls -la /var/lib/rancher/k3s/ 2>/dev/null")
print(f"\n/var/lib/rancher/k3s/: {out}")

out, _ = run_on("app1", "ls -la /var/lib/rancher/k3s/server/ 2>/dev/null || echo 'no server dir at default'")
print(f"Default server/: {out}")

# kubectl works - check nodes
out, _ = run_on("app1", "kubectl get nodes -o wide 2>/dev/null")
print(f"\nNodes: {out}")
