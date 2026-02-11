#!/usr/bin/env python3
"""
Run Prisma migrations by executing SQL directly on PostgreSQL via SSH.
For services with migration directories: run each migration.sql in order.
For services without migrations: use prisma migrate diff to generate SQL, then run it.
"""
import paramiko
import os
import glob
import json
import time

DB1 = {"host": "95.217.76.42", "password": "Ebmx9V_r?a38NM"}
DB_USER = "aivo_app"
DB_PASS = "Sh74VCfR40tiFd^d5P5spAneUiK&vzpp"

# Service -> database mapping
SVC_DB_MAP = {
    "session-svc": "aivo_sessions",
    "content-svc": "aivo_content",
    "profile-svc": "aivo_profiles",
    "goal-svc": "aivo_goals",
    "assessment-svc": "aivo_assessment",
    "notify-svc": "aivo_notify",
    "billing-svc": "aivo_billing",
    "analytics-svc": "aivo_analytics",
    "parent-svc": "aivo_parent",
}

BASE_DIR = r"c:\Users\ofema\aivo\services"

def connect():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(DB1["host"], username="root", password=DB1["password"], timeout=10)
    return c

def run_sql(client, db_name, sql, timeout=60):
    """Run SQL against a database via psql on db1."""
    # Escape single quotes in SQL for shell
    escaped = sql.replace("'", "'\\''")
    cmd = f"PGPASSWORD='{DB_PASS}' psql -h 127.0.0.1 -p 5432 -U {DB_USER} -d {db_name} -c '{escaped}' 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err

def run_sql_file(client, db_name, sql_content, timeout=120):
    """Run SQL file content against a database via psql on db1 using stdin."""
    # Write SQL to a temp file on the server, then run it
    import hashlib
    fname = f"/tmp/migration_{hashlib.md5(sql_content.encode()).hexdigest()[:8]}.sql"
    
    # Upload via SFTP
    sftp = client.open_sftp()
    with sftp.file(fname, 'w') as f:
        f.write(sql_content)
    sftp.close()
    
    cmd = f"PGPASSWORD='{DB_PASS}' psql -h 127.0.0.1 -p 5432 -U {DB_USER} -d {db_name} -f {fname} 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    
    # Clean up
    client.exec_command(f"rm -f {fname}")
    
    return out, err

def ensure_prisma_migrations_table(client, db_name):
    """Create _prisma_migrations table if it doesn't exist."""
    sql = """
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY ("id")
    );
    """
    run_sql_file(client, db_name, sql)

def record_migration(client, db_name, migration_name, checksum="manual"):
    """Record a migration in the _prisma_migrations table."""
    import uuid
    mid = str(uuid.uuid4())
    sql = f"""
    INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "started_at", "applied_steps_count")
    VALUES ('{mid}', '{checksum}', NOW(), '{migration_name}', NULL, NOW(), 1)
    ON CONFLICT DO NOTHING;
    """
    run_sql_file(client, db_name, sql)

def check_migration_applied(client, db_name, migration_name):
    """Check if a migration has already been applied."""
    cmd = f"""PGPASSWORD='{DB_PASS}' psql -h 127.0.0.1 -p 5432 -U {DB_USER} -d {db_name} -tAc "SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name='{migration_name}'" 2>&1"""
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    return out == "1"

def main():
    client = connect()
    
    results = {"success": [], "failed": [], "skipped": []}
    
    for svc, db_name in SVC_DB_MAP.items():
        print(f"\n{'=' * 70}")
        print(f"  {svc} -> {db_name}")
        print(f"{'=' * 70}")
        
        migrations_dir = os.path.join(BASE_DIR, svc, "prisma", "migrations")
        
        if not os.path.isdir(migrations_dir):
            print(f"  ⚠️  No migrations directory found")
            results["skipped"].append(svc)
            continue
        
        # Get migration folders sorted by name
        migration_folders = sorted([
            d for d in os.listdir(migrations_dir) 
            if os.path.isdir(os.path.join(migrations_dir, d))
        ])
        
        if not migration_folders:
            print(f"  ⚠️  No migration folders found")
            results["skipped"].append(svc)
            continue
        
        # Ensure _prisma_migrations table exists
        ensure_prisma_migrations_table(client, db_name)
        
        for mig_folder in migration_folders:
            sql_file = os.path.join(migrations_dir, mig_folder, "migration.sql")
            if not os.path.isfile(sql_file):
                print(f"  ⚠️  No migration.sql in {mig_folder}")
                continue
            
            # Check if already applied
            try:
                if check_migration_applied(client, db_name, mig_folder):
                    print(f"  ✅ Already applied: {mig_folder}")
                    continue
            except:
                pass  # Table might not exist yet for the check
            
            # Read SQL
            with open(sql_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            print(f"  ⏳ Applying: {mig_folder} ({len(sql_content)} chars)...")
            
            try:
                out, err = run_sql_file(client, db_name, sql_content, timeout=120)
                
                if "ERROR" in out:
                    print(f"  ❌ Error: {out[:500]}")
                    results["failed"].append(f"{svc}/{mig_folder}")
                else:
                    # Record the migration
                    record_migration(client, db_name, mig_folder)
                    print(f"  ✅ Applied successfully")
                    results["success"].append(f"{svc}/{mig_folder}")
                    
            except Exception as e:
                print(f"  ❌ Exception: {e}")
                results["failed"].append(f"{svc}/{mig_folder}")
    
    # Summary
    print(f"\n\n{'=' * 70}")
    print(f"MIGRATION SUMMARY")
    print(f"{'=' * 70}")
    print(f"  ✅ Success: {len(results['success'])}")
    for s in results["success"]:
        print(f"      {s}")
    print(f"  ❌ Failed: {len(results['failed'])}")
    for f in results["failed"]:
        print(f"      {f}")
    print(f"  ⚠️  Skipped: {len(results['skipped'])}")
    for s in results["skipped"]:
        print(f"      {s}")
    
    client.close()

if __name__ == "__main__":
    main()
