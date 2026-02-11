#!/usr/bin/env python3
"""Check DATABASE_URL secrets and test PgBouncer connectivity."""
import paramiko

SERVERS = {
    "app1": {"host": "95.216.245.40", "password": "2R2ht?gALF7%L%"},
    "db1":  {"host": "95.217.76.42",  "password": "Ebmx9V_r?a38NM"},
}

def ssh_exec(client, cmd, timeout=60):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    return stdout.read().decode("utf-8", errors="replace"), stderr.read().decode("utf-8", errors="replace")

def connect(server):
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(SERVERS[server]["host"], username="root", password=SERVERS[server]["password"], timeout=10)
    return c

def main():
    app1 = connect("app1")
    
    all_svcs = [
        "auth-svc", "session-svc", "content-svc", "profile-svc",
        "messaging-svc", "goal-svc", "life-skills-svc", "baseline-svc",
        "assessment-svc", "notify-svc", "consent-svc", "personalization-svc",
        "billing-svc", "payments-svc", "analytics-svc", "focus-svc",
        "parent-svc", "ai-orchestrator"
    ]
    
    print("=" * 70)
    print("DATABASE_URL from K8s secrets:")
    print("=" * 70)
    
    for svc in all_svcs:
        # Try both key formats
        out, _ = ssh_exec(app1, f"kubectl get secret -n aivo-prod {svc}-secrets -o jsonpath='{{.data.database-url}}' 2>/dev/null")
        if out:
            decoded, _ = ssh_exec(app1, f"echo '{out}' | base64 -d 2>/dev/null")
        else:
            out, _ = ssh_exec(app1, f"kubectl get secret -n aivo-prod {svc}-secrets -o jsonpath='{{.data.DATABASE_URL}}' 2>/dev/null")
            if out:
                decoded, _ = ssh_exec(app1, f"echo '{out}' | base64 -d 2>/dev/null")
            else:
                decoded = ""
        
        # Mask password in output
        display = decoded.strip() if decoded else "NOT FOUND"
        if "://" in display:
            parts = display.split("@")
            if len(parts) >= 2:
                pre = parts[0].split("://")[0] + "://***:***@"
                display = pre + "@".join(parts[1:])
        print(f"  {svc:25s}: {display}")
    
    # Test connectivity from a working pod to PgBouncer
    print("\n" + "=" * 70)
    print("Connectivity test from working pod to PgBouncer (10.0.0.1:6432):")
    print("=" * 70)
    
    out, _ = ssh_exec(app1, "kubectl get pods -n aivo-prod -l app.kubernetes.io/name=auth-svc -o jsonpath='{.items[0].metadata.name}'")
    auth_pod = out.strip()
    if auth_pod:
        # Test connection to PgBouncer
        out, _ = ssh_exec(app1, f"kubectl exec -n aivo-prod {auth_pod} -- wget -qO- --timeout=5 http://10.0.0.1:6432/ 2>&1 || echo 'Connection test done'")
        print(f"  wget test: {out.strip()}")
        
        # nc test
        out, _ = ssh_exec(app1, f"kubectl exec -n aivo-prod {auth_pod} -- nc -zvw3 10.0.0.1 6432 2>&1 || echo 'nc not available'")
        print(f"  nc test: {out.strip()}")
    
    # Also check if PgBouncer is running on db1
    print("\n" + "=" * 70)
    print("PgBouncer status on db1:")
    print("=" * 70)
    db1 = connect("db1")
    out, _ = ssh_exec(db1, "systemctl is-active pgbouncer")
    print(f"  Status: {out.strip()}")
    out, _ = ssh_exec(db1, "ss -tlnp | grep 6432")
    print(f"  Listening: {out.strip()}")
    
    # Quick test connecting to PgBouncer from db1 itself
    out, err = ssh_exec(db1, "PGPASSWORD='Sh74VCfR40tiFd^d5P5spAneUiK&vzpp' psql -h 10.0.0.1 -p 6432 -U aivo_app -d aivo_goals -c 'SELECT 1;' 2>&1")
    print(f"  Local PgBouncer test (aivo_goals): {out.strip()}")
    
    out, err = ssh_exec(db1, "PGPASSWORD='Sh74VCfR40tiFd^d5P5spAneUiK&vzpp' psql -h 10.0.0.1 -p 6432 -U aivo_app -d aivo_profiles -c 'SELECT 1;' 2>&1")
    print(f"  Local PgBouncer test (aivo_profiles): {out.strip()}")
    
    db1.close()
    app1.close()

if __name__ == "__main__":
    main()
