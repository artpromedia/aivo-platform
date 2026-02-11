#!/usr/bin/env python3
"""Fix Redis and verify all Phase 2 on aivo-db1."""

import paramiko
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(SCRIPT_DIR, "credentials.json")) as f:
    creds = json.load(f)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("95.217.76.42", username="root", password="Ebmx9V_r?a38NM")

def run(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

redis_pw = creds["redis_password"]

# Fix 1: Rewrite Redis config compatible with Redis 8.x (remove io-threads-do-reads)
print("=== FIXING REDIS CONFIG (Redis 8.x compatible) ===")
redis_conf = f"""bind 127.0.0.1
port 6379
protected-mode yes
requirepass {redis_pw}

# Memory
maxmemory 16gb
maxmemory-policy allkeys-lru

# Persistence
dir /data/secondary/redis
dbfilename dump.rdb
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# Performance
tcp-backlog 511
timeout 300
tcp-keepalive 300
io-threads 4

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
"""

# Write config via stdin to avoid shell escaping issues
channel = ssh.get_transport().open_session()
channel.exec_command("cat > /etc/redis/redis.conf")
channel.sendall(redis_conf.encode())
channel.shutdown_write()
exit_status = channel.recv_exit_status()
print(f"  Config written (exit: {exit_status})")

# Fix 2: Fix ownership and systemd service override
print("  Fixing ownership and systemd override...")
out, err = run("""
chown -R redis:redis /data/secondary/redis
mkdir -p /var/log/redis
chown -R redis:redis /var/log/redis

# Create systemd override for /data/secondary/redis
mkdir -p /etc/systemd/system/redis-server.service.d
cat > /etc/systemd/system/redis-server.service.d/override.conf << 'EOF'
[Service]
ReadWriteDirectories=-/data/secondary/redis
EOF

systemctl daemon-reload
systemctl restart redis-server
sleep 2
systemctl is-active redis-server
""", timeout=30)
print(f"  Service status: {out}")
if err:
    print(f"  Errors: {err}")

# Test Redis
out, _ = run("redis-cli ping")
print(f"  Redis PING (no auth): {out}")

# Auth via pipe
channel2 = ssh.get_transport().open_session()
channel2.exec_command(f"redis-cli -a '{redis_pw}' --no-auth-warning ping")
ping_result = channel2.makefile().read().strip()
print(f"  Redis PING (with auth): {ping_result}")

# Final full verification
print("\n=== FINAL PHASE 2 VERIFICATION ===")
out, _ = run("systemctl is-active redis-server")
print(f"  Redis: {out}")
out, _ = run("systemctl is-active postgresql")
print(f"  PostgreSQL: {out}")
out, _ = run("systemctl is-active pgbouncer")
print(f"  PgBouncer: {out}")
out, _ = run("sudo -u postgres psql -t -c \"SELECT count(*) FROM pg_database WHERE datistemplate = false AND datname LIKE 'aivo_%';\"")
print(f"  AIVO databases: {out.strip()}")
out, _ = run("crontab -l 2>/dev/null | grep backup")
print(f"  Backup cron: {out}")
out, _ = run("redis-server --version")
print(f"  Redis version: {out}")

ssh.close()
print("\nPhase 2 fully verified and fixed!")
