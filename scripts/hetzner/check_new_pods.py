import paramiko, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode().strip()
    return out

print("Waiting 90s for new pods to stabilize...")
time.sleep(90)

# Get all services and their newest pods
services = [
    'auth-svc', 'session-svc', 'ai-orchestrator',
    'content-svc', 'profile-svc', 'messaging-svc', 'goal-svc', 'life-skills-svc', 'baseline-svc',
    'assessment-svc', 'notify-svc',
    'consent-svc', 'personalization-svc',
    'focus-svc', 'parent-svc',
    'billing-svc', 'payments-svc',
    'analytics-svc',
]

# Get pod status
pods = run('kubectl -n aivo-prod get pods --sort-by=.metadata.creationTimestamp -o wide 2>&1')
print("=== ALL PODS ===")
print(pods)
print()

# Check errors from newest pods of each failing service
print("=== NEWEST POD LOGS (last 10 lines) ===")
for svc in services:
    # Get newest pod name
    newest = run(f'kubectl -n aivo-prod get pods -l app.kubernetes.io/name={svc} --sort-by=.metadata.creationTimestamp -o jsonpath="{{.items[-1:].metadata.name}}"')
    if not newest:
        print(f"\n{svc}: NO PODS")
        continue
    status = run(f'kubectl -n aivo-prod get pod {newest} -o jsonpath="{{.status.containerStatuses[0].ready}} restarts={{.status.containerStatuses[0].restartCount}}"')
    logs = run(f'kubectl -n aivo-prod logs {newest} --tail=5 2>&1')
    ready_str = "✅" if "true" in status else "❌"
    print(f"\n{ready_str} {svc} ({newest}): {status}")
    if "false" in status:
        print(f"  LOGS: {logs[:300]}")

ssh.close()
