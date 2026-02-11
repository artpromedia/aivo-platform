"""
Apply manifests using kustomize (which overrides namespace to aivo-prod)
and restart all deployments.
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
    sftp.put(f, f'{remote_dir}/{fname}')
print("All manifests uploaded.")

# Apply using kustomize (which sets namespace: aivo-prod)
print("\n=== Applying with kustomize ===")
result = run(f'kubectl apply -k {remote_dir}')
print(result[:3000])

# Rolling restart all 18 deployments
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
    status = '✅' if 'restarted' in result else '❌'
    print(f"  {status} {svc}: {result}")

sftp.close()
ssh.close()
print("\nDone! Wait 30-60s for pods to roll out.")
