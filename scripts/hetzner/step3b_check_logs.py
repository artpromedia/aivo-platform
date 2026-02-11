"""
Step 3b: Fix probes with JSON patch (replace, not merge) and check logs.
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

# First, check logs of the failing services
failing = ['goal-svc', 'notify-svc', 'profile-svc', 'payments-svc', 
           'personalization-svc', 'analytics-svc', 'assessment-svc', 'parent-svc']

print("=== Checking logs of failing services ===\n")
for svc in failing:
    # Get any pod for this service
    pod = run(f"kubectl -n aivo-prod get pods -l app={svc} --sort-by=.metadata.creationTimestamp -o jsonpath='{{.items[-1].metadata.name}}'")
    if pod:
        logs = run(f"kubectl -n aivo-prod logs {pod} --tail=15 2>&1")
        print(f"--- {svc} ({pod}) ---")
        print(logs)
        print()

ssh.close()
