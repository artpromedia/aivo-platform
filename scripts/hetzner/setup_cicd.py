#!/usr/bin/env python3
"""Phase 8: Setup deploy user, kustomize, repo clone, and SSH key for CI/CD."""

import paramiko
import os

HOST = "95.216.245.40"
KEY_FILE = r"C:\Users\ofema\.ssh\id_ed25519"

def run_cmd(ssh, cmd, label=""):
    print(f"  > {label or cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out.strip():
        print(out.strip())
    if err.strip() and "Warning" not in err:
        print(f"  STDERR: {err.strip()}")
    return out.strip()

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username="root", key_filename=KEY_FILE)

    # =========================================================================
    # 1. Give deploy user a kubeconfig
    # =========================================================================
    print("\n=== 1. Setup kubeconfig for deploy user ===")
    run_cmd(ssh, """
        mkdir -p /home/deploy/.kube
        cp /etc/rancher/k3s/k3s.yaml /home/deploy/.kube/config
        sed -i 's|127.0.0.1|10.0.0.2|g' /home/deploy/.kube/config
        chown -R deploy:deploy /home/deploy/.kube
        chmod 600 /home/deploy/.kube/config
    """, "Copy kubeconfig to deploy user")

    # Verify
    run_cmd(ssh, "su - deploy -c 'kubectl get nodes'", "Verify kubectl access")

    # =========================================================================
    # 2. Install kustomize
    # =========================================================================
    print("\n=== 2. Install kustomize ===")
    out = run_cmd(ssh, "which kustomize 2>/dev/null && kustomize version 2>/dev/null || echo 'NOT_INSTALLED'")
    if "NOT_INSTALLED" in out:
        run_cmd(ssh, """
            cd /tmp
            curl -sLO "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.4.3/kustomize_v5.4.3_linux_amd64.tar.gz"
            tar xzf kustomize_v5.4.3_linux_amd64.tar.gz
            mv kustomize /usr/local/bin/
            chmod +x /usr/local/bin/kustomize
            rm -f kustomize_v5.4.3_linux_amd64.tar.gz
        """, "Download and install kustomize v5.4.3")
    run_cmd(ssh, "kustomize version", "Kustomize version")

    # =========================================================================
    # 3. Install git if not present
    # =========================================================================
    print("\n=== 3. Ensure git is installed ===")
    run_cmd(ssh, "which git || apt-get install -y git", "Check/install git")

    # =========================================================================
    # 4. Clone/setup repo at /opt/aivo
    # =========================================================================
    print("\n=== 4. Setup /opt/aivo repo ===")
    run_cmd(ssh, """
        if [ ! -d /opt/aivo/.git ]; then
            mkdir -p /opt/aivo
            cd /opt/aivo
            git init
            git remote add origin https://github.com/artpromedia/aivo-platform.git || true
            echo "Repo initialized (will be populated on first deploy)"
        else
            echo "Repo already exists"
        fi
        chown -R deploy:deploy /opt/aivo
    """, "Initialize /opt/aivo")

    # =========================================================================
    # 5. Generate SSH keypair for deploy user (for GitHub Actions)
    # =========================================================================
    print("\n=== 5. Generate SSH key for CI/CD deploy ===")
    out = run_cmd(ssh, "ls /home/deploy/.ssh/id_ed25519 2>/dev/null || echo 'NO_KEY'")
    if "NO_KEY" in out:
        run_cmd(ssh, """
            su - deploy -c 'ssh-keygen -t ed25519 -f /home/deploy/.ssh/id_ed25519 -N "" -C "github-actions-deploy"'
            cat /home/deploy/.ssh/id_ed25519.pub >> /home/deploy/.ssh/authorized_keys
            chmod 600 /home/deploy/.ssh/authorized_keys
            chown deploy:deploy /home/deploy/.ssh/authorized_keys
        """, "Generate ed25519 keypair")
    else:
        print("  SSH key already exists")

    # Print the PRIVATE key (to be added as GitHub secret)
    print("\n" + "=" * 60)
    print("  GITHUB SECRET: HETZNER_SSH_KEY")
    print("=" * 60)
    out = run_cmd(ssh, "cat /home/deploy/.ssh/id_ed25519", "Private key")
    print("\n" + "=" * 60)

    # =========================================================================
    # 6. Allow deploy user passwordless sudo for kubectl only
    # =========================================================================
    print("\n=== 6. Verify deploy user can run kubectl without sudo ===")
    run_cmd(ssh, "su - deploy -c 'kubectl get ns aivo-prod -o name'", "Test kubectl as deploy")

    # =========================================================================
    # 7. Ensure deploy user can pull from GHCR
    # =========================================================================
    print("\n=== 7. Setup GHCR pull for deploy user ===")
    run_cmd(ssh, """
        su - deploy -c 'kubectl -n aivo-prod get secret ghcr-pull-secret -o name 2>/dev/null || echo "MISSING"'
    """, "Check GHCR pull secret")

    ssh.close()
    print("\n✅ Deploy user setup complete!")

if __name__ == "__main__":
    main()
