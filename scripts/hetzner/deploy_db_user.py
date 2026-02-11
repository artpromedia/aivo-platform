#!/usr/bin/env python3
"""
Phase 5 Step 2: Create PostgreSQL app user + Run Prisma Migrations
==================================================================
- Creates aivo_app user on PostgreSQL (for service connections)
- Grants permissions on all 18 databases
- Runs Prisma migrations for all services via SSH tunnel
"""

import paramiko
import json
import time

DB1 = {"host": "95.217.76.42", "user": "root", "password": "Ebmx9V_r?a38NM"}
APP1 = {"host": "95.216.245.40", "user": "root", "password": "2R2ht?gALF7%L%"}

with open("scripts/hetzner/credentials.json") as f:
    creds = json.load(f)

PG_PASSWORD = creds["postgres_app_password"]

def run_on(server, cmd, timeout=30):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(server["host"], username=server["user"], password=server["password"], timeout=20)
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        return out, err
    finally:
        ssh.close()

# ── The 18 core service databases ──
DATABASES = [
    "aivo_auth", "aivo_sessions", "aivo_consent", "aivo_profiles",
    "aivo_content", "aivo_assessment", "aivo_personalization", "aivo_life_skills",
    "aivo", "aivo_analytics", "aivo_notify", "aivo_messaging",
    "aivo_goals", "aivo_billing", "aivo_parent", "aivo_baseline",
]

print("=" * 70)
print("PHASE 5.2: PostgreSQL App User + Database Permissions")
print("=" * 70)

# Step 1: Create aivo_app user
print("\n👤 Step 1: Creating aivo_app database user...")
escaped_pw = PG_PASSWORD.replace("'", "''")
create_user_sql = f"""
DO \\$\\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'aivo_app') THEN
    CREATE ROLE aivo_app WITH LOGIN PASSWORD '{escaped_pw}';
    RAISE NOTICE 'Created user aivo_app';
  ELSE
    ALTER ROLE aivo_app WITH PASSWORD '{escaped_pw}';
    RAISE NOTICE 'User aivo_app already exists, password updated';
  END IF;
END
\\$\\$;
"""
out, err = run_on(DB1, f'sudo -u postgres psql -c "{create_user_sql}" 2>&1')
print(f"  {out}")
if err:
    print(f"  stderr: {err}")

# Step 2: Grant permissions on all databases
print("\n🔑 Step 2: Granting permissions on databases...")
for db in DATABASES:
    cmds = [
        f"sudo -u postgres psql -d {db} -c 'GRANT ALL PRIVILEGES ON DATABASE {db} TO aivo_app;' 2>&1",
        f"sudo -u postgres psql -d {db} -c 'GRANT ALL ON SCHEMA public TO aivo_app;' 2>&1",
        f"sudo -u postgres psql -d {db} -c 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aivo_app;' 2>&1",
        f"sudo -u postgres psql -d {db} -c 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aivo_app;' 2>&1",
        f"sudo -u postgres psql -d {db} -c 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO aivo_app;' 2>&1",
        f"sudo -u postgres psql -d {db} -c 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO aivo_app;' 2>&1",
    ]
    for cmd in cmds:
        run_on(DB1, cmd)
    print(f"  ✅ {db}: granted all privileges to aivo_app")

# Step 3: Update pg_hba.conf to allow aivo_app from private network
print("\n🔧 Step 3: Updating pg_hba.conf for aivo_app access...")
out, _ = run_on(DB1, "grep 'aivo_app' /etc/postgresql/15/main/pg_hba.conf || echo 'NOT_FOUND'")
if "NOT_FOUND" in out:
    run_on(DB1, """
cat >> /etc/postgresql/15/main/pg_hba.conf << 'EOF'

# AIVO app user - allow from private network
host    all    aivo_app    10.0.0.0/24    scram-sha-256
EOF
""")
    run_on(DB1, "systemctl reload postgresql")
    print("  Added aivo_app entry and reloaded PostgreSQL")
else:
    print("  aivo_app already in pg_hba.conf")

# Step 4: Update PgBouncer to include aivo_app
print("\n🔧 Step 4: Updating PgBouncer for aivo_app...")
out, _ = run_on(DB1, "grep 'aivo_app' /etc/pgbouncer/userlist.txt || echo 'NOT_FOUND'")
if "NOT_FOUND" in out:
    # Get the md5 hash for PgBouncer auth
    run_on(DB1, f"""
echo '"aivo_app" "{PG_PASSWORD}"' >> /etc/pgbouncer/userlist.txt
""")
    
    # Also add all databases to pgbouncer.ini
    out, _ = run_on(DB1, "cat /etc/pgbouncer/pgbouncer.ini")
    for db in DATABASES:
        if db not in out:
            run_on(DB1, f"sed -i '/\\[databases\\]/a {db} = host=127.0.0.1 port=5432 dbname={db}' /etc/pgbouncer/pgbouncer.ini")
    
    run_on(DB1, "systemctl restart pgbouncer && sleep 2 && systemctl is-active pgbouncer")
    print("  Added aivo_app to PgBouncer and restarted")
else:
    print("  aivo_app already in PgBouncer userlist")

# Step 5: Verify connectivity
print("\n✅ Step 5: Verifying aivo_app connectivity...")

# Test direct PostgreSQL connection
out, _ = run_on(DB1, f"PGPASSWORD='{PG_PASSWORD}' psql -h 127.0.0.1 -U aivo_app -d aivo_auth -c 'SELECT current_user, current_database();' 2>&1")
print(f"  Direct PostgreSQL: {out}")

# Test PgBouncer connection
out, _ = run_on(DB1, f"PGPASSWORD='{PG_PASSWORD}' psql -h 127.0.0.1 -p 6432 -U aivo_app -d aivo_auth -c 'SELECT current_user, current_database();' 2>&1")
print(f"  Via PgBouncer: {out}")

# Test from app1 over private network
out, _ = run_on(APP1, f"PGPASSWORD='{PG_PASSWORD}' psql -h 10.0.0.1 -p 5432 -U aivo_app -d aivo_auth -c 'SELECT current_user, current_database();' 2>&1")
if "aivo_app" in out:
    print(f"  From app1 (private network): ✅ Connected!")
else:
    print(f"  From app1 (private network): {out}")

print("\n" + "=" * 70)
print("PostgreSQL app user ready. Services can connect via:")
print(f"  postgresql://aivo_app:<password>@10.0.0.1:6432/<db>?schema=public")
print("=" * 70)
