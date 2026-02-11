"""
Debug: Check the compiled dist output inside the new Docker images to verify our fixes made it in.
"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=30)

def run(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Check analytics-svc: is the .js extension in the compiled output?
print("=== analytics-svc: Check compiled import in dist ===")
pod = run("kubectl -n aivo-prod get pods --no-headers --sort-by=.metadata.creationTimestamp | grep '^analytics-svc' | tail -1 | awk '{print $1}'")
result = run(f"kubectl -n aivo-prod exec {pod} -- grep -n 'teacher-analytics.service' dist/routes/teacher-analytics.routes.js 2>&1")
print(f"  Pod: {pod}")
print(f"  Compiled import lines:\n{result}")

# Check: does the source file in the image have our fix?
result2 = run(f"kubectl -n aivo-prod exec {pod} -- cat dist/routes/teacher-analytics.routes.js 2>&1 | head -20")
print(f"\n  First 20 lines of compiled file:\n{result2}")

# Check parent-svc: is the 'import type' in the compiled output?
print("\n=== parent-svc: Check compiled output ===")
pod = run("kubectl -n aivo-prod get pods --no-headers --sort-by=.metadata.creationTimestamp | grep '^parent-svc' | tail -1 | awk '{print $1}'")
# The error is about jsonwebtoken, not express. The express fix may have worked but there's another ESM issue.
result = run(f"kubectl -n aivo-prod logs {pod} --tail=30 2>&1")
print(f"  Pod: {pod}")
print(f"  Full error:\n{result}")

ssh.close()
