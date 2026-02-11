"""Step 1: Apply manifests with kustomize and restart deployments."""
import paramiko, os, glob, time

print("Connecting to app1...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=15)

def run(cmd, timeout=60):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Upload manifests
print("Uploading manifests...")
sftp = ssh.open_sftp()
base_dir = r'c:\Users\ofema\aivo\infra\k8s\base'
remote_dir = '/root/aivo-k8s/base'
run(f'mkdir -p {remote_dir}')

for f in glob.glob(os.path.join(base_dir, '*.yaml')):
    sftp.put(f, f'{remote_dir}/{os.path.basename(f)}')
print("  Done")

# Apply with kustomize
print("\nApplying with kustomize...")
result = run(f'kubectl apply -k {remote_dir} 2>&1')
errors = [l for l in result.split('\n') if 'error' in l.lower()]
configured = result.count('configured')
unchanged = result.count('unchanged')
created = result.count('created')
print(f"  {configured} configured, {unchanged} unchanged, {created} created")
for e in errors:
    print(f"  ❌ {e}")

# Rolling restart
print("\nRolling restart all deployments...")
result = run('kubectl -n aivo-prod rollout restart deployment --all 2>&1')
lines = result.split('\n')
restarted = sum(1 for l in lines if 'restarted' in l)
print(f"  {restarted} deployments restarted")

# Quick status
print("\nWaiting 10s...")
time.sleep(10)
result = run('kubectl -n aivo-prod get deployments -o custom-columns="NAME:.metadata.name,READY:.status.readyReplicas,TOTAL:.status.replicas" --no-headers')
print(result)

sftp.close()
ssh.close()
