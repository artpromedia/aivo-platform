import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    return stdout.read().decode().strip()

# Check what probes are actually set on the newest pods
for svc in ['session-svc', 'content-svc', 'consent-svc', 'focus-svc']:
    pod = run(f'kubectl -n aivo-prod get pods -l app.kubernetes.io/name={svc} --sort-by=.metadata.creationTimestamp -o jsonpath="{{.items[-1].metadata.name}}"')
    
    # Get readiness probe config
    rp = run(f'kubectl -n aivo-prod get pod {pod} -o jsonpath="{{.spec.containers[0].readinessProbe}}"')
    lp = run(f'kubectl -n aivo-prod get pod {pod} -o jsonpath="{{.spec.containers[0].livenessProbe}}"')
    
    print(f"{svc} ({pod}):")
    print(f"  readiness: {rp[:150]}")
    print(f"  liveness: {lp[:150]}")

ssh.close()
