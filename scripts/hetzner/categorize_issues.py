import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    return stdout.read().decode().strip()

# Check newest pod from each not-ready service
problem_svcs = ['session-svc', 'content-svc', 'profile-svc', 'messaging-svc',
                'goal-svc', 'baseline-svc', 'assessment-svc', 'notify-svc',
                'consent-svc', 'personalization-svc', 'payments-svc', 
                'focus-svc', 'parent-svc', 'analytics-svc']

for svc in problem_svcs:
    # Get newest pod
    pod = run(f'kubectl -n aivo-prod get pods -l app.kubernetes.io/name={svc} --sort-by=.metadata.creationTimestamp -o jsonpath="{{.items[-1].metadata.name}}"')
    ready = run(f'kubectl -n aivo-prod get pod {pod} -o jsonpath="{{.status.containerStatuses[0].ready}}"')
    restarts = run(f'kubectl -n aivo-prod get pod {pod} -o jsonpath="{{.status.containerStatuses[0].restartCount}}"')
    
    # Get last 3 log lines
    logs = run(f'kubectl -n aivo-prod logs {pod} --tail=3 2>&1')
    last_line = logs.split('\n')[-1] if logs else ''
    
    # Try to extract key error/status
    if '503' in last_line:
        issue = '503_DB_NOT_MIGRATED'
    elif '401' in last_line:
        issue = '401_AUTH_BLOCKED'
    elif '404' in last_line:
        issue = '404_NO_ROUTE'
    elif 'Error' in last_line or 'error' in last_line:
        issue = 'ERROR'
    elif '200' in last_line:
        issue = 'HEALTHY_WAIT'
    else:
        issue = 'UNKNOWN'
    
    print(f"{svc}: ready={ready} restarts={restarts} issue={issue}")
    if issue in ['ERROR', 'UNKNOWN'] or restarts != '0':
        print(f"  → {last_line[:200]}")

ssh.close()
