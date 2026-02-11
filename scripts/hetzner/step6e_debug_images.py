"""
Debug: Run temporary containers from the images to inspect compiled output.
Also check exact service errors.
"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=30)

def run(cmd, timeout=60):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# 1. Check analytics-svc image dist contents
print("=== analytics-svc: Inspect image dist/ ===")
# Use kubectl debug or run a temp container
result = run("kubectl -n aivo-prod run debug-analytics --image=ghcr.io/artpromedia/aivo-analytics-svc:latest --restart=Never --command -- sleep 300 2>&1")
print(f"  Create debug pod: {result}")

import time
time.sleep(10)

result = run("kubectl -n aivo-prod exec debug-analytics -- ls -la /app/dist/services/ 2>&1")
print(f"\n  dist/services/ contents:\n{result}")

result = run("kubectl -n aivo-prod exec debug-analytics -- ls -la /app/dist/routes/ 2>&1")
print(f"\n  dist/routes/ contents:\n{result}")

result = run("kubectl -n aivo-prod exec debug-analytics -- cat /app/dist/routes/teacher-analytics.routes.js 2>&1")
print(f"\n  teacher-analytics.routes.js content:\n{result}")

result = run("kubectl -n aivo-prod exec debug-analytics -- cat /app/dist/index.js 2>&1 | head -30")
print(f"\n  index.js first 30 lines:\n{result}")

# 2. Check parent-svc image dist contents
print("\n\n=== parent-svc: Inspect image dist/ ===")
result = run("kubectl -n aivo-prod run debug-parent --image=ghcr.io/artpromedia/aivo-parent-svc:latest --restart=Never --command -- sleep 300 2>&1")
print(f"  Create debug pod: {result}")

time.sleep(10)

# parent-svc uses tsup which bundles to dist/index.js
result = run("kubectl -n aivo-prod exec debug-parent -- ls -la /app/dist/ 2>&1")
print(f"\n  dist/ contents:\n{result}")

# Check the jsonwebtoken import in the bundled output
result = run("kubectl -n aivo-prod exec debug-parent -- grep -n 'jsonwebtoken' /app/dist/index.js 2>&1 | head -20")
print(f"\n  jsonwebtoken references in dist/index.js:\n{result}")

# Check how it imports jsonwebtoken
result = run("kubectl -n aivo-prod exec debug-parent -- head -50 /app/dist/index.js 2>&1")
print(f"\n  First 50 lines of dist/index.js:\n{result}")

# Check package.json type field
result = run("kubectl -n aivo-prod exec debug-parent -- cat /app/package.json 2>&1")
print(f"\n  package.json:\n{result}")

# Clean up
run("kubectl -n aivo-prod delete pod debug-analytics debug-parent --force 2>&1")

ssh.close()
