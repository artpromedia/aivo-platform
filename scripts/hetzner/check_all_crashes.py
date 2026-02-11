#!/usr/bin/env python3
"""Check crash logs from ALL crashing pods."""
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

# Get current status
print("=" * 70)
print("CURRENT POD STATUS SUMMARY")
print("=" * 70)

out, _ = run_ssh("kubectl -n aivo-prod get pods --no-headers | awk '{split($1,a,\"-\"); svc=a[1]; for(i=2;i<=length(a)-2;i++) svc=svc\"-\"a[i]; status[$3]++; svcs[svc]=$3} END { for(s in status) print status[s], s; print \"---\"; for(s in svcs) print s, svcs[s]}'")
print(out)

# Get unique service names that are crashing
print("\n" + "=" * 70)
print("CRASH LOGS BY SERVICE (one pod each)")
print("=" * 70)

# Get deployments and check one pod from each
deployments_out, _ = run_ssh("kubectl -n aivo-prod get deployments -o jsonpath='{range .items[*]}{.metadata.name}{\"\\n\"}{end}'")
deployments = [d.strip() for d in deployments_out.strip("'").split("\n") if d.strip()]

for dep in sorted(deployments):
    # Get a pod from this deployment
    pod_out, _ = run_ssh(f"kubectl -n aivo-prod get pods -l app.kubernetes.io/name={dep} --no-headers 2>/dev/null | head -1")
    if not pod_out:
        # Try different label
        pod_out, _ = run_ssh(f"kubectl -n aivo-prod get pods --no-headers | grep '^{dep}' | head -1")
    
    if not pod_out:
        continue
    
    pod_name = pod_out.split()[0]
    pod_status = pod_out.split()[2] if len(pod_out.split()) > 2 else "?"
    ready = pod_out.split()[1] if len(pod_out.split()) > 1 else "?"
    
    if "Running" in pod_status and "1/1" in ready:
        print(f"\n✅ {dep}: Running and Ready")
        continue
    
    print(f"\n❌ {dep}: {pod_status} ({ready})")
    log_out, _ = run_ssh(f"kubectl -n aivo-prod logs {pod_name} --tail=5 2>/dev/null")
    if log_out:
        # Get just the error message
        for line in log_out.split("\n"):
            if "Error" in line or "Cannot" in line or "error" in line or "ECONNREFUSED" in line or "not found" in line:
                print(f"   → {line.strip()[:120]}")
                break
        else:
            print(f"   → {log_out.split(chr(10))[-1][:120]}")
