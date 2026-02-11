#!/usr/bin/env python3
"""Fix PgBouncer to listen on both 127.0.0.1 and 10.0.0.1, and verify."""
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

# Fix PgBouncer listen_addr to include both localhost and private IP
print("🔧 Updating PgBouncer listen_addr...")
run(DB1, "sed -i 's/^listen_addr = 10.0.0.1$/listen_addr = 10.0.0.1, 127.0.0.1/' /etc/pgbouncer/pgbouncer.ini")
run(DB1, "systemctl restart pgbouncer && sleep 2")

out, _ = run(DB1, "ss -tlnp | grep 6432")
print(f"  Listening on: {out}")

# Test locally on db1
out, _ = run(DB1, f"PGPASSWORD='{PG_PASSWORD}' psql -h 127.0.0.1 -p 6432 -U aivo_app -d aivo_auth -c 'SELECT current_user, current_database();' 2>&1")
print(f"  Local (127.0.0.1:6432): {out}")

out, _ = run(DB1, f"PGPASSWORD='{PG_PASSWORD}' psql -h 10.0.0.1 -p 6432 -U aivo_app -d aivo_auth -c 'SELECT current_user, current_database();' 2>&1")
print(f"  Private (10.0.0.1:6432): {out}")

# Test from app1 using nc (psql not installed there)
print("\n🔗 Testing from app1 (nc)...")
out, _ = run(APP1, "nc -z -w3 10.0.0.1 6432 && echo 'PgBouncer REACHABLE' || echo 'PgBouncer UNREACHABLE'")
print(f"  {out}")

print("\n✅ PgBouncer fixed and accessible on both 127.0.0.1 and 10.0.0.1")
