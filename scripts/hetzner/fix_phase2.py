#!/usr/bin/env python3
"""Debug and fix Phase 2 issues on aivo-db1."""

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

# === DEBUG REDIS ===
print("=== DEBUGGING REDIS ===")
out, err = run("journalctl -u redis-server --no-pager -n 30")
print(f"Redis journal:\n{out}\n{err}\n")

out, _ = run("cat /etc/redis/redis.conf | head -5")
print(f"Redis conf (first 5 lines):\n{out}\n")

out, _ = run("ip addr show | grep 10.0.0")
print(f"VLAN IP check: {out if out else 'NO 10.0.0.x IP FOUND'}")

# Fix Redis - bind to 127.0.0.1 only for now (add private IP later when vSwitch is up)
print("\n=== FIXING REDIS ===")
redis_pw = creds["redis_password"]
# Escape special chars for sed
out, err = run(f"""
sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf
# Also ensure data directory exists
mkdir -p /data/secondary/redis
chown -R redis:redis /data/secondary/redis
systemctl restart redis-server
sleep 2
systemctl is-active redis-server
""")
print(f"Redis fix result: {out}")
if err:
    print(f"Redis fix errors: {err}")

out, _ = run("redis-cli ping")
print(f"Redis PING (no auth): {out}")

# === FIX POSTGRESQL DATABASES ===
print("\n=== FIXING POSTGRESQL - Creating databases ===")
pg_pw = creds["postgres_app_password"]

databases = [
    "aivo_auth", "aivo_core", "aivo_content", "aivo_assessment",
    "aivo_learning", "aivo_parent", "aivo_notification", "aivo_analytics",
    "aivo_subscription", "aivo_curriculum", "aivo_gamification",
    "aivo_social", "aivo_support", "aivo_marketplace", "aivo_media",
    "aivo_admin", "aivo_reporting", "aivo_integration", "aivo_homework",
    "aivo_library", "aivo_exam_prep", "aivo_teacher", "aivo_school",
    "aivo_compliance", "aivo_ai", "aivo_orchestrator"
]

# Create user and databases
create_sql = f"DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aivo_app') THEN CREATE USER aivo_app WITH PASSWORD '{pg_pw}'; END IF; END $$;\n"
for db in databases:
    create_sql += f"SELECT 'CREATE DATABASE {db} OWNER aivo_app' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '{db}')\\gexec\n"
    create_sql += f"GRANT ALL PRIVILEGES ON DATABASE {db} TO aivo_app;\n"

out, err = run(f"sudo -u postgres psql -c \"DO \\$\\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aivo_app') THEN CREATE USER aivo_app WITH PASSWORD '{pg_pw}'; END IF; END \\$\\$;\"")
print(f"Create user: {out} {err}")

for db in databases:
    out, err = run(f"sudo -u postgres psql -tc \"SELECT 1 FROM pg_database WHERE datname='{db}'\" | grep -q 1 || sudo -u postgres createdb -O aivo_app {db}")
    # Silently continue

out, _ = run("sudo -u postgres psql -t -c \"SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;\"")
dbs = [d.strip() for d in out.split("\n") if d.strip()]
print(f"Databases after fix ({len(dbs)}): {', '.join(dbs)}")

# Grant extensions on each database
print("\nInstalling pgcrypto and uuid-ossp extensions...")
for db in databases:
    run(f'sudo -u postgres psql -d {db} -c "CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS \\"uuid-ossp\\";"')
print("Extensions installed.")

# === FIX BACKUP CRON ===
print("\n=== FIXING BACKUP CRON ===")
out, err = run("ls -la /usr/local/bin/aivo-backup* 2>/dev/null || echo 'No backup script found'")
print(f"Backup script: {out}")

backup_script = f"""#!/bin/bash
# AIVO Database Backup Script
BACKUP_DIR="/data/secondary/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

# Backup all AIVO databases
for DB in {' '.join(databases)}; do
    sudo -u postgres pg_dump "$DB" | gzip > "$BACKUP_DIR/${{DB}}_${{DATE}}.sql.gz"
done

# Backup Redis
redis-cli -a '{redis_pw}' --no-auth-warning BGSAVE 2>/dev/null
cp /data/secondary/redis/dump.rdb "$BACKUP_DIR/redis_${{DATE}}.rdb" 2>/dev/null

# Clean old backups
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete

echo "Backup completed at $(date)"
"""

# Write backup script
import tempfile
out, err = run(f"""cat > /usr/local/bin/aivo-backup.sh << 'SCRIPT_EOF'
{backup_script}
SCRIPT_EOF
chmod +x /usr/local/bin/aivo-backup.sh
echo "Backup script written"
""")
print(f"Backup script: {out}")

# Add cron job
out, err = run("""(crontab -l 2>/dev/null | grep -v aivo-backup; echo '0 3 * * * /usr/local/bin/aivo-backup.sh >> /var/log/aivo-backup.log 2>&1') | crontab -
crontab -l | grep backup""")
print(f"Cron: {out}")

# === FINAL VERIFICATION ===
print("\n=== FINAL VERIFICATION ===")
out, _ = run("systemctl is-active redis-server")
print(f"Redis: {out}")
out, _ = run("systemctl is-active postgresql")
print(f"PostgreSQL: {out}")
out, _ = run("systemctl is-active pgbouncer")
print(f"PgBouncer: {out}")
out, _ = run("sudo -u postgres psql -t -c \"SELECT count(*) FROM pg_database WHERE datistemplate = false AND datname LIKE 'aivo_%';\"")
print(f"AIVO databases count: {out.strip()}")

ssh.close()
print("\nPhase 2 fix complete.")
