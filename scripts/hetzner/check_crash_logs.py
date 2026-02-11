#!/usr/bin/env python3
"""Check pod logs for crash reasons and run database migrations."""
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

# Check logs of a crashing service
print("=" * 60)
print("CHECKING CRASH LOGS")
print("=" * 60)

# Pick one crashing pod from a few services
for svc in ["auth-svc", "billing-svc", "content-svc"]:
    print(f"\n--- {svc} logs (last 15 lines) ---")
    out, _ = run_ssh(f"kubectl -n aivo-prod logs -l app={svc} --tail=15 2>/dev/null")
    print(out[:1000] if out else "(no output)")
