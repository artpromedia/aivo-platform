#!/usr/bin/env python3
"""Lock down HTTP/HTTPS ports to Cloudflare IPs only on app1 and app2."""

import paramiko
import time

CLOUDFLARE_IPV4 = [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
]

SERVERS = [
    {"host": "95.216.245.40", "name": "app1"},
    {"host": "95.217.195.144", "name": "app2"},
]

def run_cmd(ssh, cmd, label=""):
    print(f"  > {label or cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out.strip():
        print(out.strip())
    if err.strip():
        print(f"  STDERR: {err.strip()}")
    return out

def lockdown_server(server):
    host = server["host"]
    name = server["name"]
    print(f"\n{'='*60}")
    print(f"Locking down {name} ({host})")
    print(f"{'='*60}")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username="root", key_filename=r"C:\Users\ofema\.ssh\id_ed25519")

    # Get current rules to find which ones to delete
    out = run_cmd(ssh, "ufw status numbered", "Current rules")

    # Delete open HTTP/HTTPS rules - must go in reverse order
    # Find rule numbers for "80/tcp" and "443/tcp" that ALLOW from Anywhere
    lines = out.strip().split("\n")
    rules_to_delete = []
    for line in lines:
        if ("80/tcp" in line or "443/tcp" in line) and "Anywhere" in line and "Cloudflare" not in line:
            # Extract rule number
            try:
                num = int(line.split("]")[0].replace("[", "").strip())
                rules_to_delete.append(num)
            except (ValueError, IndexError):
                pass

    # Delete in reverse order to avoid index shifting
    rules_to_delete.sort(reverse=True)
    for num in rules_to_delete:
        run_cmd(ssh, f"ufw --force delete {num}", f"Delete rule {num}")

    # Add Cloudflare IP rules
    print(f"\n  Adding {len(CLOUDFLARE_IPV4)} Cloudflare IP ranges...")
    for ip in CLOUDFLARE_IPV4:
        run_cmd(ssh, f"ufw allow from {ip} to any port 80,443 proto tcp comment 'Cloudflare'", f"Allow {ip}")

    # Show final state
    print("\n  === Final firewall rules ===")
    run_cmd(ssh, "ufw status numbered", "Final rules")

    ssh.close()
    print(f"\n✅ {name} locked down to Cloudflare IPs only")

if __name__ == "__main__":
    for server in SERVERS:
        lockdown_server(server)
    print("\n🔒 Firewall lockdown complete on both app servers!")
