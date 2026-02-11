"""
Redeploy analytics-svc and parent-svc with new images, then verify all 18 services.
"""
import paramiko, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=15)

def run(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Restart both services to pull new images
print("=== Restarting analytics-svc and parent-svc ===")
print(run("kubectl -n aivo-prod rollout restart deployment/analytics-svc deployment/parent-svc"))

print("\nWaiting 60s for new pods to pull images and start...")
time.sleep(60)

# Check status
print("\n=== Deployment Status ===")
result = run('kubectl -n aivo-prod get deployments -o custom-columns="NAME:.metadata.name,READY:.status.readyReplicas,TOTAL:.status.replicas" --no-headers')
print(result)

# Check analytics-svc
print("\n=== analytics-svc ===")
pod = run("kubectl -n aivo-prod get pods --no-headers --sort-by=.metadata.creationTimestamp | grep '^analytics-svc' | tail -1 | awk '{print $1}'")
ready = run(f"kubectl -n aivo-prod get pod {pod} -o jsonpath='{{.status.containerStatuses[0].ready}}'")
logs = run(f"kubectl -n aivo-prod logs {pod} --tail=10 2>&1")
print(f"  Pod: {pod}, Ready: {ready}")
print(f"  Logs: {logs[:300]}")

# Check parent-svc
print("\n=== parent-svc ===")
pod = run("kubectl -n aivo-prod get pods --no-headers --sort-by=.metadata.creationTimestamp | grep '^parent-svc' | tail -1 | awk '{print $1}'")
ready = run(f"kubectl -n aivo-prod get pod {pod} -o jsonpath='{{.status.containerStatuses[0].ready}}'")
logs = run(f"kubectl -n aivo-prod logs {pod} --tail=10 2>&1")
print(f"  Pod: {pod}, Ready: {ready}")
print(f"  Logs: {logs[:300]}")

ssh.close()
