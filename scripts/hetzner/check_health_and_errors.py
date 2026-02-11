import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    return stdout.read().decode().strip()

# Check K8s health probe config for content-svc
print("=== K8s liveness probe for content-svc ===")
print(run('kubectl -n aivo-prod get deploy content-svc -o jsonpath="{.spec.template.spec.containers[0].livenessProbe}"'))
print()
print("=== K8s readiness probe for content-svc ===")
print(run('kubectl -n aivo-prod get deploy content-svc -o jsonpath="{.spec.template.spec.containers[0].readinessProbe}"'))
print()

# Check Dockerfile HEALTHCHECK from running container
print("=== Health route test on content-svc ===")
newest = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=content-svc --sort-by=.metadata.creationTimestamp -o jsonpath="{.items[-1:].metadata.name}"')
print(f"Pod: {newest}")
print(run(f'kubectl -n aivo-prod exec {newest} -- wget -qO- http://localhost:3000/health 2>&1'))
print()
print(run(f'kubectl -n aivo-prod exec {newest} -- wget -qO- http://localhost:3000/health/live 2>&1'))
print()

# Check assessment-svc full error
print("=== assessment-svc full log ===")
newest_assess = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=assessment-svc --sort-by=.metadata.creationTimestamp -o jsonpath="{.items[-1:].metadata.name}"')
print(run(f'kubectl -n aivo-prod logs {newest_assess} --tail=20 2>&1'))
print()

# Check parent-svc full error
print("=== parent-svc full log ===")
newest_parent = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=parent-svc --sort-by=.metadata.creationTimestamp -o jsonpath="{.items[-1:].metadata.name}"')
print(run(f'kubectl -n aivo-prod logs {newest_parent} --tail=20 2>&1'))
print()

# Check billing-svc full error
print("=== billing-svc full log ===")
newest_billing = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=billing-svc --sort-by=.metadata.creationTimestamp -o jsonpath="{.items[-1:].metadata.name}"')
print(run(f'kubectl -n aivo-prod logs {newest_billing} --tail=20 2>&1'))

# Check life-skills-svc PgBouncer error
print()
print("=== life-skills-svc log (PgBouncer issue) ===")
newest_ls = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=life-skills-svc --sort-by=.metadata.creationTimestamp -o jsonpath="{.items[-1:].metadata.name}"')
print(run(f'kubectl -n aivo-prod logs {newest_ls} --tail=15 2>&1'))

ssh.close()
