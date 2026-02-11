#!/usr/bin/env python3
"""Fix Redis on aivo-db1 - step by step with proper timeouts."""

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

# Step 1: Fix ownership
print("Step 1: Fix ownership...")
out, err = run("chown -R redis:redis /data/secondary/redis; mkdir -p /var/log/redis; chown -R redis:redis /var/log/redis")
print(f"  Done. {err}" if err else "  Done.")

# Step 2: Create systemd override
print("Step 2: Create systemd override...")
out, err = run("mkdir -p /etc/systemd/system/redis-server.service.d")
run("""cat > /etc/systemd/system/redis-server.service.d/override.conf << 'EOF'
[Service]
ReadWriteDirectories=-/data/secondary/redis
EOF""")
print("  Done.")

# Step 3: Reload systemd
print("Step 3: Reload systemd...")
out, err = run("systemctl daemon-reload", timeout=60)
print(f"  Done. {err}" if err else "  Done.")

# Step 4: Reset failed state
print("Step 4: Reset failed state...")
out, err = run("systemctl reset-failed redis-server", timeout=30)
print(f"  Done. {err}" if err else "  Done.")

# Step 5: Start Redis
print("Step 5: Start Redis...")
out, err = run("systemctl start redis-server", timeout=60)
print(f"  stdout: {out}")
if err:
    print(f"  stderr: {err}")

time.sleep(3)

# Step 6: Check status
print("Step 6: Check status...")
out, err = run("systemctl is-active redis-server")
print(f"  Status: {out}")

if out != "active":
    print("  Redis still not active, checking journal...")
    out, err = run("journalctl -u redis-server --no-pager -n 20 --since '2 minutes ago'")
    print(f"  Journal:\n{out}")
    
    # Check Redis log file
    out, _ = run("cat /var/log/redis/redis-server.log 2>/dev/null | tail -20")
    print(f"  Redis log:\n{out}")
    
    # Try running Redis manually to see error
    print("  Trying manual run...")
    out, err = run("redis-server /etc/redis/redis.conf --daemonize no 2>&1 & sleep 3; redis-cli ping; kill %1 2>/dev/null", timeout=15)
    print(f"  Manual: {out}")
else:
    # Test connection
    out, _ = run("redis-cli ping")
    print(f"  PING (no auth): {out}")
    
    channel = ssh.get_transport().open_session()
    channel.exec_command(f"redis-cli -a '{redis_pw}' --no-auth-warning ping")
    result = channel.makefile().read().strip()
    print(f"  PING (with auth): {result}")

# Final verification
print("\n=== FINAL STATUS ===")
for svc in ["redis-server", "postgresql", "pgbouncer"]:
    out, _ = run(f"systemctl is-active {svc}")
    print(f"  {svc}: {out}")

out, _ = run("sudo -u postgres psql -t -c \"SELECT count(*) FROM pg_database WHERE datname LIKE 'aivo_%';\"")
print(f"  AIVO databases: {out.strip()}")

out, _ = run("crontab -l 2>/dev/null | grep backup")
print(f"  Backup cron: {'configured' if out else 'MISSING'}")

ssh.close()
print("\nDone.")
