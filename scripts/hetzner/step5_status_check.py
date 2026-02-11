"""
Check current cluster status, then rebuild analytics-svc and parent-svc images.
"""
import paramiko, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=15)

def run(cmd, timeout=15):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

print("=== Current Deployment Status ===")
result = run('kubectl -n aivo-prod get deployments -o custom-columns="NAME:.metadata.name,READY:.status.readyReplicas,TOTAL:.status.replicas,AVAIL:.status.availableReplicas" --no-headers')
print(result)

print("\n=== assessment-svc status ===")
pod = run("kubectl -n aivo-prod get pods --no-headers --sort-by=.metadata.creationTimestamp | grep '^assessment-svc' | tail -1 | awk '{print $1}'")
ready = run(f"kubectl -n aivo-prod get pod {pod} -o jsonpath='{{.status.containerStatuses[0].ready}}'")
print(f"  Pod: {pod}, Ready: {ready}")

print("\n=== analytics-svc latest logs ===")
pod = run("kubectl -n aivo-prod get pods --no-headers --sort-by=.metadata.creationTimestamp | grep '^analytics-svc' | tail -1 | awk '{print $1}'")
logs = run(f"kubectl -n aivo-prod logs {pod} --tail=5 2>&1")
print(f"  Pod: {pod}")
print(f"  {logs}")

print("\n=== parent-svc latest logs ===")
pod = run("kubectl -n aivo-prod get pods --no-headers --sort-by=.metadata.creationTimestamp | grep '^parent-svc' | tail -1 | awk '{print $1}'")
logs = run(f"kubectl -n aivo-prod logs {pod} --tail=5 2>&1")
print(f"  Pod: {pod}")
print(f"  {logs}")

ssh.close()
