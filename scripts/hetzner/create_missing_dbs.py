import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.217.76.42', username='root', password='Ebmx9V_r?a38NM', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

# Databases that need to be created (referenced in secrets but don't exist)
missing_dbs = [
    'aivo_profiles',
    'aivo_messaging',
    'aivo_goals',
    'aivo_life_skills',
    'aivo_baseline',
    'aivo_notify',
    'aivo_consent',
    'aivo_personalization',
    'aivo_billing',
    'aivo_sessions',
    'aivo_focus',
]

print("=== Creating missing databases ===")
for db in missing_dbs:
    out, err = run(f"sudo -u postgres psql -c \"CREATE DATABASE {db} OWNER aivo_app;\" 2>&1")
    if 'already exists' in (out + err):
        print(f"  {db}: already exists")
    elif 'CREATE DATABASE' in (out + err):
        print(f"  ✅ {db}: created")
    else:
        print(f"  ❌ {db}: {out} {err}")

# Verify all expected databases exist now
print("\n=== Verification ===")
out, _ = run("sudo -u postgres psql -l 2>&1 | grep aivo | awk '{print $1}' | sort")
print(out)

ssh.close()
