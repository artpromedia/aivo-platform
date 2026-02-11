import paramiko, sys, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=30)

def r(c):
    i, o, e = ssh.exec_command(c, timeout=120)
    out = o.read().decode().strip()
    err = e.read().decode().strip()
    res = out if out else err
    print(f"CMD> {c[:80]}")
    print(res)
    print()
    sys.stdout.flush()
    return res

# Cleanup old pods
r("kubectl -n aivo-prod delete pod debug-analytics debug-parent --ignore-not-found --force")

# Write YAML to server
yaml = """apiVersion: v1
kind: Pod
metadata:
  name: debug-analytics
  namespace: aivo-prod
spec:
  imagePullSecrets:
  - name: ghcr-pull-secret
  containers:
  - name: debug
    image: ghcr.io/artpromedia/aivo-analytics-svc:latest
    command: ["sleep", "600"]
---
apiVersion: v1
kind: Pod
metadata:
  name: debug-parent
  namespace: aivo-prod
spec:
  imagePullSecrets:
  - name: ghcr-pull-secret
  containers:
  - name: debug
    image: ghcr.io/artpromedia/aivo-parent-svc:latest
    command: ["sleep", "600"]
"""

# Write the YAML file
sftp = ssh.open_sftp()
with sftp.file("/tmp/debug-pods.yaml", "w") as f:
    f.write(yaml)
sftp.close()
print("Wrote /tmp/debug-pods.yaml")

r("kubectl apply -f /tmp/debug-pods.yaml")

print("Waiting 30s for pods to pull images and start...")
sys.stdout.flush()
time.sleep(30)

r("kubectl -n aivo-prod get pod debug-analytics debug-parent")

# Now inspect analytics-svc dist
print("=" * 60)
print("ANALYTICS-SVC: Checking dist/ contents")
print("=" * 60)
r("kubectl -n aivo-prod exec debug-analytics -c debug -- ls -la /app/dist/")
r("kubectl -n aivo-prod exec debug-analytics -c debug -- ls -la /app/dist/routes/ 2>&1")
r("kubectl -n aivo-prod exec debug-analytics -c debug -- ls -la /app/dist/services/ 2>&1")
r("kubectl -n aivo-prod exec debug-analytics -c debug -- cat /app/dist/routes/teacher-analytics.routes.js 2>&1")
r("kubectl -n aivo-prod exec debug-analytics -c debug -- head -30 /app/dist/index.js 2>&1")

# Now inspect parent-svc dist
print("=" * 60)
print("PARENT-SVC: Checking dist/ contents")
print("=" * 60)
r("kubectl -n aivo-prod exec debug-parent -c debug -- ls -la /app/dist/")
r("kubectl -n aivo-prod exec debug-parent -c debug -- grep -n 'jsonwebtoken' /app/dist/index.js 2>&1")
r("kubectl -n aivo-prod exec debug-parent -c debug -- cat /app/package.json 2>&1")
r("kubectl -n aivo-prod exec debug-parent -c debug -- head -5 /app/dist/index.js 2>&1")

ssh.close()
print("\nDONE")
