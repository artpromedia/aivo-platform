import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    return stdout.read().decode().strip()

# content-svc previous log (it started then crashed)
print("=== content-svc full log ===")
newest = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=content-svc --sort-by=.metadata.creationTimestamp -o jsonpath="{.items[-1:].metadata.name}"')
print(run(f'kubectl -n aivo-prod logs {newest} --previous --tail=30 2>&1'))

print()
print("=== content-svc current log ===")
print(run(f'kubectl -n aivo-prod logs {newest} --tail=30 2>&1'))

# Check DB connection - content-svc uses PgBouncer too
print()
print("=== PgBouncer config ===")
ssh2 = paramiko.SSHClient()
ssh2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh2.connect('95.217.76.42', username='root', password='Ebmx9V_r?a38NM', timeout=10)
stdin, stdout, stderr = ssh2.exec_command('cat /etc/pgbouncer/pgbouncer.ini | head -20', timeout=10)
print(stdout.read().decode().strip())
print()
stdin, stdout, stderr = ssh2.exec_command('grep -i "ignore_startup" /etc/pgbouncer/pgbouncer.ini 2>/dev/null; echo "---"; grep -i "pool_mode" /etc/pgbouncer/pgbouncer.ini 2>/dev/null', timeout=10)
print(stdout.read().decode().strip())
ssh2.close()

ssh.close()
