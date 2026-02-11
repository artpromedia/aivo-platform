#!/usr/bin/env python3
"""Check PgBouncer config vs service DATABASE_URL secrets."""
import paramiko

SERVERS = {
    "app1": {"host": "95.216.245.40", "password": "2R2ht?gALF7%L%"},
    "db1":  {"host": "95.217.76.42",  "password": "Ebmx9V_r?a38NM"},
}

def ssh_exec(client, cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    return stdout.read().decode("utf-8", errors="replace"), stderr.read().decode("utf-8", errors="replace")

def connect(server):
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(SERVERS[server]["host"], username="root", password=SERVERS[server]["password"], timeout=10)
    return c

def main():
    # Check PgBouncer config
    db1 = connect("db1")
    print("=" * 70)
    print("PgBouncer databases section:")
    print("=" * 70)
    out, _ = ssh_exec(db1, "grep -A 100 '\\[databases\\]' /etc/pgbouncer/pgbouncer.ini | head -50")
    print(out)
    
    # Check PgBouncer status
    print("\n" + "=" * 70)
    print("PgBouncer pools:")
    print("=" * 70)
    out, _ = ssh_exec(db1, "sudo -u postgres psql -p 6432 -h 127.0.0.1 pgbouncer -c 'SHOW POOLS;' 2>&1 || echo 'Failed to connect to PgBouncer admin'")
    print(out)
    
    # Check PgBouncer is listening on 10.0.0.1
    out, _ = ssh_exec(db1, "ss -tlnp | grep 6432")
    print(f"\nPgBouncer listening: {out.strip()}")
    
    # Check PgBouncer status
    out, _ = ssh_exec(db1, "systemctl status pgbouncer --no-pager -l | head -20")
    print(f"\nPgBouncer status:\n{out}")
    
    db1.close()
    
    # Check DATABASE_URL secrets for failing services
    app1 = connect("app1")
    print("\n" + "=" * 70)
    print("DATABASE_URL from secrets for failing services:")
    print("=" * 70)
    
    failing_svcs = ["goal-svc", "notify-svc", "profile-svc", "payments-svc", "assessment-svc", "personalization-svc"]
    for svc in failing_svcs:
        out, _ = ssh_exec(app1, f"kubectl get secret -n aivo-prod {svc}-secrets -o jsonpath='{{.data.database-url}}' 2>/dev/null | base64 -d 2>/dev/null")
        if not out:
            out, _ = ssh_exec(app1, f"kubectl get secret -n aivo-prod {svc}-secrets -o jsonpath='{{.data.DATABASE_URL}}' 2>/dev/null | base64 -d 2>/dev/null")
        print(f"  {svc}: {out[:80] if out else 'NOT FOUND'}...")
    
    # Also check what DB names the working services use
    print("\n\nWorking services DATABASE_URL:")
    working_svcs = ["auth-svc", "billing-svc", "baseline-svc", "content-svc", "session-svc"]
    for svc in working_svcs:
        out, _ = ssh_exec(app1, f"kubectl get secret -n aivo-prod {svc}-secrets -o jsonpath='{{.data.database-url}}' 2>/dev/null | base64 -d 2>/dev/null")
        if not out:
            out, _ = ssh_exec(app1, f"kubectl get secret -n aivo-prod {svc}-secrets -o jsonpath='{{.data.DATABASE_URL}}' 2>/dev/null | base64 -d 2>/dev/null")
        print(f"  {svc}: {out[:80] if out else 'NOT FOUND'}...")
    
    app1.close()

if __name__ == "__main__":
    main()
