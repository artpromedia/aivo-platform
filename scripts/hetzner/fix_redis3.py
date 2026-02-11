#!/usr/bin/env python3
"""Fix Redis systemd service type on aivo-db1."""

import paramiko
import json
import os
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(SCRIPT_DIR, "credentials.json")) as f:
    creds = json.load(f)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("95.217.76.42", username="root", password="Ebmx9V_r?a38NM")

def run(cmd, timeout=60):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

redis_pw = creds["redis_password"]

# The issue: Redis 8.x Type=notify but not sending sd_notify. Override to Type=simple
# and also add ReadWriteDirectories for /data
print("Step 1: Update systemd override to fix Type=notify issue...")
channel = ssh.get_transport().open_session()
channel.exec_command("cat > /etc/systemd/system/redis-server.service.d/override.conf")
override_content = """[Service]
Type=simple
ReadWriteDirectories=-/data/secondary/redis
"""
channel.sendall(override_content.encode())
channel.shutdown_write()
channel.recv_exit_status()
print("  Override written.")

print("Step 2: Stop Redis, reload systemd, start Redis...")
run("systemctl stop redis-server", timeout=30)
time.sleep(1)
run("systemctl daemon-reload", timeout=30)
time.sleep(1)
run("systemctl reset-failed redis-server 2>/dev/null", timeout=10)
out, err = run("systemctl start redis-server", timeout=30)
print(f"  Start result: {err if err else 'OK'}")
time.sleep(2)

print("Step 3: Check status...")
out, _ = run("systemctl is-active redis-server")
print(f"  Status: {out}")

if out == "active":
    print("  ✅ Redis is active!")
    
    # Test auth
    channel2 = ssh.get_transport().open_session()
    channel2.exec_command(f"redis-cli -a '{redis_pw}' --no-auth-warning ping")
    result = channel2.makefile().read().strip()
    print(f"  PING: {result}")
    
    channel3 = ssh.get_transport().open_session()
    channel3.exec_command(f"redis-cli -a '{redis_pw}' --no-auth-warning info server | head -5")
    result = channel3.makefile().read().strip()
    print(f"  Info: {result}")
else:
    out, _ = run("journalctl -u redis-server --no-pager -n 10 --since '1 minute ago'")
    print(f"  Journal:\n{out}")

# Final full check
print("\n=== PHASE 2 COMPLETE VERIFICATION ===")
for svc in ["redis-server", "postgresql", "pgbouncer"]:
    out, _ = run(f"systemctl is-active {svc}")
    symbol = "✅" if out == "active" else "❌"
    print(f"  {symbol} {svc}: {out}")

out, _ = run("sudo -u postgres psql -t -c \"SELECT count(*) FROM pg_database WHERE datname LIKE 'aivo_%';\"")
count = out.strip()
symbol = "✅" if count == "26" else "❌"
print(f"  {symbol} AIVO databases: {count}")

out, _ = run("crontab -l 2>/dev/null | grep backup")
symbol = "✅" if out else "❌"
print(f"  {symbol} Backup cron: {'configured' if out else 'MISSING'}")

out, _ = run("ufw status | grep -c ALLOW")
print(f"  ✅ Firewall rules: {out} active rules")

ssh.close()
print("\nPhase 2 fix complete!")
