#!/usr/bin/env python3
"""Restart all K8s deployments to pull the new GHCR images."""
import paramiko, time, json

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
                print(f"  ⚠️  SSH retry {attempt+1}...")
                time.sleep(3)
            else:
                return f"ERROR: {e}", ""

print("=" * 60)
print("ROLLING RESTART ALL DEPLOYMENTS")
print("=" * 60)

# Get all deployments
out, _ = run_ssh("kubectl -n aivo-prod get deployments -o jsonpath='{.items[*].metadata.name}'")
deployments = out.strip("'").split()
print(f"Found {len(deployments)} deployments\n")

for dep in deployments:
    if dep.startswith("cm-acme"):  # Skip cert-manager pods
        continue
    print(f"  Restarting {dep}...", end=" ")
    out, err = run_ssh(f"kubectl -n aivo-prod rollout restart deployment/{dep}")
    if "restarted" in out:
        print("✅")
    else:
        print(f"⚠️ {out} {err}")

print("\nWaiting 30s for pods to start pulling images...")
time.sleep(30)

# Check pod status
print("\n" + "=" * 60)
print("POD STATUS")
print("=" * 60)
out, _ = run_ssh("kubectl -n aivo-prod get pods --no-headers -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,IMAGE:.spec.containers[0].image")
print(out)

# Count statuses
print("\n" + "=" * 60)
out2, _ = run_ssh("kubectl -n aivo-prod get pods --no-headers | awk '{print $3}' | sort | uniq -c | sort -rn")
print("STATUS SUMMARY:")
print(out2)
print("=" * 60)
