"""
Run Prisma migrations for all services that have Prisma schemas.
We'll run the migration from within a running pod for each service.
"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

# Services with Prisma schemas (and thus migrations)
prisma_services = [
    'auth-svc', 'session-svc', 'content-svc', 'profile-svc',
    'messaging-svc', 'goal-svc', 'life-skills-svc', 'baseline-svc',
    'assessment-svc', 'notify-svc', 'consent-svc', 'personalization-svc',
    'billing-svc', 'payments-svc', 'analytics-svc', 'focus-svc',
    'parent-svc'
]

print("=== Running Prisma Migrations ===")
for svc in prisma_services:
    # Get a running pod
    out, err = run(f'kubectl -n aivo-prod get pods -l app.kubernetes.io/name={svc} --field-selector=status.phase=Running -o jsonpath="{{.items[0].metadata.name}}" 2>/dev/null')
    pod = out
    if not pod:
        print(f"❌ {svc}: No running pod found")
        continue
    
    # Check if prisma migration directory exists
    out, err = run(f'kubectl -n aivo-prod exec {pod} -- ls /app/prisma/migrations 2>&1')
    if 'No such file' in out or 'No such file' in err:
        # Try generated location
        out, err = run(f'kubectl -n aivo-prod exec {pod} -- ls /app/generated/prisma-client 2>&1')
        if 'No such file' in out or 'No such file' in err:
            print(f"⚠️  {svc}: No prisma/migrations directory found")
            continue
        else:
            print(f"ℹ️  {svc}: Has generated client but no migrations dir")
            continue
    
    # Check if schema.prisma exists
    out, err = run(f'kubectl -n aivo-prod exec {pod} -- ls /app/prisma/schema.prisma 2>&1')
    if 'No such file' in out or 'No such file' in err:
        print(f"⚠️  {svc}: No schema.prisma found")
        continue
    
    # Run prisma migrate deploy
    print(f"🔄 {svc}: Running prisma migrate deploy...")
    out, err = run(f'kubectl -n aivo-prod exec {pod} -- npx prisma migrate deploy --schema=/app/prisma/schema.prisma 2>&1', timeout=120)
    result = out if out else err
    
    if 'All migrations have been successfully applied' in result or 'migrations have been applied' in result:
        print(f"  ✅ {svc}: Migrations applied successfully")
    elif 'No pending migrations' in result:
        print(f"  ✅ {svc}: Already up to date")
    elif 'database "' in result and 'does not exist' in result:
        print(f"  ❌ {svc}: Database does not exist: {result[:100]}")
    else:
        # Show first few lines of output
        lines = result.split('\n')
        summary = '\n'.join(lines[:5])
        print(f"  ❓ {svc}: {summary[:200]}")

ssh.close()
print("\nDone!")
