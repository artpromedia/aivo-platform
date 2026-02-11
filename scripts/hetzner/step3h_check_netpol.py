"""
Check network policies that might be blocking DB access.
"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=15)

def run(cmd, timeout=15):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Check one network policy in detail
print("=== goal-svc network policy ===")
print(run("kubectl -n aivo-prod get networkpolicy goal-svc-network-policy -o yaml"))

print("\n=== auth-svc (no net policy listed — check if it has one) ===")
print(run("kubectl -n aivo-prod get networkpolicy auth-svc-network-policy -o yaml 2>&1 | head -5"))

# Compare: healthy services don't have network policies
# Check if there's an auth-svc policy
print("\n=== List ALL network policies ===")
print(run("kubectl -n aivo-prod get networkpolicies -o custom-columns='NAME:.metadata.name,SELECTOR:.spec.podSelector.matchLabels' --no-headers"))

ssh.close()
