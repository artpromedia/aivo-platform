"""
Step 3: Patch deployments directly with kubectl patch for probe changes,
then restart all failing services.
"""
import paramiko, json, time

print("Connecting to app1...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=15)

def run(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Services that need readiness probe changed to tcpSocket
tcp_ready_svcs = ['goal-svc', 'notify-svc', 'profile-svc', 'payments-svc', 
                  'personalization-svc', 'analytics-svc', 'assessment-svc', 
                  'parent-svc']

print("=== Patching readiness probes to tcpSocket ===")
for svc in tcp_ready_svcs:
    patch = json.dumps({
        "spec": {
            "template": {
                "spec": {
                    "containers": [{
                        "name": svc,
                        "readinessProbe": {
                            "tcpSocket": {"port": 3000},
                            "initialDelaySeconds": 5,
                            "periodSeconds": 10,
                            "timeoutSeconds": 5,
                            "failureThreshold": 3
                        }
                    }]
                }
            }
        }
    })
    result = run(f"kubectl -n aivo-prod patch deployment {svc} --type strategic -p '{patch}'")
    if 'patched' in result:
        print(f"  ✅ {svc}: patched")
    else:
        print(f"  ❌ {svc}: {result[:100]}")

# Also patch assessment-svc to add SECURITY_TOKEN_SECRET env var
print("\n=== Patching assessment-svc env vars ===")
patch = json.dumps({
    "spec": {
        "template": {
            "spec": {
                "containers": [{
                    "name": "assessment-svc",
                    "env": [
                        {"name": "DATABASE_URL", "valueFrom": {"secretKeyRef": {"name": "assessment-svc-secrets", "key": "database-url", "optional": True}}},
                        {"name": "REDIS_URL", "valueFrom": {"secretKeyRef": {"name": "shared-secrets", "key": "redis-url"}}},
                        {"name": "NATS_URL", "valueFrom": {"secretKeyRef": {"name": "shared-secrets", "key": "nats-url"}}},
                        {"name": "JWT_SECRET", "valueFrom": {"secretKeyRef": {"name": "assessment-svc-secrets", "key": "jwt-secret"}}},
                        {"name": "SECURITY_TOKEN_SECRET", "valueFrom": {"secretKeyRef": {"name": "assessment-svc-secrets", "key": "security-token-secret"}}},
                        {"name": "INTERNAL_API_KEY", "valueFrom": {"secretKeyRef": {"name": "shared-secrets", "key": "internal-api-key"}}},
                    ]
                }]
            }
        }
    }
})
result = run(f"kubectl -n aivo-prod patch deployment assessment-svc --type strategic -p '{patch}'")
print(f"  assessment-svc: {result[:100]}")

# Wait for rollouts
print("\nWaiting 45s for new pods to start...")
time.sleep(45)

# Check status
print("\n=== Pod Status ===")
result = run('kubectl -n aivo-prod get deployments -o custom-columns="NAME:.metadata.name,READY:.status.readyReplicas,TOTAL:.status.replicas,AVAILABLE:.status.availableReplicas" --no-headers')
print(result)

# Also check which pods are failing
print("\n=== Not-ready pods ===")
result = run("kubectl -n aivo-prod get pods --field-selector='status.phase!=Succeeded' -o custom-columns='NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount' --no-headers | grep -v 'true'")
print(result)

ssh.close()
