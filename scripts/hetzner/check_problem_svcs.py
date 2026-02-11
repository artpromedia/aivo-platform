import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Check auth-svc logs
print("=== auth-svc latest pod logs ===")
pod = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=auth-svc -o jsonpath="{.items[0].metadata.name}"')
print(f"Pod: {pod}")
print(run(f'kubectl -n aivo-prod logs {pod} --tail=50'))

print("\n=== auth-svc pod status ===")
print(run(f'kubectl -n aivo-prod get pod {pod} -o wide'))

# Also check parent-svc logs  
print("\n=== parent-svc latest pod logs ===")
ppod = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=parent-svc -o jsonpath="{.items[0].metadata.name}"')
print(f"Pod: {ppod}")
print(run(f'kubectl -n aivo-prod logs {ppod} --tail=50'))

# Also check analytics-svc logs
print("\n=== analytics-svc latest pod logs ===")
apod = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=analytics-svc -o jsonpath="{.items[0].metadata.name}"')
print(f"Pod: {apod}")
print(run(f'kubectl -n aivo-prod logs {apod} --tail=30'))

# Check consent-svc 
print("\n=== consent-svc latest pod logs ===")
cpod = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=consent-svc -o jsonpath="{.items[0].metadata.name}"')
print(f"Pod: {cpod}")
print(run(f'kubectl -n aivo-prod logs {cpod} --tail=30'))

ssh.close()
