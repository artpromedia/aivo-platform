"""
Fix assessment-svc NATS connection. Check if NATS is running anywhere and fix the URL.
Also check shared-secrets for nats-url.
"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=15)

def run(cmd, timeout=15):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Check shared-secrets for nats-url
print("=== shared-secrets nats-url ===")
result = run("kubectl -n aivo-prod get secret shared-secrets -o jsonpath='{.data.nats-url}' | base64 -d")
print(f"  NATS_URL: {result}")

# Check if there's a NATS deployment/service in the cluster
print("\n=== NATS service/deployment ===")
print(run("kubectl get all -A | grep nats 2>&1"))

# Check if NATS is running on db1
print("\n=== NATS on db1? ===")
ssh_db = paramiko.SSHClient()
ssh_db.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh_db.connect('95.217.76.42', username='root', password='Ebmx9V_r?a38NM', timeout=15)
si, so, se = ssh_db.exec_command("ss -tlnp | grep 4222")
print(so.read().decode().strip() or "  NATS not running on db1")
ssh_db.close()

# Check assessment-svc deployment env vars
print("\n=== assessment-svc current env vars ===")
result = run("kubectl -n aivo-prod get deployment assessment-svc -o jsonpath='{.spec.template.spec.containers[0].env}' | python3 -m json.tool")
print(result)

# Check full assessment-svc logs
print("\n=== assessment-svc latest pod full logs ===")
pod = run("kubectl -n aivo-prod get pods --no-headers --sort-by=.metadata.creationTimestamp | grep '^assessment-svc' | tail -1 | awk '{print $1}'")
print(run(f"kubectl -n aivo-prod logs {pod} --tail=30 2>&1"))

ssh.close()
