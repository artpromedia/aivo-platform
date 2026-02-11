import paramiko, base64, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    return stdout.read().decode().strip()

# 1. Add SECURITY_TOKEN_SECRET to assessment-svc-secrets
print("=== Adding SECURITY_TOKEN_SECRET to assessment-svc ===")
import secrets
token_secret = secrets.token_hex(32)  # 64-char hex string
patch = json.dumps({"data": {
    "security-token-secret": base64.b64encode(token_secret.encode()).decode()
}})
print(run(f"kubectl -n aivo-prod patch secret assessment-svc-secrets --type merge -p '{patch}'"))

# 2. Add DATABASE_URL to focus-svc-secrets
print("\n=== Adding DATABASE_URL to focus-svc-secrets ===")
db_password = 'Sh74VCfR40tiFd^d5P5spAneUiK&vzpp'
focus_db_url = f'postgresql://aivo_app:{db_password}@10.0.0.1:6432/aivo_focus?schema=public'
patch2 = json.dumps({"data": {
    "database-url": base64.b64encode(focus_db_url.encode()).decode()
}})
print(run(f"kubectl -n aivo-prod patch secret focus-svc-secrets --type merge -p '{patch2}'"))

# 3. Check auth-svc health endpoint config
print("\n=== auth-svc health route ===")
# Auth-svc uses NestJS - check what routes it has
newest = run('kubectl -n aivo-prod get pods -l app.kubernetes.io/name=auth-svc -o jsonpath="{.items[0].metadata.name}"')
print(f"Pod: {newest}")
# Try different health routes
for path in ['/health', '/ready', '/api/health', '/api/v1/health', '/']:
    result = run(f'kubectl -n aivo-prod exec {newest} -- wget -qO- http://localhost:3000{path} 2>&1')
    print(f"  {path}: {result[:100]}")

ssh.close()
