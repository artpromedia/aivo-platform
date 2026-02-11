#!/usr/bin/env python3
"""
AIVO Hetzner OS Installation (Non-Interactive)
================================================
Installs Ubuntu 24.04 on all 3 servers from Rescue Mode using installimage.
Runs fully automated — no prompts.

Usage:
  python scripts/hetzner/install_os_auto.py --server db1
  python scripts/hetzner/install_os_auto.py --server app1  
  python scripts/hetzner/install_os_auto.py --server app2
  python scripts/hetzner/install_os_auto.py --server all
"""

import paramiko
import sys
import time
import argparse

SERVERS = {
    "db1": {
        "hostname": "aivo-db1",
        "public_ip": "95.217.76.42",
        "username": "root",
        "password": "Ebmx9V_r?a38NM",
    },
    "app1": {
        "hostname": "aivo-app1",
        "public_ip": "95.216.245.40",
        "username": "root",
        "password": "2R2ht?gALF7%L%",
    },
    "app2": {
        "hostname": "aivo-app2",
        "public_ip": "95.217.195.144",
        "username": "root",
        "password": "j?A6M9rKcMHRGT",
    },
}


def ssh_connect(server_key):
    srv = SERVERS[server_key]
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"\n{'='*60}")
    print(f"Connecting to {srv['hostname']} ({srv['public_ip']})...")
    client.connect(
        hostname=srv["public_ip"],
        username=srv["username"],
        password=srv["password"],
        timeout=30,
        look_for_keys=False,
        allow_agent=False,
    )
    print(f"[✓] Connected")
    return client


def run_cmd(client, cmd, desc="", timeout=900):
    if desc:
        print(f"  → {desc}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if out:
        for line in out.split("\n")[:50]:
            print(f"    {line}")
    if exit_code != 0 and err:
        for line in err.split("\n")[:10]:
            print(f"    [ERR] {line}")
    return exit_code, out, err


def install_server(server_key):
    srv = SERVERS[server_key]
    client = ssh_connect(server_key)

    try:
        # 1. Discover disks
        print(f"\n  --- Disk Discovery ---")
        run_cmd(client, "lsblk -d -o NAME,SIZE,MODEL,TYPE | grep disk", "Available disks")
        
        # Get first disk
        _, disk_out, _ = run_cmd(client, "lsblk -d -n -o NAME,TYPE | grep disk | head -1 | awk '{print $1}'", "Primary disk")
        primary_disk = f"/dev/{disk_out.strip()}" if disk_out.strip() else "/dev/sda"
        print(f"    Using primary disk: {primary_disk}")

        # 2. Write installimage config
        # Use simple partitioning — OS on first disk only, other disks left for later
        config = f"""DRIVE1 {primary_disk}
BOOTLOADER grub
HOSTNAME {srv['hostname']}
PART /boot ext4 1G
PART lvm vg0 all
LV vg0 root / ext4 200G
LV vg0 swap swap swap 16G
LV vg0 data /data ext4 all
IMAGE /root/.oldroot/nfs/images/Ubuntu-2404-noble-amd64-base.tar.gz
"""
        run_cmd(client, f"cat > /autosetup << 'ENDCONF'\n{config}ENDCONF", "Writing install config")
        run_cmd(client, "cat /autosetup", "Install configuration")

        # 3. Run installimage
        print(f"\n  ╔══════════════════════════════════════════════════════╗")
        print(f"  ║  INSTALLING UBUNTU 24.04 ON {srv['hostname'].upper():^24}   ║")
        print(f"  ║  Disk: {primary_disk:^44} ║")
        print(f"  ╚══════════════════════════════════════════════════════╝")
        print(f"  → Running installimage (5-15 minutes)...")
        
        exit_code, out, err = run_cmd(
            client, 
            "/root/.oldroot/nfs/install/installimage -a -c /autosetup 2>&1",
            "Installing...",
            timeout=900,
        )

        if exit_code == 0 or "INSTALLATION COMPLETE" in out.upper():
            print(f"\n  ✅ OS installation completed on {srv['hostname']}!")
            
            # Set the root password before rebooting (installimage resets it)
            pwd = srv["password"]
            run_cmd(client, f"echo 'root:{pwd}' | chpasswd", "Setting root password")
            
            # Reboot
            print(f"  → Rebooting...")
            try:
                run_cmd(client, "reboot", timeout=5)
            except:
                pass  # reboot kills the connection
            
            print(f"  ⏳ {srv['hostname']} is rebooting into Ubuntu 24.04...")
            print(f"     Wait ~2-3 minutes for it to come back online.")
            return True
        else:
            print(f"\n  ❌ Installation may have failed on {srv['hostname']}")
            print(f"     Exit code: {exit_code}")
            return False

    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False
    finally:
        try:
            client.close()
        except:
            pass


def wait_for_reboot(server_key, max_wait=300):
    """Wait for server to come back online after reboot."""
    srv = SERVERS[server_key]
    print(f"\n  ⏳ Waiting for {srv['hostname']} to come online...")
    
    start = time.time()
    while time.time() - start < max_wait:
        try:
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(
                hostname=srv["public_ip"],
                username="root",
                password=srv["password"],
                timeout=10,
                look_for_keys=False,
                allow_agent=False,
            )
            _, out, _ = run_cmd(client, "cat /etc/os-release | head -2", "OS check")
            client.close()
            
            if "ubuntu" in out.lower() or "noble" in out.lower():
                print(f"  ✅ {srv['hostname']} is online with Ubuntu 24.04!")
                return True
            elif "rescue" not in out.lower():
                print(f"  ✅ {srv['hostname']} is online!")
                return True
        except Exception:
            elapsed = int(time.time() - start)
            print(f"    ... still waiting ({elapsed}s / {max_wait}s)")
            time.sleep(15)
    
    print(f"  ⚠️ Timeout waiting for {srv['hostname']}")
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", required=True, choices=["db1", "app1", "app2", "all"])
    parser.add_argument("--wait", action="store_true", help="Wait for reboot after install")
    args = parser.parse_args()

    targets = [args.server] if args.server != "all" else ["db1", "app1", "app2"]
    results = {}

    for srv in targets:
        results[srv] = install_server(srv)

    if args.wait:
        print(f"\n{'='*60}")
        print(f"Waiting for servers to reboot...")
        print(f"{'='*60}")
        time.sleep(30)  # Initial wait
        for srv in targets:
            if results[srv]:
                wait_for_reboot(srv)

    print(f"\n{'='*60}")
    print(f"INSTALLATION SUMMARY")
    print(f"{'='*60}")
    for srv in targets:
        status = "✅ Installed" if results[srv] else "❌ Failed"
        print(f"  {SERVERS[srv]['hostname']:15} {status}")
    
    if all(results.values()):
        print(f"\n  Next step: python scripts/hetzner/provision.py --phase 1")


if __name__ == "__main__":
    main()
