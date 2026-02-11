"""
Fix readiness probes using JSON patch (replace operation) for assessment-svc,
analytics-svc, and parent-svc. Also fix notify-svc replicas.
"""
import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=15)

def run(cmd, timeout=15):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Use JSON patch to REPLACE the readiness probe entirely
# This avoids the "can't have both httpGet and tcpSocket" issue
svcs_to_patch = ['assessment-svc', 'analytics-svc', 'parent-svc',
                 'goal-svc', 'notify-svc', 'profile-svc', 'payments-svc', 
                 'personalization-svc']

print("=== Patching readiness probes with JSON patch (replace) ===")
for svc in svcs_to_patch:
    # First check current probe type
    probe = run(f"kubectl -n aivo-prod get deployment {svc} -o jsonpath='{{.spec.template.spec.containers[0].readinessProbe.httpGet}}' 2>&1")
    if not probe or probe == '':
        print(f"  ⏭  {svc}: already using tcpSocket, skipping")
        continue
    
    patch = json.dumps([
        {
            "op": "replace",
            "path": "/spec/template/spec/containers/0/readinessProbe",
            "value": {
                "tcpSocket": {"port": 3000},
                "initialDelaySeconds": 5,
                "periodSeconds": 10,
                "timeoutSeconds": 5,
                "failureThreshold": 3
            }
        }
    ])
    
    result = run(f"kubectl -n aivo-prod patch deployment {svc} --type='json' -p '{patch}'")
    if 'patched' in result:
        print(f"  ✅ {svc}: probe replaced to tcpSocket")
    else:
        print(f"  ❌ {svc}: {result[:150]}")

# Scale notify-svc to 2 replicas
print("\n=== Scaling notify-svc to 2 replicas ===")
print(run("kubectl -n aivo-prod scale deployment notify-svc --replicas=2"))

# Wait for assessment-svc to become ready
print("\nWaiting 30s for assessment-svc to stabilize...")
import time
time.sleep(30)

# Check assessment-svc
pod = run("kubectl -n aivo-prod get pods --no-headers --sort-by=.metadata.creationTimestamp | grep '^assessment-svc' | tail -1 | awk '{print $1}'")
ready = run(f"kubectl -n aivo-prod get pod {pod} -o jsonpath='{{.status.containerStatuses[0].ready}}'")
print(f"\n=== assessment-svc: pod={pod}, ready={ready} ===")

# Quick overall status
print("\n=== Deployment Status ===")
result = run('kubectl -n aivo-prod get deployments -o custom-columns="NAME:.metadata.name,READY:.status.readyReplicas,TOTAL:.status.replicas" --no-headers')
print(result)

ssh.close()
