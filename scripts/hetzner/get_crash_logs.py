#!/usr/bin/env python3
"""Get current crash logs from all 16 failing services."""
import paramiko, time

def ssh_exec(client, cmd, timeout=60):
    for attempt in range(3):
        try:
            stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
            return stdout.read().decode().strip()
        except Exception as e:
            if attempt < 2:
                time.sleep(3)
            else:
                return f"ERROR: {e}"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("95.216.245.40", username="root", password="2R2ht?gALF7%L%", timeout=30)

# Check llm-provider-secrets
result = ssh_exec(client, "kubectl get secret llm-provider-secrets -n aivo-prod -o jsonpath='{.data}' 2>&1 | head -1")
print(f"llm-provider-secrets exists: {result[:100] if result else 'NO'}")

# Get last crash log line from each service
print("\n=== CURRENT CRASH ERRORS ===")
services = ['auth-svc','content-svc','billing-svc','consent-svc','notify-svc','profile-svc',
            'messaging-svc','assessment-svc','personalization-svc','analytics-svc',
            'focus-svc','goal-svc','life-skills-svc','payments-svc','parent-svc','baseline-svc']

for svc in services:
    log = ssh_exec(client, f"kubectl logs -n aivo-prod -l app={svc} --tail=3 -c {svc} 2>&1 | tail -5")
    # Find the error line
    error_line = ""
    for line in log.split('\n'):
        lowline = line.lower()
        if any(kw in lowline for kw in ['error', 'cannot', 'missing', 'not provided', 'not found', 'required', 'throw', 'no such']):
            error_line = line.strip()
            break
    if not error_line and log:
        error_line = log.split('\n')[-1].strip()
    print(f"  {svc}: {error_line[:200]}")

client.close()
