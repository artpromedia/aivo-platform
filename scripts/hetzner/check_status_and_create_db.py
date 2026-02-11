#!/usr/bin/env python3
"""Check current pod status and create aivo_parent database."""
import paramiko
import time

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
    # 1. Check pod status on app1
    print("=" * 70)
    print("CURRENT POD STATUS (aivo-prod)")
    print("=" * 70)
    app1 = connect("app1")
    out, _ = ssh_exec(app1, "kubectl get pods -n aivo-prod -o wide --sort-by=.metadata.name", timeout=15)
    print(out)

    # Check which are ready
    out2, _ = ssh_exec(app1, """kubectl get deployments -n aivo-prod -o custom-columns='NAME:.metadata.name,READY:.status.readyReplicas,AVAILABLE:.status.availableReplicas,UNAVAILABLE:.status.unavailableReplicas' --sort-by=.metadata.name""", timeout=15)
    print("\nDEPLOYMENT READINESS:")
    print(out2)
    app1.close()

    # 2. Create aivo_parent database on db1
    print("\n" + "=" * 70)
    print("CREATING aivo_parent DATABASE")
    print("=" * 70)
    db1 = connect("db1")
    
    # Check if it exists first
    out, err = ssh_exec(db1, """sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='aivo_parent'" """)
    if "1" in out:
        print("  aivo_parent already exists")
    else:
        out, err = ssh_exec(db1, """sudo -u postgres psql -c "CREATE DATABASE aivo_parent OWNER aivo_app;" """)
        print(f"  Created aivo_parent: {out.strip()} {err.strip()}")
        # Grant privileges
        out, err = ssh_exec(db1, """sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE aivo_parent TO aivo_app;" """)
        print(f"  Granted privileges: {out.strip()}")

    # Add to PgBouncer
    out, err = ssh_exec(db1, "grep 'aivo_parent' /etc/pgbouncer/pgbouncer.ini")
    if "aivo_parent" in out:
        print("  aivo_parent already in PgBouncer config")
    else:
        # Add to [databases] section
        out, err = ssh_exec(db1, r"""sudo sed -i '/^\[databases\]/a aivo_parent = host=127.0.0.1 port=5432 dbname=aivo_parent' /etc/pgbouncer/pgbouncer.ini""")
        print(f"  Added aivo_parent to PgBouncer config")
        out, err = ssh_exec(db1, "sudo systemctl reload pgbouncer")
        print(f"  Reloaded PgBouncer: {err.strip() or 'OK'}")
    
    # Verify all databases
    out, err = ssh_exec(db1, """sudo -u postgres psql -tAc "SELECT datname FROM pg_database WHERE datname LIKE 'aivo_%' ORDER BY datname;" """)
    print(f"\n  All aivo databases:\n{out}")
    
    db1.close()
    print("\nDone!")

if __name__ == "__main__":
    main()
