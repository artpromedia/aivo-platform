"""
Debug: Wait for debug pods to be ready then inspect compiled output.
"""
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=30)

def run(cmd, timeout=60):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Clean up first
run("kubectl -n aivo-prod delete pod debug-analytics debug-parent --force --grace-period=0 2>&1")
time.sleep(5)

# Create debug pods with override command (no env vars needed, just shell access)
print("Creating debug pods...")
run("kubectl -n aivo-prod run debug-analytics --image=ghcr.io/artpromedia/aivo-analytics-svc:latest --restart=Never --overrides='{\"spec\":{\"containers\":[{\"name\":\"debug-analytics\",\"image\":\"ghcr.io/artpromedia/aivo-analytics-svc:latest\",\"command\":[\"sleep\",\"600\"],\"imagePullPolicy\":\"Always\"}]}}' 2>&1")
run("kubectl -n aivo-prod run debug-parent --image=ghcr.io/artpromedia/aivo-parent-svc:latest --restart=Never --overrides='{\"spec\":{\"containers\":[{\"name\":\"debug-parent\",\"image\":\"ghcr.io/artpromedia/aivo-parent-svc:latest\",\"command\":[\"sleep\",\"600\"],\"imagePullPolicy\":\"Always\"}]}}' 2>&1")

# Wait for pods to be running
print("Waiting for pods to start...")
for i in range(30):
    status = run("kubectl -n aivo-prod get pod debug-analytics debug-parent --no-headers 2>&1")
    print(f"  [{i*5}s] {status}")
    if 'Running' in status and status.count('Running') >= 2:
        break
    time.sleep(5)

print("\n" + "="*80)
print("=== analytics-svc: Inspect dist/ ===")
print("="*80)

# Check if dist directory exists
result = run("kubectl -n aivo-prod exec debug-analytics -- ls /app/dist/ 2>&1")
print(f"\ndist/ top level:\n{result}")

# Check routes and services
result = run("kubectl -n aivo-prod exec debug-analytics -- find /app/dist -name '*.js' -type f 2>&1")
print(f"\nAll .js files in dist/:\n{result}")

# Check if teacher-analytics files exist
result = run("kubectl -n aivo-prod exec debug-analytics -- ls -la /app/dist/routes/teacher-analytics.routes.js 2>&1")
print(f"\nteacher-analytics.routes.js exists?:\n{result}")

result = run("kubectl -n aivo-prod exec debug-analytics -- ls -la /app/dist/services/teacher-analytics.service.js 2>&1")
print(f"\nteacher-analytics.service.js exists?:\n{result}")

# Check index.js for the import
result = run("kubectl -n aivo-prod exec debug-analytics -- grep -n 'teacher-analytics' /app/dist/index.js 2>&1")
print(f"\nteacher-analytics references in index.js:\n{result}")

# Check package.json
result = run("kubectl -n aivo-prod exec debug-analytics -- cat /app/package.json 2>&1")
print(f"\npackage.json:\n{result}")

print("\n" + "="*80)
print("=== parent-svc: Inspect dist/ ===")
print("="*80)

result = run("kubectl -n aivo-prod exec debug-parent -- ls -la /app/dist/ 2>&1")
print(f"\ndist/ contents:\n{result}")

# Check jsonwebtoken import pattern
result = run("kubectl -n aivo-prod exec debug-parent -- grep -n 'jsonwebtoken' /app/dist/index.js 2>&1")
print(f"\njsonwebtoken refs in dist/index.js:\n{result}")

# Get lines around the jsonwebtoken import
result = run("kubectl -n aivo-prod exec debug-parent -- sed -n '19240,19260p' /app/dist/index.js 2>&1")
print(f"\nLines around error (19240-19260):\n{result}")

# Check the import statement at top of file
result = run("kubectl -n aivo-prod exec debug-parent -- head -100 /app/dist/index.js 2>&1")
print(f"\nFirst 100 lines of dist/index.js:\n{result}")

# Check package.json
result = run("kubectl -n aivo-prod exec debug-parent -- cat /app/package.json 2>&1")
print(f"\npackage.json:\n{result}")

# Check tsup config if exists
result = run("kubectl -n aivo-prod exec debug-parent -- cat /app/tsup.config.ts 2>&1")
print(f"\ntsup.config.ts:\n{result}")
result = run("kubectl -n aivo-prod exec debug-parent -- cat /app/tsup.config.js 2>&1")
print(f"\ntsup.config.js:\n{result}")

ssh.close()
