"""
Check assessment-svc issue and fix the readiness probes that couldn't be patched earlier.
"""
import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=15)

def run(cmd, timeout=15):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Check assessment-svc readiness probe
print("=== assessment-svc current readiness probe ===")
result = run("kubectl -n aivo-prod get deployment assessment-svc -o jsonpath='{.spec.template.spec.containers[0].readinessProbe}' | python3 -m json.tool")
print(result)

# Check assessment-svc latest pod logs and events
pod = run("kubectl -n aivo-prod get pods --no-headers --sort-by=.metadata.creationTimestamp | grep '^assessment-svc' | tail -1 | awk '{print $1}'")
print(f"\n=== assessment-svc pod {pod} logs ===")
print(run(f"kubectl -n aivo-prod logs {pod} --tail=20 2>&1"))

print(f"\n=== assessment-svc pod events ===")
print(run(f"kubectl -n aivo-prod describe pod {pod} | tail -20"))

# Check if the /ready endpoint works
print(f"\n=== assessment-svc /ready and /health test ===")
print(run(f"kubectl -n aivo-prod exec {pod} -- wget -qO- http://localhost:3000/health 2>&1 || echo 'FAILED'"))
print(run(f"kubectl -n aivo-prod exec {pod} -- wget -qO- http://localhost:3000/ready 2>&1 || echo 'FAILED'"))

ssh.close()
