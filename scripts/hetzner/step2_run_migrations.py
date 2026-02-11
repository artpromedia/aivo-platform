"""
Step 2: Run database migrations for all services.
Uses direct SQL execution on db1 via psql.
"""
import paramiko, os, re

print("Connecting to db1...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.217.76.42', username='root', password='Ebmx9V_r?a38NM', timeout=15)

sftp = ssh.open_sftp()

def run(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

def run_sql(db_name, sql_content, label=""):
    """Write SQL to temp file and execute with psql."""
    remote_path = f'/tmp/aivo_mig_{db_name}_{label}.sql'
    # Write via sftp
    with sftp.file(remote_path, 'w') as f:
        f.write(sql_content)
    out, err = run(f'sudo -u postgres psql -d {db_name} -f {remote_path} 2>&1', timeout=60)
    result = out + '\n' + err
    return result

run('mkdir -p /tmp/aivo_migrations', 10)

base = r'c:\Users\ofema\aivo\services'

# ============================================================
# SERVICES WITH PRISMA MIGRATIONS
# ============================================================
services_migrations = {
    'auth-svc': 'aivo_auth',
    'content-svc': 'aivo_content',
    'assessment-svc': 'aivo_assessment',
    'analytics-svc': 'aivo_analytics',
    'profile-svc': 'aivo_profiles',
    'goal-svc': 'aivo_goals',
    'notify-svc': 'aivo_notify',
    'billing-svc': 'aivo_billing',
    'parent-svc': 'aivo_parent',
    'session-svc': 'aivo_sessions',
}

print("\n=== Running Prisma migrations ===")
for svc, db_name in services_migrations.items():
    mig_path = os.path.join(base, svc, 'prisma', 'migrations')
    if not os.path.exists(mig_path):
        print(f"  ⚠️  {svc}: No migrations dir")
        continue
    
    # Check if parent DB exists
    out, err = run(f"sudo -u postgres psql -lqt 2>&1 | grep {db_name}")
    if db_name not in (out + err):
        # Create database if missing
        run(f"sudo -u postgres createdb -O aivo_app {db_name} 2>&1")
        print(f"  Created database {db_name}")
    
    # Get sorted migration dirs
    mig_dirs = sorted([d for d in os.listdir(mig_path) 
                       if os.path.isdir(os.path.join(mig_path, d))])
    
    applied = 0
    errors_list = []
    
    for mdir in mig_dirs:
        sql_file = os.path.join(mig_path, mdir, 'migration.sql')
        if not os.path.exists(sql_file):
            continue
        
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql = f.read()
        
        result = run_sql(db_name, sql, mdir[:20])
        
        has_errors = False
        for line in result.split('\n'):
            if 'ERROR' in line and 'already exists' not in line and 'duplicate' not in line.lower():
                has_errors = True
                errors_list.append(f"{mdir}: {line.strip()}")
        
        if not has_errors:
            applied += 1
    
    status = "✅" if not errors_list else "⚠️"
    print(f"  {status} {svc} → {db_name}: {applied}/{len(mig_dirs)} migrations OK")
    for e in errors_list[:3]:
        print(f"      {e[:120]}")

# ============================================================
# SERVICES WITH SCHEMA ONLY (NO MIGRATIONS)
# ============================================================
services_schema_only = {
    'messaging-svc': 'aivo_messaging',
    'life-skills-svc': 'aivo_life_skills', 
    'baseline-svc': 'aivo_baseline',
    'consent-svc': 'aivo_consent',
    'personalization-svc': 'aivo_personalization',
    'payments-svc': 'aivo_billing',  # shares billing DB
    'focus-svc': 'aivo_focus',
}

print("\n=== Generating SQL from Prisma schemas ===")
for svc, db_name in services_schema_only.items():
    schema_file = os.path.join(base, svc, 'prisma', 'schema.prisma')
    if not os.path.exists(schema_file):
        print(f"  ⚠️  {svc}: No schema.prisma")
        continue
    
    with open(schema_file, 'r', encoding='utf-8') as f:
        schema = f.read()
    
    # Parse enums
    enum_matches = re.findall(r'enum\s+(\w+)\s*\{([^}]+)\}', schema)
    enum_sqls = []
    for enum_name, enum_body in enum_matches:
        values = [v.strip() for v in enum_body.strip().split('\n') if v.strip() and not v.strip().startswith('//')]
        vals_str = ', '.join(f"'{v}'" for v in values)
        enum_sqls.append(f"DO $$ BEGIN CREATE TYPE \"{enum_name}\" AS ENUM ({vals_str}); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    
    # Parse models
    models = re.findall(r'model\s+(\w+)\s*\{([^}]+)\}', schema, re.DOTALL)
    
    # Get all model names for relation detection
    model_names = {m[0] for m in models}
    
    create_sqls = []
    for model_name, model_body in models:
        # Table name from @@map or default
        map_match = re.search(r'@@map\("([^"]+)"\)', model_body)
        table_name = map_match.group(1) if map_match else model_name
        
        columns = []
        pk_cols = []
        unique_constraints = []
        
        # Check for @@id compound key
        compound_id = re.search(r'@@id\(\[([^\]]+)\]\)', model_body)
        if compound_id:
            pk_cols = [c.strip() for c in compound_id.group(1).split(',')]
        
        for line in model_body.strip().split('\n'):
            line = line.strip()
            if not line or line.startswith('//') or line.startswith('@@'):
                continue
            
            parts = line.split()
            if len(parts) < 2:
                continue
            
            col_name = parts[0]
            col_type_raw = parts[1]
            
            # Skip relation fields
            base_type = col_type_raw.rstrip('?').rstrip('[]')
            if base_type in model_names:
                continue
            
            is_optional = col_type_raw.endswith('?') or '?' in col_type_raw
            is_array = '[]' in col_type_raw
            
            # Map column name from @map
            col_map = re.search(r'@map\("([^"]+)"\)', line)
            actual_col = col_map.group(1) if col_map else col_name
            
            # Prisma type to PostgreSQL
            type_map = {
                'String': 'TEXT', 'Int': 'INTEGER', 'Float': 'DOUBLE PRECISION',
                'Boolean': 'BOOLEAN', 'DateTime': 'TIMESTAMP(3)',
                'Json': 'JSONB', 'BigInt': 'BIGINT', 'Decimal': 'DECIMAL(65,30)',
                'Bytes': 'BYTEA',
            }
            
            # Check for @db.VarChar etc
            db_type_match = re.search(r'@db\.(\w+)(?:\((\d+)\))?', line)
            if db_type_match:
                db_type = db_type_match.group(1)
                db_size = db_type_match.group(2)
                if db_type == 'VarChar':
                    pg_type = f'VARCHAR({db_size})' if db_size else 'VARCHAR'
                elif db_type == 'Text':
                    pg_type = 'TEXT'
                elif db_type == 'Uuid':
                    pg_type = 'UUID'
                elif db_type == 'Timestamptz':
                    pg_type = 'TIMESTAMPTZ'
                elif db_type == 'SmallInt':
                    pg_type = 'SMALLINT'
                elif db_type == 'DoublePrecision':
                    pg_type = 'DOUBLE PRECISION'
                elif db_type == 'JsonB':
                    pg_type = 'JSONB'
                else:
                    pg_type = type_map.get(base_type, 'TEXT')
            else:
                pg_type = type_map.get(base_type, None)
                if pg_type is None:
                    # Could be an enum
                    if base_type in [e[0] for e in enum_matches]:
                        pg_type = f'"{base_type}"'
                    else:
                        continue  # Unknown type, skip
            
            if is_array:
                pg_type += '[]'
            
            # Build column definition
            is_pk = '@id' in line
            default_match = re.search(r'@default\(([^)]+)\)', line)
            is_unique = '@unique' in line
            is_updated_at = '@updatedAt' in line
            
            col_def = f'    "{actual_col}" {pg_type}'
            
            if is_pk:
                col_def += ' PRIMARY KEY'
            
            if not is_optional and not is_pk:
                col_def += ' NOT NULL'
            
            if is_unique:
                col_def += ' UNIQUE'
            
            if default_match:
                dv = default_match.group(1)
                if dv == 'autoincrement()':
                    col_def = f'    "{actual_col}" SERIAL PRIMARY KEY'
                elif dv == 'uuid()':
                    col_def += ' DEFAULT gen_random_uuid()'
                elif dv == 'cuid()':
                    col_def += ' DEFAULT gen_random_uuid()'  # Approximate
                elif dv == 'now()':
                    col_def += ' DEFAULT CURRENT_TIMESTAMP'
                elif dv in ('true', 'false'):
                    col_def += f' DEFAULT {dv.upper()}'
                elif dv.startswith('"'):
                    col_def += f" DEFAULT {dv.replace(chr(34), chr(39))}"
                elif re.match(r'^-?\d+(\.\d+)?$', dv):
                    col_def += f' DEFAULT {dv}'
                elif dv == 'dbgenerated("gen_random_uuid()")':
                    col_def += ' DEFAULT gen_random_uuid()'
                else:
                    # Could be enum default
                    col_def += f" DEFAULT '{dv}'"
            
            if is_updated_at:
                col_def += ' DEFAULT CURRENT_TIMESTAMP'
            
            columns.append(col_def)
        
        if columns:
            col_str = ',\n'.join(columns)
            # Add compound primary key if defined
            if pk_cols and not any('@id' in model_body.split('\n')[i] for i, _ in enumerate(model_body.split('\n')) if len(_.split()) >= 2 and _.split()[0] in pk_cols):
                pk_col_names = ', '.join(f'"{c}"' for c in pk_cols)
                col_str += f',\n    PRIMARY KEY ({pk_col_names})'
            
            sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" (\n{col_str}\n);'
            create_sqls.append(sql)
    
    if enum_sqls or create_sqls:
        full_sql = '\n\n'.join(enum_sqls + create_sqls)
        result = run_sql(db_name, full_sql, f'{svc}_schema')
        
        creates = result.count('CREATE TABLE')
        existed = result.count('already exists') 
        err_lines = [l for l in result.split('\n') if 'ERROR' in l and 'already exists' not in l and 'duplicate' not in l.lower()]
        
        status = "✅" if not err_lines else "⚠️"
        print(f"  {status} {svc} → {db_name}: {creates} tables created")
        for e in err_lines[:3]:
            print(f"      {e[:120]}")
    else:
        print(f"  ❌ {svc}: No models parsed from schema")

# ============================================================
# CREATE _prisma_migrations TABLE IN ALL DATABASES
# ============================================================
print("\n=== Ensuring _prisma_migrations tables exist ===")
all_dbs = {**services_migrations, **services_schema_only}
prisma_mig_sql = '''
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL PRIMARY KEY,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);
'''
for svc, db_name in all_dbs.items():
    out, err = run(f"sudo -u postgres psql -d {db_name} -c \"CREATE TABLE IF NOT EXISTS \\\"_prisma_migrations\\\" (\\\"id\\\" VARCHAR(36) NOT NULL PRIMARY KEY, \\\"checksum\\\" VARCHAR(64) NOT NULL, \\\"finished_at\\\" TIMESTAMP(3), \\\"migration_name\\\" VARCHAR(255) NOT NULL, \\\"logs\\\" TEXT, \\\"rolled_back_at\\\" TIMESTAMP(3), \\\"started_at\\\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, \\\"applied_steps_count\\\" INTEGER NOT NULL DEFAULT 0);\" 2>&1")

print("  Done")

# Check table counts per database
print("\n=== Table counts per database ===")
for svc, db_name in sorted(all_dbs.items()):
    out, err = run(f"sudo -u postgres psql -d {db_name} -t -c \"SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';\" 2>&1")
    count = (out + err).strip()
    print(f"  {svc} ({db_name}): {count} tables")

sftp.close()
ssh.close()
print("\nDone!")
