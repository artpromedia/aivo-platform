import paramiko, base64, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    return stdout.read().decode().strip()

# Get all service secrets and extract database names
services_with_db = [
    'content-svc', 'profile-svc', 'messaging-svc', 'goal-svc',
    'life-skills-svc', 'baseline-svc', 'focus-svc',
    'assessment-svc', 'notify-svc', 'parent-svc',
    'consent-svc', 'personalization-svc',
    'billing-svc', 'payments-svc',
    'analytics-svc',
]

print("=== DATABASE URLs in secrets ===")
for svc in services_with_db:
    secret_name = f"{svc}-secrets"
    data = run(f'kubectl -n aivo-prod get secret {secret_name} -o jsonpath="{{.data.database-url}}" 2>/dev/null')
    if data:
        url = base64.b64decode(data).decode()
        # Extract DB name from URL
        db_name = url.split('/')[-1].split('?')[0]
        print(f"  {svc}: db={db_name}")
    else:
        print(f"  {svc}: NO database-url in {secret_name}")

# Check shared-secrets for auth-svc and session-svc
for extra in ['auth-svc', 'session-svc']:
    secret_name = f"{extra}-secrets"
    data = run(f'kubectl -n aivo-prod get secret {secret_name} -o jsonpath="{{.data.database-url}}" 2>/dev/null')
    if data:
        url = base64.b64decode(data).decode()
        db_name = url.split('/')[-1].split('?')[0]
        print(f"  {extra}: db={db_name}")
    else:
        print(f"  {extra}: NO database-url")

# List available databases
print("\n=== Available PostgreSQL databases ===")
ssh2 = paramiko.SSHClient()
ssh2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh2.connect('95.217.76.42', username='root', password='Ebmx9V_r?a38NM', timeout=10)
stdin, stdout, stderr = ssh2.exec_command("sudo -u postgres psql -l 2>&1 | grep aivo | awk '{print $1}'", timeout=15)
dbs = [line.strip() for line in stdout.read().decode().strip().split('\n') if line.strip()]
for db in dbs:
    print(f"  {db}")
ssh2.close()

ssh.close()
