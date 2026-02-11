"""
Fix PgBouncer to ignore search_path startup parameter.
Fix assessment-svc/notify-svc ESM import path issue.
Check parent-svc fastify-plugin in deployed image.
"""
import paramiko

# 1. Fix PgBouncer
print("=== Fixing PgBouncer search_path ===")
ssh_db = paramiko.SSHClient()
ssh_db.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh_db.connect('95.217.76.42', username='root', password='Ebmx9V_r?a38NM', timeout=10)

def run_db(cmd):
    stdin, stdout, stderr = ssh_db.exec_command(cmd, timeout=15)
    return stdout.read().decode().strip(), stderr.read().decode().strip()

# Check if ignore_startup_parameters already set
out, _ = run_db('grep ignore_startup /etc/pgbouncer/pgbouncer.ini')
if out:
    print(f"  Already set: {out}")
else:
    # Add ignore_startup_parameters after pool_mode line
    out, err = run_db("sed -i '/^pool_mode/a ignore_startup_parameters = extra_float_digits,search_path' /etc/pgbouncer/pgbouncer.ini")
    if err:
        print(f"  Error: {err}")
    else:
        print("  Added ignore_startup_parameters = extra_float_digits,search_path")
    
    # Restart PgBouncer
    out, err = run_db("systemctl restart pgbouncer && systemctl status pgbouncer | head -5")
    print(f"  {out}")

# Verify
out, _ = run_db('grep ignore_startup /etc/pgbouncer/pgbouncer.ini')
print(f"  Config: {out}")

ssh_db.close()
print()

# 2. Check assessment-svc symlink in Docker image
print("=== Checking assessment-svc/notify-svc dist structure ===")
# This is a local Docker check
import subprocess
for svc in ['assessment-svc', 'notify-svc']:
    print(f"\n--- {svc} ---")
    r = subprocess.run(
        ['docker', 'run', '--rm', f'ghcr.io/artpromedia/aivo-{svc}:latest', 
         'sh', '-c', 'ls -la /app/dist/generated/ 2>&1; echo "---"; ls -la /app/dist/src/generated/ 2>&1; echo "---"; head -5 /app/dist/src/prisma.js 2>/dev/null || head -5 /app/dist/src/prisma.mjs 2>/dev/null || echo "No prisma.js found"'],
        capture_output=True, text=True
    )
    print(r.stdout[:500])

# 3. Check parent-svc for fastify-plugin
print("\n=== Checking parent-svc for fastify-plugin ===")
r = subprocess.run(
    ['docker', 'run', '--rm', 'ghcr.io/artpromedia/aivo-parent-svc:latest',
     'sh', '-c', 'ls /app/node_modules/fastify-plugin/index.js 2>&1; echo "---"; ls /app/node_modules/fastify/fastify.js 2>&1'],
    capture_output=True, text=True
)
print(r.stdout)
print(r.stderr[:200] if r.stderr else "")
