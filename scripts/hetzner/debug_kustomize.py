import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Try applying with kustomize and see the full output
result = run('kubectl apply -k /root/aivo-k8s/base 2>&1')
# Look for any errors related to deployments
lines = result.split('\n')
for line in lines:
    if 'deployment' in line.lower() or 'error' in line.lower() or 'invalid' in line.lower():
        print(line)

print("\n--- Try just rendering kustomize to see output ---")
result = run('kubectl kustomize /root/aivo-k8s/base 2>&1 | grep -A5 "readinessProbe" | head -30')
print(result)

ssh.close()
