#!/usr/bin/env python3
"""Get detailed crash logs for specific failing services."""
import paramiko, time

APP1 = {"host": "95.216.245.40", "user": "root", "password": "2R2ht?gALF7%L%"}

def run_ssh(cmd, timeout=60):
    for attempt in range(3):
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            ssh.connect(APP1["host"], username=APP1["user"], password=APP1["password"],
                       timeout=30, banner_timeout=30, auth_timeout=30)
            _, stdout, stderr = ssh.exec_command(
                f"KUBECONFIG=/root/.kube/config {cmd}", timeout=timeout
            )
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            ssh.close()
            return out, err
        except Exception as e:
            try: ssh.close()
            except: pass
            if attempt < 2:
                time.sleep(3)
            else:
                return f"ERROR: {e}", ""

services = ["auth-svc", "content-svc", "billing-svc", "profile-svc", "messaging-svc", "notify-svc", "consent-svc"]

for svc in services:
    print(f"\n{'='*60}")
    print(f" {svc} — FULL LOGS")
    print(f"{'='*60}")
    pod_out, _ = run_ssh(f"kubectl -n aivo-prod get pods --no-headers | grep '^{svc}' | head -1")
    if pod_out:
        pod = pod_out.split()[0]
        logs, _ = run_ssh(f"kubectl -n aivo-prod logs {pod} --tail=30 2>/dev/null")
        print(logs[:2000] if logs else "(empty)")
    else:
        print("(no pod found)")
