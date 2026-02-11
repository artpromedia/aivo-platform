"""
Deploy NATS to K3s and update shared-secrets with the NATS URL.
"""
import paramiko, json, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=15)

def run(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Deploy a minimal NATS server in the same namespace
nats_manifest = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats
  namespace: aivo-prod
  labels:
    app.kubernetes.io/name: nats
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: nats
  template:
    metadata:
      labels:
        app.kubernetes.io/name: nats
    spec:
      containers:
      - name: nats
        image: nats:2.10-alpine
        args: ["-js", "-m", "8222"]
        ports:
        - containerPort: 4222
          name: client
        - containerPort: 8222
          name: monitor
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 256Mi
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8222
          initialDelaySeconds: 5
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8222
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: nats
  namespace: aivo-prod
  labels:
    app.kubernetes.io/name: nats
spec:
  selector:
    app.kubernetes.io/name: nats
  ports:
  - name: client
    port: 4222
    targetPort: 4222
  - name: monitor
    port: 8222
    targetPort: 8222
  type: ClusterIP
"""

print("=== Deploying NATS to aivo-prod ===")
# Write manifest and apply
run(f"cat <<'EEOF' > /tmp/nats.yaml\n{nats_manifest}\nEEOF")
result = run("kubectl apply -f /tmp/nats.yaml")
print(result)

# Wait for NATS to be ready
print("\nWaiting for NATS to start...")
time.sleep(20)
result = run("kubectl -n aivo-prod get pods -l app.kubernetes.io/name=nats --no-headers")
print(f"  NATS pod: {result}")

# Update shared-secrets with NATS URL
# The NATS ClusterIP service will be nats.aivo-prod.svc.cluster.local:4222
nats_url = "nats://nats.aivo-prod.svc.cluster.local:4222"
print(f"\n=== Updating shared-secrets with nats-url: {nats_url} ===")

# First check which secret name the services actually use
print("\n=== Check which secret assessment-svc uses for NATS ===")
result = run("kubectl -n aivo-prod get deployment assessment-svc -o jsonpath='{.spec.template.spec.containers[0].env}' | python3 -c 'import sys,json; [print(e) for e in json.load(sys.stdin) if e.get(\"name\")==\"NATS_URL\"]'")
print(f"  {result}")

# It uses shared-secrets key nats-url
# Also check what the manifest says (some use aivo-common-secrets)
result = run("kubectl -n aivo-prod get secret shared-secrets -o json 2>&1 | head -3")
print(f"  shared-secrets exists: {result}")
result = run("kubectl -n aivo-prod get secret aivo-common-secrets -o json 2>&1 | head -3")
print(f"  aivo-common-secrets exists: {result}")

import base64
nats_url_b64 = base64.b64encode(nats_url.encode()).decode()

# Patch both secrets if they exist
print("\n=== Patching secrets with NATS URL ===")
result = run(f"kubectl -n aivo-prod patch secret shared-secrets -p '{{\"data\":{{\"nats-url\":\"{nats_url_b64}\"}}}}' 2>&1")
print(f"  shared-secrets: {result}")

result = run(f"kubectl -n aivo-prod patch secret aivo-common-secrets -p '{{\"data\":{{\"nats-url\":\"{nats_url_b64}\"}}}}' 2>&1")
print(f"  aivo-common-secrets: {result}")

# Restart assessment-svc to pick up the new NATS URL
print("\n=== Restarting assessment-svc ===")
result = run("kubectl -n aivo-prod rollout restart deployment/assessment-svc")
print(f"  {result}")

# Wait and check
print("\nWaiting 30s...")
time.sleep(30)

result = run("kubectl -n aivo-prod get deployment assessment-svc -o custom-columns='READY:.status.readyReplicas,TOTAL:.status.replicas' --no-headers")
print(f"\n=== assessment-svc status: READY={result} ===")

# Check the latest assessment-svc pod logs
pod = run("kubectl -n aivo-prod get pods --no-headers --sort-by=.metadata.creationTimestamp | grep '^assessment-svc' | tail -1 | awk '{print $1}'")
logs = run(f"kubectl -n aivo-prod logs {pod} --tail=15 2>&1")
print(f"\n=== assessment-svc logs ({pod}) ===")
print(logs)

ssh.close()
