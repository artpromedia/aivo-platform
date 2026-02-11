"""
Apply updated manifests and restart all deployments.
"""
import paramiko, os, glob

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

sftp = ssh.open_sftp()

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Upload all base manifests
base_dir = r'c:\Users\ofema\aivo\infra\k8s\base'
remote_dir = '/root/aivo-k8s/base'

run(f'mkdir -p {remote_dir}')

for f in glob.glob(os.path.join(base_dir, '*.yaml')):
    fname = os.path.basename(f)
    print(f"Uploading {fname}...")
    sftp.put(f, f'{remote_dir}/{fname}')

# Upload kustomization if exists
kust_file = os.path.join(base_dir, 'kustomization.yaml')
if os.path.exists(kust_file):
    sftp.put(kust_file, f'{remote_dir}/kustomization.yaml')
    print("Uploaded kustomization.yaml")

# Apply manifests
print("\n=== Applying manifests ===")
# Apply each yaml file directly
for f in glob.glob(os.path.join(base_dir, '*.yaml')):
    fname = os.path.basename(f)
    if fname == 'kustomization.yaml':
        continue
    result = run(f'kubectl apply -f {remote_dir}/{fname} -n aivo-prod 2>&1')
    if 'error' in result.lower() or 'invalid' in result.lower():
        print(f"  ❌ {fname}: {result[:100]}")
    else:
        print(f"  ✅ {fname}")

# Rolling restart all deployments
print("\n=== Rolling restart all deployments ===")
services = [
    'auth-svc', 'session-svc', 'content-svc', 'profile-svc', 
    'messaging-svc', 'goal-svc', 'life-skills-svc', 'baseline-svc',
    'assessment-svc', 'notify-svc', 'consent-svc', 'personalization-svc',
    'billing-svc', 'payments-svc', 'analytics-svc', 'focus-svc',
    'parent-svc', 'ai-orchestrator'
]

for svc in services:
    result = run(f'kubectl -n aivo-prod rollout restart deployment/{svc}')
    print(f"  {svc}: {result}")

sftp.close()
ssh.close()
print("\nDone! Wait 30-60s for pods to restart.")
