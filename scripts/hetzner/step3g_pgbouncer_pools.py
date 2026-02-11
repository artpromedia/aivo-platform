"""
Check PgBouncer connection pool state and max connections.
Also test connectivity from K3s pod to 10.0.0.1:6432 with nc.
"""
import paramiko

# Check PgBouncer on db1
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.217.76.42', username='root', password='Ebmx9V_r?a38NM', timeout=15)

def run_db(cmd, timeout=15):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

print("=== PgBouncer SHOW POOLS ===")
print(run_db("PGPASSWORD='Sh74VCfR40tiFd^d5P5spAneUiK&vzpp' psql -h 127.0.0.1 -p 6432 -U aivo_app pgbouncer -c 'SHOW POOLS;' 2>&1"))

print("\n=== PgBouncer SHOW CLIENTS ===")
print(run_db("PGPASSWORD='Sh74VCfR40tiFd^d5P5spAneUiK&vzpp' psql -h 127.0.0.1 -p 6432 -U aivo_app pgbouncer -c 'SHOW CLIENTS;' 2>&1"))

print("\n=== PgBouncer SHOW STATS ===")
print(run_db("PGPASSWORD='Sh74VCfR40tiFd^d5P5spAneUiK&vzpp' psql -h 127.0.0.1 -p 6432 -U aivo_app pgbouncer -c 'SHOW STATS_TOTALS;' 2>&1"))

# Check UFW rules on db1
print("\n=== UFW status ===")
print(run_db("ufw status numbered | grep 6432"))

# Check if K3s pod IPs (10.42.x.x) can reach 10.0.0.1
# The 10.42.x.x IPs go through flannel on app1/app2, and need to reach db1's vSwitch 10.0.0.1
# Check if iptables on db1 allows traffic from 10.42.x.x
print("\n=== iptables INPUT rules on db1 ===")
print(run_db("iptables -L INPUT -n --line-numbers"))

# Check if there is a route for 10.42.x.x on db1
print("\n=== Routes on db1 ===")
print(run_db("ip route | grep -E '10\\.42|10\\.0'"))

ssh.close()

# Now check from app1 if pods can reach db1
ssh2 = paramiko.SSHClient()
ssh2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh2.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=15)

def run_app(cmd, timeout=15):
    stdin, stdout, stderr = ssh2.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Get a goal-svc pod IP
print("\n=== goal-svc pod IPs ===")
print(run_app("kubectl -n aivo-prod get pods -o custom-columns='NAME:.metadata.name,IP:.status.podIP' --no-headers | grep goal"))

# Test if app1 itself can reach 10.0.0.1:6432
print("\n=== app1 nc to 10.0.0.1:6432 ===")
print(run_app("timeout 3 bash -c 'echo > /dev/tcp/10.0.0.1/6432' 2>&1 && echo 'CONNECTED' || echo 'FAILED'"))

# Check K3s flannel/pod network routes on app1
print("\n=== Routes on app1 ===")
print(run_app("ip route | grep -E '10\\.42|10\\.0'"))

# Check if K3s has a NetworkPolicy blocking egress
print("\n=== Network policies ===")
print(run_app("kubectl -n aivo-prod get networkpolicies 2>&1"))

ssh2.close()
