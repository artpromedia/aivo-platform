"""
Force image re-pull for analytics-svc and parent-svc by patching imagePullPolicy.
"""
import paramiko, json, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=30)

def run(cmd, timeout=60):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Check current image digest vs what GHCR has
print("=== Current image on nodes ===")
for svc in ['analytics-svc', 'parent-svc']:
    result = run(f"kubectl -n aivo-prod get deployment {svc} -o jsonpath='{{.spec.template.spec.containers[0].image}}'")
    print(f"  {svc}: {result}")
    # Check imagePullPolicy
    policy = run(f"kubectl -n aivo-prod get deployment {svc} -o jsonpath='{{.spec.template.spec.containers[0].imagePullPolicy}}'")
    print(f"    pullPolicy: {policy}")

# Patch to Always pull
print("\n=== Patching imagePullPolicy to Always ===")
for svc in ['analytics-svc', 'parent-svc']:
    patch = json.dumps([{
        "op": "replace",
        "path": "/spec/template/spec/containers/0/imagePullPolicy",
        "value": "Always"
    }])
    result = run(f"kubectl -n aivo-prod patch deployment {svc} --type='json' -p '{patch}'")
    print(f"  {svc}: {result}")

# The patch itself triggers a new rollout with Always pull policy
print("\nWaiting 60s for new pods with fresh image pull...")
time.sleep(60)

# Check
print("\n=== Deployment Status ===")
result = run('kubectl -n aivo-prod get deployments -o custom-columns="NAME:.metadata.name,READY:.status.readyReplicas,TOTAL:.status.replicas" --no-headers')
print(result)

for svc in ['analytics-svc', 'parent-svc']:
    pod = run(f"kubectl -n aivo-prod get pods --no-headers --sort-by=.metadata.creationTimestamp | grep '^{svc}' | tail -1 | awk '{{print $1}}'")
    ready = run(f"kubectl -n aivo-prod get pod {pod} -o jsonpath='{{.status.containerStatuses[0].ready}}'")
    restarts = run(f"kubectl -n aivo-prod get pod {pod} -o jsonpath='{{.status.containerStatuses[0].restartCount}}'")
    image_id = run(f"kubectl -n aivo-prod get pod {pod} -o jsonpath='{{.status.containerStatuses[0].imageID}}'")
    logs = run(f"kubectl -n aivo-prod logs {pod} --tail=10 2>&1")
    print(f"\n--- {svc} ({pod}) ready={ready} restarts={restarts} ---")
    print(f"  imageID: {image_id[:80]}")
    print(f"  logs: {logs[:400]}")

ssh.close()
