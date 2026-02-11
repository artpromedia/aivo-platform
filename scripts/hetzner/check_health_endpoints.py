"""
Comprehensive fix: Check each service's actual health endpoint behavior
and audit which services need probe adjustments.

Key insight: Many services have auth middleware that blocks /health and /ready,
causing 401 responses. We need to find paths that bypass auth or switch to TCP probes.
"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

services = [
    'auth-svc', 'session-svc', 'content-svc', 'profile-svc', 'messaging-svc',
    'goal-svc', 'life-skills-svc', 'baseline-svc', 'assessment-svc', 'notify-svc',
    'consent-svc', 'personalization-svc', 'billing-svc', 'payments-svc',
    'analytics-svc', 'focus-svc', 'parent-svc', 'ai-orchestrator'
]

print("=== Health Endpoint Check ===")
for svc in services:
    pod = run(f'kubectl -n aivo-prod get pods -l app.kubernetes.io/name={svc} -o jsonpath="{{.items[0].metadata.name}}" 2>/dev/null')
    if not pod or 'No resources' in pod:
        print(f"{svc}: NO POD")
        continue
    
    # Check pod status
    status = run(f'kubectl -n aivo-prod get pod {pod} -o jsonpath="{{.status.phase}}"')
    ready = run(f'kubectl -n aivo-prod get pod {pod} -o jsonpath="{{.status.containerStatuses[0].ready}}"')
    restarts = run(f'kubectl -n aivo-prod get pod {pod} -o jsonpath="{{.status.containerStatuses[0].restartCount}}"')
    
    if status != 'Running':
        print(f"{svc}: {status} (restarts: {restarts})")
        continue
    
    # Test health endpoints
    results = {}
    for path in ['/health', '/ready', '/health/live', '/health/ready']:
        code = run(f'kubectl -n aivo-prod exec {pod} -- wget -q -O /dev/null -S http://localhost:3000{path} 2>&1 | grep "HTTP/" | tail -1 | awk "{{print \\$2}}"')
        if not code:
            code = run(f'kubectl -n aivo-prod exec {pod} -- wget -q -O /dev/null http://localhost:3000{path} 2>&1')
            if 'Connection refused' in code:
                code = 'CONN_REFUSED'
            elif 'error' in code.lower():
                code = 'ERROR'
            else:
                code = 'UNKNOWN'
        results[path] = code
    
    health_str = ' '.join([f"{p}={results[p]}" for p in results])
    print(f"{svc}: ready={ready} restarts={restarts} | {health_str}")

ssh.close()
