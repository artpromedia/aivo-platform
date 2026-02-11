import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    print(f"$ {cmd}")
    if out: print(out)
    if err: print(f"STDERR: {err}")
    print()

run('kubectl -n aivo-prod get deploy content-svc -o jsonpath="{.spec.template.spec.containers[0].imagePullPolicy}"')
run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=content-svc --sort-by=.metadata.creationTimestamp -o wide 2>&1 | tail -5')
run('kubectl -n aivo-prod logs --tail=5 -l app.kubernetes.io/name=content-svc 2>&1 | tail -10')

ssh.close()
