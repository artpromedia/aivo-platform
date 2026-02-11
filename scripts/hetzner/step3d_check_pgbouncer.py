"""
Check PgBouncer status and pool configs on db1.
"""
import paramiko

print("Connecting to db1 (10.0.0.1 via 95.217.76.42)...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.217.76.42', username='root', password='Ebmx9V_r?a38NM', timeout=15)

def run(cmd, timeout=15):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Check PgBouncer status
print("=== PgBouncer systemd status ===")
print(run("systemctl status pgbouncer | head -15"))

print("\n=== PgBouncer listening? ===")
print(run("ss -tlnp | grep 6432"))

print("\n=== PgBouncer config (pgbouncer.ini) ===")
print(run("cat /etc/pgbouncer/pgbouncer.ini"))

print("\n=== PgBouncer userlist.txt ===")
print(run("cat /etc/pgbouncer/userlist.txt"))

print("\n=== PgBouncer log (last 20 lines) ===")
print(run("journalctl -u pgbouncer --no-pager -n 20"))

# Check if PgBouncer binds to 10.0.0.1
print("\n=== PgBouncer listen address in config ===")
print(run("grep listen_addr /etc/pgbouncer/pgbouncer.ini"))

# Check if PgBouncer is accepting connections from pods (10.42.x.x)
print("\n=== Check iptables for 6432 ===")
print(run("iptables -L -n | grep 6432"))

# Try connecting from db1 itself
print("\n=== Test PgBouncer connection from localhost ===")
print(run("PGPASSWORD='Sh74VCfR40tiFd^d5P5spAneUiK&vzpp' psql -h 10.0.0.1 -p 6432 -U aivo -d aivo_goals -c 'SELECT 1' 2>&1"))

ssh.close()
