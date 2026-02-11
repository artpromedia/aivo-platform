#!/usr/bin/env python3
"""Get detailed crash logs from each failing service."""
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

# Get one crashing pod per service and full logs
services = ['analytics-svc','assessment-svc','auth-svc','baseline-svc','billing-svc',
            'consent-svc','content-svc','focus-svc','goal-svc','life-skills-svc',
            'messaging-svc','notify-svc','parent-svc','payments-svc',
            'personalization-svc','profile-svc']

for svc in services:
    # Get pod name
    pod = ssh_exec(client, f"kubectl get pods -n aivo-prod -l app.kubernetes.io/name={svc} --no-headers -o custom-columns='NAME:.metadata.name' 2>/dev/null | head -1")
    if not pod or 'No resources' in pod:
        print(f"\n=== {svc}: NO POD FOUND ===")
        continue
    # Get full logs (last 20 lines)
    log = ssh_exec(client, f"kubectl logs -n aivo-prod {pod} --tail=20 2>&1")
    print(f"\n=== {svc} ({pod}) ===")
    print(log[:500])

client.close()
