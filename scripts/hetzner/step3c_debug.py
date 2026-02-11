"""
Step 3c: Check actual pod labels, get logs, fix probes with JSON patch.
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

# Check actual labels on pods
print("=== Pod labels for failing services ===")
failing = ['goal-svc', 'notify-svc', 'profile-svc', 'payments-svc', 
           'personalization-svc', 'analytics-svc', 'assessment-svc', 'parent-svc']

# First get ALL pods and their labels
result = run("kubectl -n aivo-prod get pods -o custom-columns='NAME:.metadata.name,LABELS:.metadata.labels' --no-headers | head -40")
print(result)

print("\n=== Getting logs from each failing service ===\n")
for svc in failing:
    # Find pod by name prefix
    pod = run(f"kubectl -n aivo-prod get pods --no-headers | grep '^{svc}' | head -1 | awk '{{print $1}}'")
    if pod and not pod.startswith('error'):
        logs = run(f"kubectl -n aivo-prod logs {pod} --tail=20 2>&1")
        print(f"--- {svc} ({pod}) ---")
        print(logs)
        print()
    else:
        print(f"--- {svc}: NO PODS FOUND ---\n")

ssh.close()
