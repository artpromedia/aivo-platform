#!/usr/bin/env python3
"""Fix PgBouncer and verify connectivity."""
import paramiko, json

DB1 = {"host": "95.217.76.42", "user": "root", "password": "Ebmx9V_r?a38NM"}
APP1 = {"host": "95.216.245.40", "user": "root", "password": "2R2ht?gALF7%L%"}

with open("scripts/hetzner/credentials.json") as f:
    creds = json.load(f)
PG_PASSWORD = creds["postgres_app_password"]

def run(srv, cmd, timeout=30):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(srv["host"], username=srv["user"], password=srv["password"], timeout=20)
    try:
        _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        return stdout.read().decode().strip(), stderr.read().decode().strip()
    finally:
        ssh.close()

# Check PgBouncer status and config
print("🔧 PgBouncer diagnostics...")
out, _ = run(DB1, "systemctl status pgbouncer --no-pager 2>&1 | head -10")
print(f"  Status: {out}")

out, _ = run(DB1, "cat /etc/pgbouncer/pgbouncer.ini 2>&1")
print(f"\n  Config:\n{out}")

out, _ = run(DB1, "cat /etc/pgbouncer/userlist.txt 2>&1")
print(f"\n  Userlist:\n  {out}")

# Restart PgBouncer
print("\n🔄 Restarting PgBouncer...")
out, _ = run(DB1, "systemctl restart pgbouncer 2>&1; sleep 2; systemctl is-active pgbouncer 2>&1")
print(f"  Result: {out}")

out, _ = run(DB1, "ss -tlnp | grep 6432")
print(f"  Port 6432: {out}")

# Test PgBouncer
out, _ = run(DB1, f"PGPASSWORD='{PG_PASSWORD}' psql -h 127.0.0.1 -p 6432 -U aivo_app -d aivo_auth -c 'SELECT 1;' 2>&1")
print(f"\n  PgBouncer test: {out}")

# Test from app1
print("\n🔗 Testing from app1...")
out, _ = run(APP1, f"PGPASSWORD='{PG_PASSWORD}' psql -h 10.0.0.1 -p 5432 -U aivo_app -d aivo_auth -c 'SELECT current_user, current_database();' 2>&1")
print(f"  Direct (5432): {out}")

out, _ = run(APP1, f"PGPASSWORD='{PG_PASSWORD}' psql -h 10.0.0.1 -p 6432 -U aivo_app -d aivo_auth -c 'SELECT current_user, current_database();' 2>&1")
print(f"  PgBouncer (6432): {out}")
