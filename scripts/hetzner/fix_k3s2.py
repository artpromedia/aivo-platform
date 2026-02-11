#!/usr/bin/env python3
"""Fix K3s cluster - robust version with reconnection."""

import paramiko
import json
import os
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(SCRIPT_DIR, "credentials.json")) as f:
    creds = json.load(f)

SERVERS = {
    "db1": {"public_ip": "95.217.76.42", "private_ip": "10.0.0.1", "password": "Ebmx9V_r?a38NM", "hostname": "aivo-db1", "nic": "eno1"},
    "app1": {"public_ip": "95.216.245.40", "private_ip": "10.0.0.2", "password": "2R2ht?gALF7%L%", "hostname": "aivo-app1", "nic": "eno1"},
    "app2": {"public_ip": "95.217.195.144", "private_ip": "10.0.0.3", "password": "j?A6M9rKcMHRGT", "hostname": "aivo-app2", "nic": "enp5s0"},
}

def fresh_connect(name):
    srv = SERVERS[name]
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(srv["public_ip"], username="root", password=srv["password"], timeout=30)
    return ssh

def run_cmd(name, cmd, timeout=120):
    """Run a command with a fresh connection each time."""
    ssh = fresh_connect(name)
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        return out, err
    finally:
        ssh.close()

# Step 1: Check K3s server on app1
print("=== Step 1: Check K3s server on app1 ===")
out, err = run_cmd("app1", "systemctl is-active k3s")
print(f"  K3s service: {out}")

if out != "active":
    print("  Checking K3s logs...")
    out, _ = run_cmd("app1", "journalctl -u k3s --no-pager -n 15")
    print(f"  Logs:\n{out}")
    
    print("  Restarting K3s...")
    run_cmd("app1", "systemctl restart k3s", timeout=60)
    time.sleep(15)
    out, _ = run_cmd("app1", "systemctl is-active k3s")
    print(f"  After restart: {out}")

# Step 2: Get node token
print("\n=== Step 2: Get node token ===")
for attempt in range(6):
    out, err = run_cmd("app1", "cat /var/lib/rancher/k3s/server/node-token 2>/dev/null")
    if out and len(out) > 10:
        NODE_TOKEN = out
        print(f"  Token: {NODE_TOKEN[:30]}...")
        break
    print(f"  Attempt {attempt+1}: no token yet, waiting 10s...")
    time.sleep(10)
else:
    print("  ERROR: Could not get token!")
    out, _ = run_cmd("app1", "ls -la /var/lib/rancher/k3s/server/ 2>/dev/null || echo 'dir not found'")
    print(f"  Server dir: {out}")
    exit(1)

# Step 3: Current nodes
print("\n=== Step 3: Current nodes ===")
out, _ = run_cmd("app1", "kubectl get nodes -o wide 2>/dev/null")
print(f"  {out if out else 'No nodes yet'}")

K3S_URL = f"https://{SERVERS['app1']['private_ip']}:6443"

# Step 4: Join db1 as agent
print("\n=== Step 4: Join db1 as K3s agent ===")
# Clean up any previous install
out, _ = run_cmd("db1", "/usr/local/bin/k3s-agent-uninstall.sh 2>/dev/null; systemctl stop k3s-agent 2>/dev/null; echo cleanup-done", timeout=30)
print(f"  Cleanup: {out}")

install_cmd = f'curl -sfL https://get.k3s.io | K3S_URL="{K3S_URL}" K3S_TOKEN="{NODE_TOKEN}" INSTALL_K3S_EXEC="agent --node-name aivo-db1 --node-ip 10.0.0.1 --flannel-iface eno1" sh -'
print(f"  Installing K3s agent...")
out, err = run_cmd("db1", install_cmd, timeout=120)
print(f"  Result: {out[-200:]}")
if err:
    print(f"  Stderr: {err[-300:]}")

time.sleep(10)
out, _ = run_cmd("db1", "systemctl is-active k3s-agent")
print(f"  Agent status: {out}")

if out != "active":
    out, _ = run_cmd("db1", "journalctl -u k3s-agent --no-pager -n 10")
    print(f"  Agent logs:\n{out}")

# Step 5: Join app2 as agent
print("\n=== Step 5: Join app2 as K3s agent ===")
out, _ = run_cmd("app2", "/usr/local/bin/k3s-agent-uninstall.sh 2>/dev/null; systemctl stop k3s-agent 2>/dev/null; echo cleanup-done", timeout=30)
print(f"  Cleanup: {out}")

install_cmd = f'curl -sfL https://get.k3s.io | K3S_URL="{K3S_URL}" K3S_TOKEN="{NODE_TOKEN}" INSTALL_K3S_EXEC="agent --node-name aivo-app2 --node-ip 10.0.0.3 --flannel-iface enp5s0" sh -'
print(f"  Installing K3s agent...")
out, err = run_cmd("app2", install_cmd, timeout=120)
print(f"  Result: {out[-200:]}")
if err:
    print(f"  Stderr: {err[-300:]}")

time.sleep(10)
out, _ = run_cmd("app2", "systemctl is-active k3s-agent")
print(f"  Agent status: {out}")

if out != "active":
    out, _ = run_cmd("app2", "journalctl -u k3s-agent --no-pager -n 10")
    print(f"  Agent logs:\n{out}")

# Step 6: Label and taint nodes
print("\n=== Step 6: Label and taint nodes ===")
time.sleep(10)
run_cmd("app1", "kubectl taint nodes aivo-db1 role=database:NoSchedule --overwrite 2>/dev/null || true")
run_cmd("app1", "kubectl label nodes aivo-db1 role=database --overwrite 2>/dev/null || true")
run_cmd("app1", "kubectl label nodes aivo-app1 role=app --overwrite 2>/dev/null || true")
run_cmd("app1", "kubectl label nodes aivo-app2 role=app --overwrite 2>/dev/null || true")
print("  Labels and taints applied.")

# Step 7: Final verification
print("\n=== Step 7: Final cluster verification ===")
time.sleep(5)
out, _ = run_cmd("app1", "kubectl get nodes -o wide")
print(f"  Nodes:\n{out}")

out, _ = run_cmd("app1", "kubectl get pods -A --no-headers 2>/dev/null | head -20")
print(f"\n  Pods:\n{out}")

print("\nK3s cluster setup complete!")
