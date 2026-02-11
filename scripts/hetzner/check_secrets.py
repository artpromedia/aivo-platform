#!/usr/bin/env python3
"""Check all K8s secrets and their keys in aivo-prod namespace."""
import paramiko, time

def ssh_exec(client, cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    return stdout.read().decode().strip()

def connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    for attempt in range(3):
        try:
            client.connect("95.216.245.40", username="root", password="2R2ht?gALF7%L%", timeout=15)
            return client
        except:
            if attempt < 2:
                time.sleep(3)
    raise Exception("Failed to connect")

client = connect()

# List all secrets and their keys
print("=== ALL SECRETS IN aivo-prod ===")
result = ssh_exec(client, """
kubectl get secrets -n aivo-prod -o custom-columns='NAME:.metadata.name,KEYS:.data' --no-headers 2>/dev/null | head -50
""")
print(result)

print("\n=== SECRET KEYS DETAIL ===")
secrets = ["shared-secrets", "auth-svc-secrets", "billing-svc-secrets", "consent-svc-secrets", 
           "content-svc-secrets", "profile-svc-secrets", "notify-svc-secrets", "messaging-svc-secrets",
           "analytics-svc-secrets", "assessment-svc-secrets", "personalization-svc-secrets",
           "life-skills-svc-secrets", "goal-svc-secrets", "focus-svc-secrets", "payments-svc-secrets",
           "parent-svc-secrets", "baseline-svc-secrets", "ai-orchestrator-secrets"]
for secret in secrets:
    keys = ssh_exec(client, f"kubectl get secret {secret} -n aivo-prod -o jsonpath='{{.data}}' 2>/dev/null | python3 -c \"import sys,json; d=json.load(sys.stdin); print(','.join(sorted(d.keys())))\" 2>/dev/null || echo 'NOT FOUND'")
    print(f"  {secret}: {keys}")

# Also check configmaps
print("\n=== CONFIGMAPS ===")
for svc in ["auth-svc", "billing-svc", "consent-svc", "content-svc", "profile-svc", "notify-svc", 
            "messaging-svc", "analytics-svc", "assessment-svc", "personalization-svc", "life-skills-svc",
            "goal-svc", "focus-svc", "payments-svc", "parent-svc", "baseline-svc", "ai-orchestrator", "session-svc"]:
    keys = ssh_exec(client, f"kubectl get configmap {svc}-config -n aivo-prod -o jsonpath='{{.data}}' 2>/dev/null | python3 -c \"import sys,json; d=json.load(sys.stdin); print(json.dumps(d))\" 2>/dev/null || echo 'NOT FOUND'")
    print(f"  {svc}-config: {keys}")

# Get the JWT public key from app1
print("\n=== JWT PUBLIC KEY ===")
jwt_pub = ssh_exec(client, "cat /tmp/jwt-public.pem 2>/dev/null || echo 'NOT FOUND'")
print(jwt_pub[:200] if jwt_pub else "NOT FOUND")

client.close()
