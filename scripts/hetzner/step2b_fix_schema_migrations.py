"""
Step 2b: Fix schema-only service migrations.
The main issues were:
1. @default(uuid()) → needs to be gen_random_uuid()
2. Enum values with inline comments
3. @default(dbgenerated("gen_random_uuid()")) not handled
4. @updatedAt creating duplicate DEFAULT
"""
import paramiko, os, re

print("Connecting to db1...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.217.76.42', username='root', password='Ebmx9V_r?a38NM', timeout=15)

sftp = ssh.open_sftp()

def run(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    return stdout.read().decode().strip(), stderr.read().decode().strip()

def run_sql_str(db_name, sql, label=""):
    remote = f'/tmp/aivo_fix_{db_name}_{label}.sql'
    with sftp.file(remote, 'w') as f:
        f.write(sql)
    out, err = run(f'cd /tmp && sudo -u postgres psql -d {db_name} -f {remote} 2>&1', timeout=60)
    return out + '\n' + err

base = r'c:\Users\ofema\aivo\services'

services = {
    'messaging-svc': 'aivo_messaging',
    'life-skills-svc': 'aivo_life_skills',
    'baseline-svc': 'aivo_baseline',
    'consent-svc': 'aivo_consent',
    'personalization-svc': 'aivo_personalization',
    'focus-svc': 'aivo_focus',
}

def parse_schema_to_sql(schema_text):
    """Improved Prisma schema to PostgreSQL SQL converter."""
    sqls = []
    
    # Extract enums
    enum_matches = re.findall(r'enum\s+(\w+)\s*\{([^}]+)\}', schema_text)
    for ename, ebody in enum_matches:
        # Clean enum values - strip comments and whitespace
        values = []
        for line in ebody.strip().split('\n'):
            line = line.strip()
            if not line or line.startswith('//'):
                continue
            # Remove inline comments
            val = re.split(r'\s*//', line)[0].strip()
            if val:
                values.append(val)
        if values:
            vals_str = ', '.join(f"'{v}'" for v in values)
            sqls.append(f'DO $$ BEGIN CREATE TYPE "{ename}" AS ENUM ({vals_str}); EXCEPTION WHEN duplicate_object THEN null; END $$;')
    
    enum_names = {e[0] for e in enum_matches}
    
    # Extract models
    models = re.findall(r'model\s+(\w+)\s*\{([^}]+)\}', schema_text, re.DOTALL)
    model_names = {m[0] for m in models}
    
    for mname, mbody in models:
        # Table name
        tmap = re.search(r'@@map\("([^"]+)"\)', mbody)
        tname = tmap.group(1) if tmap else mname
        
        cols = []
        
        # Check @@id compound key
        compound_id = re.search(r'@@id\(\[([^\]]+)\]\)', mbody)
        compound_pk_cols = [c.strip() for c in compound_id.group(1).split(',')] if compound_id else []
        
        # Check @@unique
        unique_constraints = re.findall(r'@@unique\(\[([^\]]+)\]\)', mbody)
        
        for line in mbody.strip().split('\n'):
            line = line.strip()
            if not line or line.startswith('//') or line.startswith('@@'):
                continue
            
            # Remove inline comments from the line for processing
            clean_line = line
            # But keep @directives
            
            parts = clean_line.split()
            if len(parts) < 2:
                continue
            
            fname = parts[0]
            ftype_raw = parts[1]
            ftype_base = ftype_raw.replace('?', '').replace('[]', '')
            
            # Skip relations
            if ftype_base in model_names:
                continue
            
            is_optional = '?' in ftype_raw
            is_array = '[]' in ftype_raw
            is_pk = '@id' in clean_line
            is_unique = '@unique' in clean_line
            has_updated_at = '@updatedAt' in clean_line
            
            # Column name from @map
            cmap = re.search(r'@map\("([^"]+)"\)', clean_line)
            col_name = cmap.group(1) if cmap else fname
            
            # Determine PostgreSQL type
            # Check @db.X first
            db_match = re.search(r'@db\.(\w+)(?:\((\d+)\))?', clean_line)
            if db_match:
                db_t = db_match.group(1)
                db_s = db_match.group(2)
                pg_type_map = {
                    'VarChar': f'VARCHAR({db_s})' if db_s else 'VARCHAR',
                    'Text': 'TEXT', 'Uuid': 'UUID', 'Timestamptz': 'TIMESTAMPTZ',
                    'SmallInt': 'SMALLINT', 'DoublePrecision': 'DOUBLE PRECISION',
                    'JsonB': 'JSONB', 'Json': 'JSONB', 'Decimal': 'DECIMAL',
                    'BigInt': 'BIGINT', 'Integer': 'INTEGER',
                }
                pg_type = pg_type_map.get(db_t, 'TEXT')
            elif ftype_base in enum_names:
                pg_type = f'"{ftype_base}"'
            else:
                simple_map = {
                    'String': 'TEXT', 'Int': 'INTEGER', 'Float': 'DOUBLE PRECISION',
                    'Boolean': 'BOOLEAN', 'DateTime': 'TIMESTAMP(3)',
                    'Json': 'JSONB', 'BigInt': 'BIGINT', 'Decimal': 'DECIMAL(65,30)',
                    'Bytes': 'BYTEA',
                }
                pg_type = simple_map.get(ftype_base)
                if pg_type is None:
                    continue  # Unknown
            
            if is_array:
                pg_type += '[]'
            
            # Build column
            col = f'    "{col_name}" {pg_type}'
            
            # Default value - extract by balanced parentheses
            def_match = None
            idx_start = clean_line.find('@default(')
            if idx_start >= 0:
                depth = 0
                start = idx_start + len('@default(')
                for ci, ch in enumerate(clean_line[start:], start):
                    if ch == '(':
                        depth += 1
                    elif ch == ')':
                        if depth == 0:
                            def_match = clean_line[start:ci]
                            break
                        depth -= 1
            
            default_sql = None
            is_serial = False
            
            if def_match is not None:
                dv = def_match.strip()
                if dv == 'autoincrement()':
                    col = f'    "{col_name}" SERIAL'
                    is_serial = True
                elif dv == 'uuid()' or dv == 'cuid()':
                    default_sql = 'gen_random_uuid()'
                elif dv == 'now()':
                    default_sql = 'CURRENT_TIMESTAMP'
                elif dv in ('true', 'false'):
                    default_sql = dv.upper()
                elif dv.startswith('dbgenerated('):
                    # Extract inner value
                    inner = re.search(r'dbgenerated\("([^"]+)"\)', dv)
                    if inner:
                        default_sql = inner.group(1)
                    else:
                        default_sql = 'gen_random_uuid()'
                elif dv.startswith('"'):
                    default_sql = dv.replace('"', "'")
                elif re.match(r'^-?\d+(\.\d+)?$', dv):
                    default_sql = dv
                elif dv == '[]':
                    default_sql = "ARRAY[]::TEXT[]"
                elif dv == '{}':
                    default_sql = "'{}'"
                else:
                    # Likely enum value
                    default_sql = f"'{dv}'::\"{ftype_base}\"" if ftype_base in enum_names else f"'{dv}'"
            
            if is_pk and not is_serial:
                col += ' PRIMARY KEY'
            elif is_serial:
                col += ' PRIMARY KEY'
            
            if not is_optional and not is_pk and not is_serial:
                col += ' NOT NULL'
            
            if is_unique:
                col += ' UNIQUE'
            
            if default_sql:
                col += f' DEFAULT {default_sql}'
            elif has_updated_at and not default_sql:
                col += ' DEFAULT CURRENT_TIMESTAMP'
            
            cols.append(col)
        
        if cols:
            col_str = ',\n'.join(cols)
            
            # Add compound primary key
            if compound_pk_cols:
                pk_str = ', '.join(f'"{c}"' for c in compound_pk_cols)
                col_str += f',\n    PRIMARY KEY ({pk_str})'
            
            sql = f'CREATE TABLE IF NOT EXISTS "{tname}" (\n{col_str}\n);'
            sqls.append(sql)
    
    # Add unique constraints
    for mname, mbody in models:
        tmap = re.search(r'@@map\("([^"]+)"\)', mbody)
        tname = tmap.group(1) if tmap else mname
        
        uniques = re.findall(r'@@unique\(\[([^\]]+)\]', mbody)
        for uq in uniques:
            ucols = [c.strip() for c in uq.split(',')]
            ucol_str = ', '.join(f'"{c}"' for c in ucols)
            idx_name = f'{tname}_{"_".join(ucols)}_key'
            sqls.append(f'CREATE UNIQUE INDEX IF NOT EXISTS "{idx_name}" ON "{tname}" ({ucol_str});')
    
    return '\n\n'.join(sqls)

for svc, db_name in services.items():
    schema_file = os.path.join(base, svc, 'prisma', 'schema.prisma')
    if not os.path.exists(schema_file):
        print(f"  ⚠️  {svc}: No schema.prisma")
        continue
    
    with open(schema_file, 'r', encoding='utf-8') as f:
        schema = f.read()
    
    sql = parse_schema_to_sql(schema)
    
    if not sql:
        print(f"  ❌ {svc}: No SQL generated")
        continue
    
    # Save SQL locally for debugging
    local_sql = os.path.join(r'c:\Users\ofema\aivo\scripts\hetzner', f'{svc}_generated.sql')
    with open(local_sql, 'w', encoding='utf-8') as f:
        f.write(sql)
    
    result = run_sql_str(db_name, sql, svc.replace('-', '_'))
    
    creates = result.count('CREATE TABLE')
    existed = result.count('already exists')
    do_ok = result.count('DO')
    err_lines = [l for l in result.split('\n') 
                 if 'ERROR' in l and 'already exists' not in l and 'duplicate' not in l.lower()]
    
    if err_lines:
        print(f"  ⚠️  {svc} → {db_name}: {creates} tables, {len(err_lines)} errors")
        for e in err_lines[:5]:
            print(f"      {e[:130]}")
    else:
        print(f"  ✅ {svc} → {db_name}: {creates} tables created, {existed} already existed")

# Final table count
print("\n=== Final table counts ===")
all_dbs = {
    'auth-svc': 'aivo_auth', 'content-svc': 'aivo_content',
    'assessment-svc': 'aivo_assessment', 'analytics-svc': 'aivo_analytics',
    'profile-svc': 'aivo_profiles', 'goal-svc': 'aivo_goals',
    'notify-svc': 'aivo_notify', 'billing-svc': 'aivo_billing',
    'parent-svc': 'aivo_parent', 'session-svc': 'aivo_sessions',
    'messaging-svc': 'aivo_messaging', 'life-skills-svc': 'aivo_life_skills',
    'baseline-svc': 'aivo_baseline', 'consent-svc': 'aivo_consent',
    'personalization-svc': 'aivo_personalization', 'focus-svc': 'aivo_focus',
}
for svc, db in sorted(all_dbs.items()):
    out, _ = run(f"cd /tmp && sudo -u postgres psql -d {db} -t -c \"SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';\"")
    print(f"  {svc}: {out.strip()} tables")

sftp.close()
ssh.close()
