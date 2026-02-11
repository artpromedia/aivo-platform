#!/usr/bin/env python3
"""Check crash logs for the 3 crashing services and 5 not-ready services."""
import paramiko

APP1 = {"host": "95.216.245.40", "password": "2R2ht?gALF7%L%"}

def ssh_exec(client, cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    return stdout.read().decode("utf-8", errors="replace"), stderr.read().decode("utf-8", errors="replace")

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(APP1["host"], username="root", password=APP1["password"], timeout=10)

    for svc in ["assessment-svc", "analytics-svc", "parent-svc"]:
        print("=" * 70)
        print(f"  {svc} - CRASH LOGS (last 40 lines)")
        print("=" * 70)
        out, _ = ssh_exec(c, f"kubectl get pods -n aivo-prod -l app={svc} --sort-by=.metadata.creationTimestamp -o jsonpath='{{.items[-1].metadata.name}}'")
        pod = out.strip()
        if pod:
            logs, _ = ssh_exec(c, f"kubectl logs -n aivo-prod {pod} --tail=40 --previous 2>/dev/null || kubectl logs -n aivo-prod {pod} --tail=40")
            print(logs)
        print()

    print("\n" + "=" * 70)
    print("NOT-READY SERVICES (Running but 0/1)")
    print("=" * 70)
    for svc in ["goal-svc", "notify-svc", "profile-svc", "personalization-svc", "payments-svc"]:
        print(f"\n--- {svc} (last 20 lines) ---")
        out, _ = ssh_exec(c, f"kubectl get pods -n aivo-prod -l app={svc} --sort-by=.metadata.creationTimestamp -o jsonpath='{{.items[-1].metadata.name}}'")
        pod = out.strip()
        if pod:
            logs, _ = ssh_exec(c, f"kubectl logs -n aivo-prod {pod} --tail=20")
            print(logs)

    c.close()

if __name__ == "__main__":
    main()
