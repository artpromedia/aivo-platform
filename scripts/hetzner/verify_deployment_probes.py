import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    return stdout.read().decode().strip()

# Check deployment spec for readiness probe
for svc in ['session-svc', 'content-svc', 'consent-svc', 'focus-svc', 'baseline-svc', 'auth-svc']:
    rp = run(f'kubectl -n aivo-prod get deployment {svc} -o jsonpath="{{.spec.template.spec.containers[0].readinessProbe}}"')
    has_tcp = 'tcpSocket' in rp
    print(f"{svc}: {'✅ tcpSocket' if has_tcp else '❌ httpGet'} → {rp[:100]}")

# Also check newest pod for session-svc
pod = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=session-svc --sort-by=.metadata.creationTimestamp -o jsonpath="{.items[-1].metadata.name}"')
rp_pod = run(f'kubectl -n aivo-prod get pod {pod} -o jsonpath="{{.spec.containers[0].readinessProbe}}"')
print(f"\nNewest session-svc pod ({pod}): {rp_pod[:100]}")

# Check all pods per deployment
print("\n=== Pod counts ===")
for svc in ['auth-svc', 'session-svc', 'content-svc', 'consent-svc', 'focus-svc']:
    count = run(f'kubectl -n aivo-prod get pods -l app.kubernetes.io/name={svc} --no-headers | wc -l')
    ready_count = run(f'kubectl -n aivo-prod get pods -l app.kubernetes.io/name={svc} --no-headers | grep -c "1/1"')
    print(f"  {svc}: {count} total, {ready_count} ready")

ssh.close()
