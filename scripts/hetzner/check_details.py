#!/usr/bin/env python3
"""Get detailed status of services that show errorCode: undefined."""
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

# Check services with "errorCode: undefined"  
services_to_check = ['content-svc', 'goal-svc', 'life-skills-svc', 'profile-svc', 'messaging-svc', 'baseline-svc']

for svc in services_to_check:
    pod = ssh_exec(client, f"kubectl get pods -n aivo-prod -l app.kubernetes.io/name={svc} --sort-by=.metadata.creationTimestamp --no-headers -o custom-columns='NAME:.metadata.name' 2>/dev/null | tail -1")
    log = ssh_exec(client, f"kubectl logs -n aivo-prod {pod} --tail=30 2>&1")
    print(f"\n=== {svc} ({pod}) ===")
    print(log[:600])

# Also check focus-svc
print("\n\n=== focus-svc (full error) ===")
pod = ssh_exec(client, f"kubectl get pods -n aivo-prod -l app.kubernetes.io/name=focus-svc --sort-by=.metadata.creationTimestamp --no-headers -o custom-columns='NAME:.metadata.name' 2>/dev/null | tail -1")
log = ssh_exec(client, f"kubectl logs -n aivo-prod {pod} --tail=20 2>&1")
print(log[:600])

# Check billing-svc detail
print("\n\n=== billing-svc (full error) ===")
pod = ssh_exec(client, f"kubectl get pods -n aivo-prod -l app.kubernetes.io/name=billing-svc --sort-by=.metadata.creationTimestamp --no-headers -o custom-columns='NAME:.metadata.name' 2>/dev/null | tail -1")
log = ssh_exec(client, f"kubectl logs -n aivo-prod {pod} --tail=20 2>&1")
print(log[:600])

# Check payments-svc detail
print("\n\n=== payments-svc (full error) ===")
pod = ssh_exec(client, f"kubectl get pods -n aivo-prod -l app.kubernetes.io/name=payments-svc --sort-by=.metadata.creationTimestamp --no-headers -o custom-columns='NAME:.metadata.name' 2>/dev/null | tail -1")
log = ssh_exec(client, f"kubectl logs -n aivo-prod {pod} --tail=20 2>&1")
print(log[:800])

client.close()
