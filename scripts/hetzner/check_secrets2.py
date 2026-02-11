#!/usr/bin/env python3
"""Check all K8s secrets and their keys in aivo-prod namespace."""
import paramiko, time

def ssh_exec(client, cmd, timeout=60):
    for attempt in range(3):
        try:
            stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
            return stdout.read().decode().strip()
        except Exception as e:
            if attempt < 2:
                print(f"  Retry {attempt+1}...")
                time.sleep(3)
            else:
                return f"ERROR: {e}"

def connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    for attempt in range(3):
        try:
            client.connect("95.216.245.40", username="root", password="2R2ht?gALF7%L%", timeout=30)
            return client
        except Exception as e:
            print(f"Connect attempt {attempt+1} failed: {e}")
            if attempt < 2:
                time.sleep(5)
    raise Exception("Failed to connect after 3 attempts")

client = connect()

# Simple test first
print("Testing connection...")
result = ssh_exec(client, "echo OK")
print(f"  Result: {result}")

# List secret names
print("\n=== SECRET NAMES ===")
result = ssh_exec(client, "kubectl get secrets -n aivo-prod --no-headers -o custom-columns='NAME:.metadata.name'")
print(result)

# Check keys for each important secret
print("\n=== SECRET KEYS ===")
secrets = ["shared-secrets", "auth-svc-secrets", "billing-svc-secrets", "consent-svc-secrets",
           "content-svc-secrets", "profile-svc-secrets", "notify-svc-secrets", "messaging-svc-secrets",
           "analytics-svc-secrets", "assessment-svc-secrets", "personalization-svc-secrets",
           "life-skills-svc-secrets", "goal-svc-secrets", "focus-svc-secrets", "payments-svc-secrets",
           "parent-svc-secrets", "baseline-svc-secrets", "ai-orchestrator-secrets"]
for secret in secrets:
    keys = ssh_exec(client, f"kubectl get secret {secret} -n aivo-prod -o go-template='{{{{range $k,$v := .data}}}}{{{{$k}}}} {{{{end}}}}' 2>/dev/null || echo 'NOT_FOUND'")
    print(f"  {secret}: [{keys}]")

# Get JWT public key
print("\n=== JWT PUBLIC KEY (first 3 lines) ===")
jwt = ssh_exec(client, "head -3 /tmp/jwt-public.pem 2>/dev/null || echo 'NOT FOUND'")
print(jwt)

# Check configmaps
print("\n=== CONFIGMAPS ===")
for svc in ["content-svc", "billing-svc", "consent-svc", "focus-svc", "payments-svc", "parent-svc", "baseline-svc"]:
    data = ssh_exec(client, f"kubectl get configmap {svc}-config -n aivo-prod -o go-template='{{{{range $k,$v := .data}}}}{{{{$k}}}}={{{{$v}}}} {{{{end}}}}' 2>/dev/null || echo 'NOT_FOUND'")
    print(f"  {svc}-config: [{data}]")

# Get current pod status
print("\n=== POD STATUS ===")
result = ssh_exec(client, "kubectl get pods -n aivo-prod --no-headers -o custom-columns='NAME:.metadata.name,STATUS:.status.phase,RESTARTS:.status.containerStatuses[0].restartCount,READY:.status.containerStatuses[0].ready' 2>/dev/null | grep -v Terminating")
print(result)

client.close()
print("\nDone.")
