#!/usr/bin/env python3
"""Fix K3s cluster - get token from server and join agents."""

import paramiko
import json
import os
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(SCRIPT_DIR, "credentials.json")) as f:
    creds = json.load(f)

SERVERS = {
    "db1": {"public_ip": "95.217.76.42", "private_ip": "10.0.0.1", "password": "Ebmx9V_r?a38NM", "hostname": "aivo-db1"},
    "app1": {"public_ip": "95.216.245.40", "private_ip": "10.0.0.2", "password": "2R2ht?gALF7%L%", "hostname": "aivo-app1"},
    "app2": {"public_ip": "95.217.195.144", "private_ip": "10.0.0.3", "password": "j?A6M9rKcMHRGT", "hostname": "aivo-app2"},
}

def connect(name):
    srv = SERVERS[name]
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(srv["public_ip"], username="root", password=srv["password"])
    return ssh

def run(ssh, cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

# Step 1: Check K3s server status on app1
print("=== Step 1: Check K3s server on app1 ===")
app1 = connect("app1")
out, err = run(app1, "systemctl is-active k3s")
print(f"  K3s service: {out}")

if out != "active":
    print("  K3s not active, checking logs...")
    out, _ = run(app1, "journalctl -u k3s --no-pager -n 20")
    print(f"  Logs:\n{out}")
    
    # Try restarting
    print("  Restarting K3s...")
    run(app1, "systemctl restart k3s", timeout=60)
    time.sleep(10)
    out, _ = run(app1, "systemctl is-active k3s")
    print(f"  K3s after restart: {out}")

# Step 2: Get node token
print("\n=== Step 2: Get node token ===")
out, err = run(app1, "cat /var/lib/rancher/k3s/server/node-token")
if out and "No such file" not in out and "No such file" not in err:
    NODE_TOKEN = out
    print(f"  Token: {NODE_TOKEN[:20]}...")
else:
    print(f"  Token not found! Checking if K3s is ready...")
    # Wait and retry
    for i in range(5):
        time.sleep(10)
        out, err = run(app1, "cat /var/lib/rancher/k3s/server/node-token")
        if out and "No such file" not in err:
            NODE_TOKEN = out
            print(f"  Token found after {(i+1)*10}s: {NODE_TOKEN[:20]}...")
            break
    else:
        print("  ERROR: Could not get token after 50s")
        # Check what's there
        out, _ = run(app1, "ls -la /var/lib/rancher/k3s/server/")
        print(f"  Server dir:\n{out}")
        app1.close()
        exit(1)

# Step 3: Check current nodes
print("\n=== Step 3: Current cluster nodes ===")
out, _ = run(app1, "kubectl get nodes -o wide 2>/dev/null")
print(f"  {out}")

# Step 4: Fix agent on db1
print("\n=== Step 4: Fix K3s agent on db1 ===")
db1 = connect("db1")

# Stop and uninstall existing broken agent
out, _ = run(db1, "systemctl stop k3s-agent 2>/dev/null; /usr/local/bin/k3s-agent-uninstall.sh 2>/dev/null; echo done")
print(f"  Cleanup: {out}")

# Reinstall agent
K3S_URL = f"https://{SERVERS['app1']['private_ip']}:6443"
install_cmd = f"""
export INSTALL_K3S_EXEC="agent"
export K3S_URL="{K3S_URL}"
export K3S_TOKEN="{NODE_TOKEN}"
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="agent --node-name {SERVERS['db1']['hostname']} --node-ip {SERVERS['db1']['private_ip']} --flannel-iface eno1" sh -
sleep 5
systemctl is-active k3s-agent
"""
out, err = run(db1, install_cmd, timeout=120)
print(f"  Install result: {out}")
if err:
    print(f"  Errors: {err[-500:]}")

# Taint db1 node
time.sleep(5)
out, _ = run(app1, f"kubectl taint nodes {SERVERS['db1']['hostname']} role=database:NoSchedule --overwrite 2>/dev/null || true")
print(f"  Taint db1: {out}")
out, _ = run(app1, f"kubectl label nodes {SERVERS['db1']['hostname']} role=database --overwrite 2>/dev/null || true")
print(f"  Label db1: {out}")

db1.close()

# Step 5: Fix agent on app2
print("\n=== Step 5: Fix K3s agent on app2 ===")
app2 = connect("app2")

out, _ = run(app2, "systemctl stop k3s-agent 2>/dev/null; /usr/local/bin/k3s-agent-uninstall.sh 2>/dev/null; echo done")
print(f"  Cleanup: {out}")

install_cmd = f"""
export INSTALL_K3S_EXEC="agent"
export K3S_URL="{K3S_URL}"
export K3S_TOKEN="{NODE_TOKEN}"
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="agent --node-name {SERVERS['app2']['hostname']} --node-ip {SERVERS['app2']['private_ip']} --flannel-iface enp5s0" sh -
sleep 5
systemctl is-active k3s-agent
"""
out, err = run(app2, install_cmd, timeout=120)
print(f"  Install result: {out}")
if err:
    print(f"  Errors: {err[-500:]}")

# Label app2
time.sleep(5)
out, _ = run(app1, f"kubectl label nodes {SERVERS['app2']['hostname']} role=app --overwrite 2>/dev/null || true")
print(f"  Label app2: {out}")

app2.close()

# Step 6: Final verification
print("\n=== Step 6: Final cluster verification ===")
time.sleep(10)
out, _ = run(app1, "kubectl get nodes -o wide")
print(f"  Nodes:\n{out}")

out, _ = run(app1, "kubectl get pods -A")
print(f"\n  All pods:\n{out}")

app1.close()
print("\nK3s cluster fix complete!")
