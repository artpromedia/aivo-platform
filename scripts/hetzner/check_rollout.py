import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    return stdout.read().decode().strip()

# Check rollout status for all deployments
services = [
    'auth-svc', 'session-svc', 'content-svc', 'profile-svc', 
    'messaging-svc', 'goal-svc', 'life-skills-svc', 'baseline-svc',
    'assessment-svc', 'notify-svc', 'consent-svc', 'personalization-svc',
    'billing-svc', 'payments-svc', 'analytics-svc', 'focus-svc',
    'parent-svc', 'ai-orchestrator'
]

print("=== All pods (newest first) ===")
result = run('kubectl -n aivo-prod get pods -o wide --sort-by=.metadata.creationTimestamp')
print(result)

print("\n=== Pod readiness summary ===")
ready_count = 0
total = 0
for svc in services:
    pods = run(f'kubectl -n aivo-prod get pods -l app.kubernetes.io/name={svc} -o custom-columns="NAME:.metadata.name,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount,AGE:.metadata.creationTimestamp" --no-headers')
    for line in pods.split('\n'):
        if line.strip():
            total += 1
            if 'true' in line.split()[1] if len(line.split()) > 1 else '':
                ready_count += 1
    print(f"  {svc}: {pods}")

print(f"\nTotal: {ready_count}/{total} pods ready")

ssh.close()
