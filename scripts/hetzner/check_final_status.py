import paramiko, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    return stdout.read().decode().strip()

print("Waiting 120s for pods to fully start with new health probes...")
time.sleep(120)

services = [
    'auth-svc', 'session-svc', 'ai-orchestrator',
    'content-svc', 'profile-svc', 'messaging-svc', 'goal-svc', 
    'life-skills-svc', 'baseline-svc', 'focus-svc',
    'assessment-svc', 'notify-svc', 'parent-svc',
    'consent-svc', 'personalization-svc',
    'billing-svc', 'payments-svc',
    'analytics-svc',
]

ready_count = 0
not_ready = []

for svc in services:
    # Get newest pod
    newest = run(f'kubectl -n aivo-prod get pods -l app.kubernetes.io/name={svc} --sort-by=.metadata.creationTimestamp -o jsonpath="{{.items[-1:].metadata.name}}"')
    if not newest:
        print(f"❌ {svc}: NO PODS")
        not_ready.append(svc)
        continue
    
    status_json = run(f'kubectl -n aivo-prod get pod {newest} -o jsonpath="{{.status.containerStatuses[0].ready}} {{.status.containerStatuses[0].restartCount}} {{.status.phase}}"')
    parts = status_json.split()
    ready = parts[0] if len(parts) > 0 else "?"
    restarts = parts[1] if len(parts) > 1 else "?"
    
    if ready == "true":
        ready_count += 1
        print(f"✅ {svc} ({newest}): restarts={restarts}")
    else:
        not_ready.append(svc)
        # Get last 3 lines of log
        logs = run(f'kubectl -n aivo-prod logs {newest} --tail=3 2>&1')
        print(f"❌ {svc} ({newest}): restarts={restarts}")
        print(f"   {logs[:200]}")

print(f"\n{'='*60}")
print(f"Ready: {ready_count}/{len(services)}")
print(f"Not Ready: {', '.join(not_ready)}")

ssh.close()
