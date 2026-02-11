"""
Check DATABASE_URL for failing services and compare with PgBouncer auth config.
"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

# Check K8s secrets on app1
print("Connecting to app1...")
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=15)

def run_app(cmd, timeout=15):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

failing = ['goal-svc', 'notify-svc', 'profile-svc', 'payments-svc', 'assessment-svc',
           'personalization-svc']

print("=== DATABASE_URL from secrets ===")
for svc in failing:
    secret_name = f"{svc}-secrets"
    result = run_app(f"kubectl -n aivo-prod get secret {secret_name} -o jsonpath='{{.data.database-url}}' 2>&1 | base64 -d 2>/dev/null")
    if result:
        # Mask the password
        import re
        masked = re.sub(r'://([^:]+):([^@]+)@', r'://\1:***@', result)
        print(f"  {svc}: {masked}")
    else:
        result_raw = run_app(f"kubectl -n aivo-prod get secret {secret_name} -o jsonpath='{{.data.database-url}}' 2>&1")
        print(f"  {svc}: RAW={result_raw[:80]}")

# Also check the healthy services to compare
print("\n=== DATABASE_URL from healthy services ===")
for svc in ['auth-svc', 'billing-svc', 'session-svc']:
    secret_name = f"{svc}-secrets"
    result = run_app(f"kubectl -n aivo-prod get secret {secret_name} -o jsonpath='{{.data.database-url}}' 2>&1 | base64 -d 2>/dev/null")
    if result:
        import re
        masked = re.sub(r'://([^:]+):([^@]+)@', r'://\1:***@', result)
        print(f"  {svc}: {masked}")

ssh.close()

# Now check PgBouncer auth file on db1
print("\nConnecting to db1...")
ssh2 = paramiko.SSHClient()
ssh2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh2.connect('95.217.76.42', username='root', password='Ebmx9V_r?a38NM', timeout=15)

def run_db(cmd, timeout=15):
    stdin, stdout, stderr = ssh2.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

print("\n=== PgBouncer userlist.txt ===")
print(run_db("cat /etc/pgbouncer/userlist.txt"))

print("\n=== PostgreSQL users ===")
print(run_db("sudo -u postgres psql -c \"SELECT usename FROM pg_user ORDER BY usename;\""))

# Test connection with aivo_app user
print("\n=== Test with aivo_app user ===")
print(run_db("PGPASSWORD='Sh74VCfR40tiFd^d5P5spAneUiK&vzpp' psql -h 127.0.0.1 -p 6432 -U aivo_app -d aivo_goals -c 'SELECT 1' 2>&1"))

# Test with aivo user
print("\n=== Test with aivo user ===")
print(run_db("PGPASSWORD='Sh74VCfR40tiFd^d5P5spAneUiK&vzpp' psql -h 127.0.0.1 -p 6432 -U aivo -d aivo_goals -c 'SELECT 1' 2>&1"))

ssh2.close()
