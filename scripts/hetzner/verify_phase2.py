#!/usr/bin/env python3
"""Verify Phase 2 database setup on aivo-db1."""

import paramiko
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(SCRIPT_DIR, "credentials.json")) as f:
    creds = json.load(f)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("95.217.76.42", username="root", password="Ebmx9V_r?a38NM")

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

print("=== REDIS STATUS ===")
out, _ = run("systemctl is-active redis-server")
print(f"  Redis service: {out}")

# Use redis-cli via stdin to avoid password on command line
out, err = run("redis-cli ping")
print(f"  Redis PING (no auth): {out} / {err}")

# Auth test via pipe
redis_pw = creds["redis_password"]
out, err = run(f"echo 'AUTH {redis_pw}' | redis-cli")
print(f"  Redis AUTH test: {out}")

out, err = run(f"redis-cli -a '{redis_pw}' ping 2>&1 | tail -1")
print(f"  Redis PING (with auth): {out}")

print()
print("=== POSTGRESQL STATUS ===")
out, _ = run("systemctl is-active postgresql")
print(f"  PostgreSQL service: {out}")

out, _ = run("sudo -u postgres psql -t -c \"SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;\"")
dbs = [d.strip() for d in out.split("\n") if d.strip()]
print(f"  Databases ({len(dbs)}): {', '.join(dbs)}")

print()
print("=== PGBOUNCER STATUS ===")
out, _ = run("systemctl is-active pgbouncer")
print(f"  PgBouncer service: {out}")

print()
print("=== BACKUP CRON ===")
out, _ = run("crontab -l 2>/dev/null | grep -i backup")
print(f"  Backup cron: {out if out else 'NOT FOUND'}")

print()
print("=== FIREWALL (DB PORTS) ===")
out, _ = run("ufw status | grep -E '5432|6379|6432'")
print(f"  Firewall rules:\n{out}")

print()
print("=== DISK USAGE ===")
out, _ = run("df -h /data /data/secondary 2>/dev/null")
print(out)

ssh.close()
print("\nPhase 2 verification complete.")
