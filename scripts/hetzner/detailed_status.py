import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

# Check each service directly with fuller error output
services = [
    'auth-svc', 'session-svc', 'content-svc', 'profile-svc', 
    'messaging-svc', 'goal-svc', 'baseline-svc', 'assessment-svc',
    'notify-svc', 'consent-svc', 'personalization-svc', 'billing-svc',
    'payments-svc', 'focus-svc', 'parent-svc', 'analytics-svc'
]

for svc in services:
    out, err = run(f'kubectl -n aivo-prod get pods -l app.kubernetes.io/name={svc} -o jsonpath="{{.items[0].metadata.name}}"')
    pod = out if out else ''
    if not pod:
        print(f"\n{svc}: NO POD")
        continue
    
    # Get last 5 lines of logs
    out, err = run(f'kubectl -n aivo-prod logs {pod} --tail=5 2>&1')
    logs = out if out else err
    last_line = logs.split('\n')[-1] if logs else ''
    
    # Get pod phase
    out, _ = run(f'kubectl -n aivo-prod get pod {pod} -o jsonpath="{{.status.phase}}"')
    phase = out
    
    # Get restarts and ready
    out, _ = run(f'kubectl -n aivo-prod get pod {pod} -o jsonpath="{{.status.containerStatuses[0].restartCount}}"')
    restarts = out
    out, _ = run(f'kubectl -n aivo-prod get pod {pod} -o jsonpath="{{.status.containerStatuses[0].ready}}"')
    ready = out
    
    # Get last state if crashed
    out, _ = run(f'kubectl -n aivo-prod get pod {pod} -o jsonpath="{{.status.containerStatuses[0].lastState.terminated.reason}}"')
    last_reason = out if out else ''
    
    print(f"\n{svc}: phase={phase} ready={ready} restarts={restarts} lastReason={last_reason}")
    print(f"  last log: {last_line[:150]}")

ssh.close()
