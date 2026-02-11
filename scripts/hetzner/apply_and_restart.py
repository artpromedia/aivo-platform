#!/usr/bin/env python3
"""
Apply updated K8s manifests and restart all deployments.
1. Copy updated manifests to app1
2. Apply via kustomize
3. Rolling restart all 18 deployments
4. Wait and check pod status
"""
import paramiko
import time
import os
import subprocess

APP1_IP = "95.216.245.40"
APP1_PASS = "2R2ht?gALF7%L%"
NAMESPACE = "aivo-prod"
WORKSPACE = r"c:\Users\ofema\aivo"

SERVICES = [
    "auth-svc", "session-svc", "consent-svc", "profile-svc", "content-svc",
    "assessment-svc", "personalization-svc", "life-skills-svc", "ai-orchestrator",
    "analytics-svc", "notify-svc", "messaging-svc", "goal-svc", "focus-svc",
    "billing-svc", "payments-svc", "parent-svc", "baseline-svc"
]

def ssh_exec(client, cmd, timeout=120):
    for attempt in range(3):
        try:
            stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            return out, err
        except Exception as e:
            if attempt < 2:
                print(f"  Retry {attempt+1}...")
                time.sleep(3)
            else:
                raise

def connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    for attempt in range(3):
        try:
            client.connect(APP1_IP, username="root", password=APP1_PASS, timeout=30)
            return client
        except Exception as e:
            print(f"Connect attempt {attempt+1}: {e}")
            if attempt < 2:
                time.sleep(5)
    raise Exception("Failed to connect")

def upload_dir(sftp, local_dir, remote_dir):
    """Upload a directory recursively via SFTP."""
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        sftp.mkdir(remote_dir)
    
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"
        if os.path.isdir(local_path):
            upload_dir(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)

def main():
    client = connect()
    print("Connected to app1\n")

    # Step 1: Upload K8s manifests
    print("=== Step 1: Upload K8s manifests ===")
    sftp = client.open_sftp()
    
    # Create directory structure on remote
    ssh_exec(client, "rm -rf /tmp/k8s-manifests && mkdir -p /tmp/k8s-manifests/base /tmp/k8s-manifests/overlays/hetzner")
    
    # Upload base manifests
    base_dir = os.path.join(WORKSPACE, "infra", "k8s", "base")
    upload_dir(sftp, base_dir, "/tmp/k8s-manifests/base")
    print(f"  Uploaded {len(os.listdir(base_dir))} base files")
    
    # Upload hetzner overlay
    overlay_dir = os.path.join(WORKSPACE, "infra", "k8s", "overlays", "hetzner")
    upload_dir(sftp, overlay_dir, "/tmp/k8s-manifests/overlays/hetzner")
    print(f"  Uploaded {len(os.listdir(overlay_dir))} overlay files")
    
    sftp.close()

    # Step 2: Apply manifests
    print("\n=== Step 2: Apply manifests via kustomize ===")
    out, err = ssh_exec(client, "kubectl apply -k /tmp/k8s-manifests/overlays/hetzner -n aivo-prod 2>&1", timeout=120)
    print(out[:2000] if out else err[:2000])

    # Step 3: Rolling restart all deployments
    print("\n=== Step 3: Rolling restart ===")
    for svc in SERVICES:
        out, err = ssh_exec(client, f"kubectl rollout restart deployment/{svc} -n {NAMESPACE} 2>&1")
        status = "✅" if "restarted" in (out + err) else "❌"
        print(f"  {status} {svc}")

    # Step 4: Wait for rollout
    print("\n=== Step 4: Waiting 60s for pods to start ===")
    time.sleep(60)

    # Step 5: Check pod status
    print("\n=== Step 5: Pod status ===")
    out, err = ssh_exec(client, f"kubectl get pods -n {NAMESPACE} --no-headers -o custom-columns='NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount' 2>/dev/null | grep -v Terminating | sort")
    print(out)

    # Count ready/not-ready
    ready = sum(1 for line in out.split('\n') if 'true' in line and 'cm-acme' not in line)
    not_ready = sum(1 for line in out.split('\n') if 'false' in line)
    print(f"\n✅ Ready: {ready}  ❌ Not Ready: {not_ready}")

    client.close()

if __name__ == "__main__":
    main()
