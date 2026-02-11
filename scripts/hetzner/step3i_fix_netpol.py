"""
Fix NetworkPolicies to allow egress to PgBouncer (10.0.0.1:6432) and Redis (10.0.0.1:6379).
"""
import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=15)

def run(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# All services that have network policies
netpol_services = [
    'ai-orchestrator', 'analytics-svc', 'assessment-svc', 'baseline-svc',
    'consent-svc', 'content-svc', 'focus-svc', 'goal-svc', 'messaging-svc',
    'notify-svc', 'parent-svc', 'payments-svc', 'personalization-svc',
    'profile-svc', 'session-svc'
]

print("=== Patching NetworkPolicies to allow DB and Redis egress ===\n")

for svc in netpol_services:
    np_name = f"{svc}-network-policy"
    
    # Use JSON patch to add egress rules for database (10.0.0.1:6432) and Redis (10.0.0.1:6379)
    # Add two new egress rules
    patch = json.dumps([
        {
            "op": "add",
            "path": "/spec/egress/-",
            "value": {
                "to": [{"ipBlock": {"cidr": "10.0.0.1/32"}}],
                "ports": [
                    {"port": 6432, "protocol": "TCP"},
                    {"port": 5432, "protocol": "TCP"},
                    {"port": 6379, "protocol": "TCP"}
                ]
            }
        }
    ])
    
    result = run(f"kubectl -n aivo-prod patch networkpolicy {np_name} --type='json' -p '{patch}'")
    if 'patched' in result:
        print(f"  ✅ {np_name}: patched")
    else:
        print(f"  ❌ {np_name}: {result[:120]}")

# Also add MinIO egress (10.0.0.3:9000) and NATS (if needed)
print("\n=== Adding MinIO (10.0.0.3:9000) egress ===")
for svc in netpol_services:
    np_name = f"{svc}-network-policy"
    patch = json.dumps([
        {
            "op": "add",
            "path": "/spec/egress/-",
            "value": {
                "to": [{"ipBlock": {"cidr": "10.0.0.3/32"}}],
                "ports": [
                    {"port": 9000, "protocol": "TCP"}
                ]
            }
        }
    ])
    result = run(f"kubectl -n aivo-prod patch networkpolicy {np_name} --type='json' -p '{patch}'")
    if 'patched' in result:
        print(f"  ✅ {np_name}")
    else:
        print(f"  ❌ {np_name}: {result[:120]}")

# Verify the patch
print("\n=== Verify goal-svc egress rules ===")
result = run("kubectl -n aivo-prod get networkpolicy goal-svc-network-policy -o jsonpath='{.spec.egress}' | python3 -m json.tool")
print(result)

# Now restart the failing services
print("\n=== Restarting failing deployments ===")
failing = ['goal-svc', 'notify-svc', 'profile-svc', 'payments-svc', 
           'personalization-svc', 'assessment-svc']
for svc in failing:
    result = run(f"kubectl -n aivo-prod rollout restart deployment/{svc}")
    print(f"  {result}")

ssh.close()
