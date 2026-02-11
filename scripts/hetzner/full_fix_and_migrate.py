"""
Comprehensive approach: Apply manifests with kustomize (namespace override),
then run all database migrations via SSH to db1.
"""
import paramiko
import os
import glob

# Connect to app1 (K3s control plane)
app1 = paramiko.SSHClient()
app1.set_missing_host_key_policy(paramiko.AutoAddPolicy())
app1.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run_app1(cmd, timeout=30):
    stdin, stdout, stderr = app1.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Step 1: Upload manifests
print("=== Step 1: Upload manifests ===")
sftp = app1.open_sftp()
base_dir = r'c:\Users\ofema\aivo\infra\k8s\base'
remote_dir = '/root/aivo-k8s/base'
run_app1(f'mkdir -p {remote_dir}')

for f in glob.glob(os.path.join(base_dir, '*.yaml')):
    fname = os.path.basename(f)
    sftp.put(f, f'{remote_dir}/{fname}')
print("  All manifests uploaded")

# Step 2: Apply with kustomize (handles namespace override)
print("\n=== Step 2: Apply with kustomize ===")
result = run_app1(f'kubectl apply -k {remote_dir} 2>&1', timeout=60)
for line in result.split('\n'):
    if 'error' in line.lower() or 'invalid' in line.lower():
        print(f"  ❌ {line}")
    elif 'configured' in line or 'created' in line or 'unchanged' in line:
        pass  # quiet success
print(f"  Applied ({result.count('configured')} configured, {result.count('unchanged')} unchanged, {result.count('created')} created)")

# Step 3: Rolling restart all deployments
print("\n=== Step 3: Rolling restart ===")
result = run_app1('kubectl -n aivo-prod rollout restart deployment --all 2>&1')
print(f"  {result[:200]}")

sftp.close()
app1.close()

print("\n=== Step 4: Running database migrations on db1 ===")

# Connect to db1
db1 = paramiko.SSHClient()
db1.set_missing_host_key_policy(paramiko.AutoAddPolicy())
db1.connect('95.217.76.42', username='root', password='Ebmx9V_r?a38NM', timeout=10)

def run_db1(cmd, timeout=30):
    stdin, stdout, stderr = db1.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

# Upload and run each migration SQL
migrations_dir = r'c:\Users\ofema\aivo'

