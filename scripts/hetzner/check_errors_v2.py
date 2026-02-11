import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    return stdout.read().decode().strip()

# Check assessment-svc full error
print("=== assessment-svc error ===")
newest = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=assessment-svc --sort-by=.metadata.creationTimestamp -o jsonpath="{.items[-1:].metadata.name}"')
print(run(f'kubectl -n aivo-prod logs {newest} --tail=15 2>&1'))

print("\n=== parent-svc error ===")
newest = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=parent-svc --sort-by=.metadata.creationTimestamp -o jsonpath="{.items[-1:].metadata.name}"')
print(run(f'kubectl -n aivo-prod logs {newest} --tail=15 2>&1'))

# Check auth-svc /health and /ready
print("\n=== auth-svc /health check ===")
newest = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=auth-svc --sort-by=.metadata.creationTimestamp -o jsonpath="{.items[-1:].metadata.name}"')
print(run(f'kubectl -n aivo-prod exec {newest} -- wget -qO- http://localhost:3000/health 2>&1'))
print()
print(run(f'kubectl -n aivo-prod exec {newest} -- wget -qO- http://localhost:3000/ready 2>&1'))

# Check billing-svc error details
print("\n=== billing-svc error ===")
newest = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=billing-svc --sort-by=.metadata.creationTimestamp -o jsonpath="{.items[-1:].metadata.name}"')
print(run(f'kubectl -n aivo-prod logs {newest} --tail=10 2>&1'))

ssh.close()

# Also check PgBouncer
print("\n=== PgBouncer status ===")
ssh2 = paramiko.SSHClient()
ssh2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh2.connect('95.217.76.42', username='root', password='Ebmx9V_r?a38NM', timeout=10)

def run2(cmd):
    stdin, stdout, stderr = ssh2.exec_command(cmd, timeout=15)
    return stdout.read().decode().strip()

print(run2('systemctl status pgbouncer | head -5'))
print()
print(run2('grep ignore_startup /etc/pgbouncer/pgbouncer.ini'))
print()
# Check if databases exist
print("=== PostgreSQL databases ===")
print(run2("sudo -u postgres psql -l 2>&1 | grep aivo"))

ssh2.close()
