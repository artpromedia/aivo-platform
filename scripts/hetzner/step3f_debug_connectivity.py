"""
Debug PgBouncer connectivity: check if K3s pods can reach 10.0.0.1:6432.
The issue is that healthy services (auth-svc, billing-svc, session-svc) CAN reach it
but unhealthy services (goal-svc, etc.) cannot. Need to figure out the difference.
"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=15)

def run(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Check which nodes the failing pods are on
print("=== Pod node distribution ===")
result = run("kubectl -n aivo-prod get pods -o custom-columns='NAME:.metadata.name,NODE:.spec.nodeName,STATUS:.status.phase,READY:.status.containerStatuses[0].ready' --no-headers | grep -E '(goal|notify|profile|payments|assessment|personalization|auth-svc|billing|session)' | sort")
print(result)

# Test connectivity from a healthy pod vs an unhealthy pod
print("\n=== Testing from a healthy pod (auth-svc) ===")
healthy_pod = run("kubectl -n aivo-prod get pods --no-headers | grep 'auth-svc' | head -1 | awk '{print $1}'")
print(f"Pod: {healthy_pod}")
result = run(f"kubectl -n aivo-prod exec {healthy_pod} -- wget -qO- -T 5 http://10.0.0.1:6432/ 2>&1 || true")
print(f"wget result: {result[:200]}")

print("\n=== Testing from a failing pod (goal-svc) ===")
failing_pod = run("kubectl -n aivo-prod get pods --no-headers | grep 'goal-svc' | head -1 | awk '{print $1}'")
print(f"Pod: {failing_pod}")
result = run(f"kubectl -n aivo-prod exec {failing_pod} -- wget -qO- -T 5 http://10.0.0.1:6432/ 2>&1 || true")
print(f"wget result: {result[:200]}")

# Check actual container logs more carefully for goal-svc — startup logs
print("\n=== goal-svc full startup logs ===")
result = run(f"kubectl -n aivo-prod logs {failing_pod} --tail=50 2>&1")
print(result)

# Check if the DB password in the secret has special chars that need encoding
print("\n=== Check actual DATABASE_URL for goal-svc (raw base64) ===")
result = run("kubectl -n aivo-prod get secret goal-svc-secrets -o jsonpath='{.data.database-url}' | base64 -d")
print(f"  {result}")

# Check actual DATABASE_URL for a healthy service
print("\n=== Check actual DATABASE_URL for auth-svc (raw) ===")
result = run("kubectl -n aivo-prod get secret auth-svc-secrets -o jsonpath='{.data.database-url}' | base64 -d")
print(f"  {result}")

ssh.close()
