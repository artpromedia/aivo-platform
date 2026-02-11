"""
Redeploy analytics-svc and parent-svc with new images.
"""
import paramiko, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=30)

def run(cmd, timeout=60):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Restart both services
print("Restarting analytics-svc and parent-svc...")
r1 = run("kubectl -n aivo-prod rollout restart deployment/analytics-svc")
print(f"  analytics: {r1}")
r2 = run("kubectl -n aivo-prod rollout restart deployment/parent-svc")
print(f"  parent: {r2}")

# Also clean up old ReplicaSets (reduce from 3 to 2 replicas target for failing ones)
print("\nScaling analytics-svc and parent-svc to 2 replicas...")
run("kubectl -n aivo-prod scale deployment/analytics-svc --replicas=2")
run("kubectl -n aivo-prod scale deployment/parent-svc --replicas=2")

print("\nWaiting 60s for new pods...")
time.sleep(60)

# Check
print("\n=== Deployment Status ===")
result = run('kubectl -n aivo-prod get deployments -o custom-columns="NAME:.metadata.name,READY:.status.readyReplicas,TOTAL:.status.replicas" --no-headers')
print(result)

for svc in ['analytics-svc', 'parent-svc']:
    pod = run(f"kubectl -n aivo-prod get pods --no-headers --sort-by=.metadata.creationTimestamp | grep '^{svc}' | tail -1 | awk '{{print $1}}'")
    ready = run(f"kubectl -n aivo-prod get pod {pod} -o jsonpath='{{.status.containerStatuses[0].ready}}'")
    restarts = run(f"kubectl -n aivo-prod get pod {pod} -o jsonpath='{{.status.containerStatuses[0].restartCount}}'")
    logs = run(f"kubectl -n aivo-prod logs {pod} --tail=10 2>&1")
    print(f"\n--- {svc} ({pod}) ready={ready} restarts={restarts} ---")
    print(logs[:400])

ssh.close()
