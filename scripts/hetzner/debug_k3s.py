#!/usr/bin/env python3
"""Debug K3s installation on app1."""

import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("95.216.245.40", username="root", password="2R2ht?gALF7%L%", timeout=30)

def run(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

print("=== K3s Service Status ===")
out, _ = run("systemctl is-active k3s")
print(f"Status: {out}")

print("\n=== K3s Binary ===")
out, _ = run("which k3s; k3s --version 2>/dev/null")
print(out)

print("\n=== K3s Process ===")
out, _ = run("ps aux | grep k3s | grep -v grep")
print(out)

print("\n=== K3s Service File ===")
out, _ = run("cat /etc/systemd/system/k3s.service 2>/dev/null | head -20")
print(out)
if not out:
    out, _ = run("systemctl cat k3s 2>/dev/null | head -20")
    print(out)

print("\n=== K3s Rancher Directory ===")
out, _ = run("ls -la /var/lib/rancher/ 2>/dev/null")
print(out if out else "Directory not found")

out, _ = run("find /var/lib/rancher -maxdepth 3 -type f -name 'node-token' 2>/dev/null")
print(f"Token file search: {out if out else 'not found'}")

out, _ = run("find / -name 'node-token' -type f 2>/dev/null")
print(f"Global token search: {out if out else 'not found anywhere'}")

print("\n=== kubectl ===")
out, _ = run("kubectl get nodes 2>/dev/null")
print(out)

out, _ = run("which kubectl; ls -la /usr/local/bin/kubectl 2>/dev/null")
print(out)

print("\n=== K3s Config ===")
out, _ = run("cat /etc/rancher/k3s/config.yaml 2>/dev/null || echo 'no config.yaml'")
print(out)

print("\n=== K3s Environment ===")
out, _ = run("cat /etc/systemd/system/k3s.service.env 2>/dev/null || echo 'no env file'")
print(out)

print("\n=== Recent K3s Logs ===")
out, _ = run("journalctl -u k3s --no-pager -n 30 2>/dev/null")
print(out)

ssh.close()
