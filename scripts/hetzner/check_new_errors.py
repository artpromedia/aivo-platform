#!/usr/bin/env python3
"""Get crash logs from newly restarted pods."""
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

# Get pods that are not ready
services = ['analytics-svc','assessment-svc','baseline-svc','billing-svc',
            'consent-svc','content-svc','focus-svc','goal-svc','life-skills-svc',
            'messaging-svc','notify-svc','parent-svc','payments-svc',
            'personalization-svc','profile-svc']

for svc in services:
    # Get newest pod (lowest restart count)
    pod = ssh_exec(client, f"kubectl get pods -n aivo-prod -l app.kubernetes.io/name={svc} --sort-by=.metadata.creationTimestamp --no-headers -o custom-columns='NAME:.metadata.name' 2>/dev/null | tail -1")
    if not pod:
        print(f"\n=== {svc}: NO POD ===")
        continue
    log = ssh_exec(client, f"kubectl logs -n aivo-prod {pod} --tail=15 2>&1")
    # Extract key error
    err_lines = []
    for l in log.split('\n'):
        ll = l.lower()
        if any(k in ll for k in ['error', 'cannot', 'missing', 'not provided', 'not found', 'required', 'throw', 'no such', 'critical']):
            err_lines.append(l.strip())
    err = err_lines[0] if err_lines else log.split('\n')[-1].strip() if log else "no output"
    print(f"{svc}: {err[:250]}")

client.close()