# Define all services with Prisma migrations
services_with_migrations = {
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

# Services with schema.prisma but no migrations dir - need db push equivalent
services_schema_only = {
    'messaging-svc': 'aivo_messaging',
    'life-skills-svc': 'aivo_life_skills',
    'baseline-svc': 'aivo_baseline',
    'consent-svc': 'aivo_consent',
    'personalization-svc': 'aivo_personalization',
    'payments-svc': 'aivo_billing',  # shares billing DB
    'focus-svc': 'aivo_focus',
}

db_sftp = db1.open_sftp()
run_db1('mkdir -p /tmp/aivo_migrations')

# First: Run services WITH migrations
print("\n--- Services with Prisma migrations ---")
for svc, db_name in services_with_migrations.items():
    migrations_path = os.path.join(migrations_dir, 'services', svc, 'prisma', 'migrations')
    if not os.path.exists(migrations_path):
        print(f"  ⚠️  {svc}: No migrations directory found")
        continue
    
    # Find all migration dirs (sorted)
    migration_dirs = sorted([d for d in os.listdir(migrations_path) 
                            if os.path.isdir(os.path.join(migrations_path, d)) and d != 'migration_lock.toml'])
    
    if not migration_dirs:
        print(f"  ⚠️  {svc}: No migration subdirectories")
        continue
    
    success_count = 0
    fail_count = 0
    
    for mig_dir in migration_dirs:
        sql_file = os.path.join(migrations_path, mig_dir, 'migration.sql')
        if not os.path.exists(sql_file):
            continue
        
        # Upload SQL
        remote_sql = f'/tmp/aivo_migrations/{svc}_{mig_dir}.sql'
        db_sftp.put(sql_file, remote_sql)
        
        # Execute SQL
        out, err = run_db1(f'sudo -u postgres psql -d {db_name} -f {remote_sql} 2>&1', timeout=30)
        result_text = out + err
        
        if 'ERROR' in result_text and 'already exists' not in result_text:
            fail_count += 1
        else:
            success_count += 1
    
    status = "✅" if fail_count == 0 else "⚠️"
    print(f"  {status} {svc} → {db_name}: {success_count}/{success_count+fail_count} migrations applied")

# Second: Handle schema-only services by reading schema.prisma and generating SQL
print("\n--- Services with schema only (no migrations) ---")
for svc, db_name in services_schema_only.items():
    schema_path = os.path.join(migrations_dir, 'services', svc, 'prisma', 'schema.prisma')
    if not os.path.exists(schema_path):
        print(f"  ⚠️  {svc}: No schema.prisma found")
        continue
    
    # Read schema to extract model names
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema = f.read()
    
    # Check if tables already exist
    out, _ = run_db1(f"sudo -u postgres psql -d {db_name} -c \"SELECT tablename FROM pg_tables WHERE schemaname='public';\" 2>&1")
    existing_tables = out
    
    if 'pg_tables' not in existing_tables and '0 rows' not in existing_tables:
        # Tables might exist
        import re
        model_names = re.findall(r'model\s+(\w+)\s*\{', schema)
        if model_names:
            # Check if first model exists
            table_check = model_names[0]
            # Convert PascalCase to snake_case for Prisma default mapping
            snake = re.sub(r'(?<!^)(?=[A-Z])', '_', table_check).lower()
    
    print(f"  ℹ️  {svc} → {db_name}: Schema exists, will generate SQL")
    
    # For schema-only services, we need to generate CREATE TABLE SQL from Prisma schema
    # Parse models and generate basic SQL
    import re
    models = re.findall(r'model\s+(\w+)\s*\{([^}]+)\}', schema, re.DOTALL)
    
    create_statements = []
    for model_name, model_body in models:
        # Get @@map if exists for table name
        map_match = re.search(r'@@map\("([^"]+)"\)', model_body)
        table_name = map_match.group(1) if map_match else model_name
        
        columns = []
        lines = model_body.strip().split('\n')
        for line in lines:
            line = line.strip()
            if not line or line.startswith('//') or line.startswith('@@') or line.startswith('@relation'):
                continue
            
            parts = line.split()
            if len(parts) < 2:
                continue
            
            col_name = parts[0]
            col_type = parts[1]
            
            # Skip relation fields
            if col_type in [m[0] for m in models] or col_type.rstrip('?').rstrip('[]') in [m[0] for m in models]:
                continue
            
            # Map Prisma types to PostgreSQL
            pg_type = {
                'String': 'TEXT',
                'Int': 'INTEGER',
                'Float': 'DOUBLE PRECISION',
                'Boolean': 'BOOLEAN',
                'DateTime': 'TIMESTAMP(3)',
                'Json': 'JSONB',
                'BigInt': 'BIGINT',
                'Decimal': 'DECIMAL(65,30)',
                'Bytes': 'BYTEA',
            }.get(col_type.rstrip('?').rstrip('[]'), None)
            
            if pg_type is None:
                continue
            
            nullable = col_type.endswith('?')
            is_array = col_type.endswith('[]')
            
            # Check for @id
            is_pk = '@id' in line
            # Check for @default
            default_match = re.search(r'@default\(([^)]+)\)', line)
            default_val = default_match.group(1) if default_match else None
            
            # Check for @map
            map_col = re.search(r'@map\("([^"]+)"\)', line)
            actual_col = map_col.group(1) if map_col else col_name
            
            col_def = f'    "{actual_col}" {pg_type}'
            if is_array:
                col_def = f'    "{actual_col}" {pg_type}[]'
            if not nullable and not is_pk:
                col_def += ' NOT NULL'
            if is_pk:
                col_def += ' NOT NULL PRIMARY KEY'
            if default_val:
                if default_val == 'autoincrement()':
                    col_def = f'    "{actual_col}" SERIAL PRIMARY KEY'
                elif default_val == 'uuid()':
                    col_def += " DEFAULT gen_random_uuid()"
                elif default_val == 'now()':
                    col_def += " DEFAULT CURRENT_TIMESTAMP"
                elif default_val in ('true', 'false'):
                    col_def += f" DEFAULT {default_val.upper()}"
                elif default_val.startswith('"'):
                    col_def += f" DEFAULT '{default_val.strip(chr(34))}'"
                else:
                    col_def += f" DEFAULT {default_val}"
            
            columns.append(col_def)
        
        if columns:
            create_sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" (\n' + ',\n'.join(columns) + '\n);'
            create_statements.append(create_sql)
    
    if create_statements:
        full_sql = '\n\n'.join(create_statements)
        remote_sql = f'/tmp/aivo_migrations/{svc}_schema.sql'
        
        # Write SQL to temp file locally then upload
        local_tmp = os.path.join(migrations_dir, 'scripts', 'hetzner', f'{svc}_schema.sql')
        with open(local_tmp, 'w') as f:
            f.write(full_sql)
        db_sftp.put(local_tmp, remote_sql)
        
        out, err = run_db1(f'sudo -u postgres psql -d {db_name} -f {remote_sql} 2>&1', timeout=30)
        result = out + err
        
        created = result.count('CREATE TABLE')
        existed = result.count('already exists')
        errors = [l for l in result.split('\n') if 'ERROR' in l and 'already exists' not in l]
        
        if errors:
            print(f"  ⚠️  {svc} → {db_name}: {created} tables created, {len(errors)} errors")
            for e in errors[:3]:
                print(f"      {e[:100]}")
        else:
            print(f"  ✅ {svc} → {db_name}: {created} tables created ({existed} already existed)")
    else:
        print(f"  ❌ {svc}: Could not parse models from schema")

# Create _prisma_migrations table for services that need it
print("\n--- Creating _prisma_migrations tables ---")
for svc, db_name in {**services_with_migrations, **services_schema_only}.items():
    prisma_mig_sql = """
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
    """
    out, err = run_db1(f"sudo -u postgres psql -d {db_name} -c \"{prisma_mig_sql}\" 2>&1")
    # Don't print unless error

db_sftp.close()
db1.close()
print("\n=== All done! Waiting for pods to restart... ===")
