"""
Wait and check status after NetworkPolicy fix.
"""
import paramiko, time

print("Waiting 60s for pods to restart...")
time.sleep(60)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=15)

def run(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

print("=== Deployment Status ===")
result = run('kubectl -n aivo-prod get deployments -o custom-columns="NAME:.metadata.name,READY:.status.readyReplicas,TOTAL:.status.replicas,AVAIL:.status.availableReplicas,UP-TO-DATE:.status.updatedReplicas" --no-headers')
print(result)

print("\n=== Not-ready pods ===")
result = run("kubectl -n aivo-prod get pods --no-headers | grep -v 'Running.*1/1\|Completed' | grep -v 'acme'")
print(result if result else "All pods ready!")

# Check logs for any newly restarted but still failing pods
print("\n=== Check logs of still-failing services ===")
for svc in ['goal-svc', 'notify-svc', 'profile-svc', 'payments-svc', 'personalization-svc', 'assessment-svc']:
    # Get newest pod
    pod = run(f"kubectl -n aivo-prod get pods --no-headers --sort-by=.metadata.creationTimestamp | grep '^{svc}' | tail -1 | awk '{{print $1}}'")
    if pod:
        ready = run(f"kubectl -n aivo-prod get pod {pod} -o jsonpath='{{.status.containerStatuses[0].ready}}'")
        if ready != 'true':
            logs = run(f"kubectl -n aivo-prod logs {pod} --tail=10 2>&1")
            print(f"\n--- {svc} ({pod}) NOT READY ---")
            print(logs[:500])
        else:
            print(f"  ✅ {svc} ({pod}): READY")

ssh.close()
