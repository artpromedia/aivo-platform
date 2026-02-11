#!/usr/bin/env python3
"""Join db1 and app2 to K3s cluster using correct token path."""

import paramiko
import time

SERVERS = {
    "db1": {"public_ip": "95.217.76.42", "private_ip": "10.0.0.1", "password": "Ebmx9V_r?a38NM", "hostname": "aivo-db1", "nic": "eno1", "vlan_nic": "eno1.4000"},
    "app1": {"public_ip": "95.216.245.40", "private_ip": "10.0.0.2", "password": "2R2ht?gALF7%L%", "hostname": "aivo-app1", "nic": "eno1", "vlan_nic": "eno1.4000"},
    "app2": {"public_ip": "95.217.195.144", "private_ip": "10.0.0.3", "password": "j?A6M9rKcMHRGT", "hostname": "aivo-app2", "nic": "enp5s0", "vlan_nic": "enp5s0.4000"},
}

def run_on(name, cmd, timeout=120):
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

# Step 1: Get token from correct path
print("=== Step 1: Get K3s node token ===")
token, _ = run_on("app1", "cat /data/k3s/server/node-token")
print(f"  Token: {token[:40]}...")

K3S_URL = "https://10.0.0.2:6443"

# Step 2: Clean up and join db1
print("\n=== Step 2: Join db1 as agent ===")
# Remove any old install
out, _ = run_on("db1", "systemctl stop k3s-agent 2>/dev/null; /usr/local/bin/k3s-agent-uninstall.sh 2>/dev/null; echo cleaned")
print(f"  Cleanup: {out}")
time.sleep(2)

# Install agent with correct data-dir and flannel interface
join_cmd = (
    f'curl -sfL https://get.k3s.io | '
    f'K3S_URL="{K3S_URL}" '
    f'K3S_TOKEN="{token}" '
    f'INSTALL_K3S_EXEC="agent '
    f'--node-name aivo-db1 '
    f'--node-ip 10.0.0.1 '
    f'--flannel-iface eno1.4000 '
    f'--data-dir /data/k3s" sh -'
)
print("  Installing K3s agent on db1...")
out, err = run_on("db1", join_cmd, timeout=120)
last_lines = out.split('\n')[-5:] if out else []
print(f"  Output: {chr(10).join(last_lines)}")
if err:
    err_lines = err.split('\n')[-5:] if err else []
    print(f"  Stderr: {chr(10).join(err_lines)}")

time.sleep(8)
out, _ = run_on("db1", "systemctl is-active k3s-agent")
print(f"  Agent status: {out}")

if out != "active":
    out, _ = run_on("db1", "journalctl -u k3s-agent --no-pager -n 15")
    print(f"  Journal:\n{out}")

# Step 3: Clean up and join app2
print("\n=== Step 3: Join app2 as agent ===")
out, _ = run_on("app2", "systemctl stop k3s-agent 2>/dev/null; /usr/local/bin/k3s-agent-uninstall.sh 2>/dev/null; echo cleaned")
print(f"  Cleanup: {out}")
time.sleep(2)

join_cmd = (
    f'curl -sfL https://get.k3s.io | '
    f'K3S_URL="{K3S_URL}" '
    f'K3S_TOKEN="{token}" '
    f'INSTALL_K3S_EXEC="agent '
    f'--node-name aivo-app2 '
    f'--node-ip 10.0.0.3 '
    f'--flannel-iface enp5s0.4000 '
    f'--data-dir /data/k3s" sh -'
)
print("  Installing K3s agent on app2...")
out, err = run_on("app2", join_cmd, timeout=120)
last_lines = out.split('\n')[-5:] if out else []
print(f"  Output: {chr(10).join(last_lines)}")
if err:
    err_lines = err.split('\n')[-5:] if err else []
    print(f"  Stderr: {chr(10).join(err_lines)}")

time.sleep(8)
out, _ = run_on("app2", "systemctl is-active k3s-agent")
print(f"  Agent status: {out}")

if out != "active":
    out, _ = run_on("app2", "journalctl -u k3s-agent --no-pager -n 15")
    print(f"  Journal:\n{out}")

# Step 4: Label and taint
print("\n=== Step 4: Label and taint nodes ===")
time.sleep(10)

run_on("app1", "kubectl label nodes aivo-db1 role=database --overwrite 2>/dev/null; kubectl taint nodes aivo-db1 role=database:NoSchedule --overwrite 2>/dev/null")
run_on("app1", "kubectl label nodes aivo-app1 role=app --overwrite 2>/dev/null")
run_on("app1", "kubectl label nodes aivo-app2 role=app --overwrite 2>/dev/null")
print("  Done.")

# Step 5: Verify
print("\n=== Step 5: Final verification ===")
time.sleep(5)
out, _ = run_on("app1", "kubectl get nodes -o wide")
print(f"Nodes:\n{out}")

out, _ = run_on("app1", "kubectl get pods -A")
print(f"\nPods:\n{out}")

print("\nK3s cluster join complete!")
