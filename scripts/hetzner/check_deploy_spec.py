import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    return stdout.read().decode().strip()

# Check the DEPLOYMENT spec (not pod spec) for the readiness probe
for svc in ['session-svc', 'content-svc', 'consent-svc', 'focus-svc']:
    rp = run(f'kubectl -n aivo-prod get deployment {svc} -o jsonpath="{{.spec.template.spec.containers[0].readinessProbe}}"')
    print(f"{svc} deployment readinessProbe: {rp[:200]}")

ssh.close()
