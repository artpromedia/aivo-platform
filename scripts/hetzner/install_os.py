#!/usr/bin/env python3
"""
AIVO Hetzner OS Installation Script
=====================================
Installs Ubuntu 24.04 on servers currently in Rescue Mode using Hetzner's installimage.

This MUST be run before the main provisioning script.

Usage:
  python scripts/hetzner/install_os.py --server db1
  python scripts/hetzner/install_os.py --server app1
  python scripts/hetzner/install_os.py --server app2
  python scripts/hetzner/install_os.py --server all
"""

import paramiko
import sys
import time
import argparse

# ─── Server Definitions ───────────────────────────────────────────────────────

SERVERS = {
    "db1": {
        "hostname": "aivo-db1",
        "public_ip": "95.217.76.42",
        "username": "root",
        "password": "Ebmx9V_r?a38NM",
        "role": "database",
    },
    "app1": {
        "hostname": "aivo-app1",
        "public_ip": "95.216.245.40",
        "username": "root",
        "password": "2R2ht?gALF7%L%",
        "role": "app-primary",
    },
    "app2": {
        "hostname": "aivo-app2",
        "public_ip": "95.217.195.144",
        "username": "root",
        "password": "j?A6M9rKcMHRGT",
        "role": "app-secondary",
    },
}


class ServerConnection:
    def __init__(self, server_key):
        self.server = SERVERS[server_key]
        self.key = server_key
        self.client = None

    def connect(self):
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        print(f"\n{'='*60}")
        print(f"Connecting to {self.server['hostname']} ({self.server['public_ip']})...")
        self.client.connect(
            hostname=self.server["public_ip"],
            username=self.server["username"],
            password=self.server["password"],
            timeout=30,
            look_for_keys=False,
            allow_agent=False,
        )
        print(f"[✓] Connected to {self.server['hostname']}")
        return self

    def run(self, cmd, description="", timeout=600, check=True):
        if description:
            print(f"  → {description}")
        stdin, stdout, stderr = self.client.exec_command(cmd, timeout=timeout)
        exit_code = stdout.channel.recv_exit_status()
        out = stdout.read().decode("utf-8", errors="replace").strip()
        err = stderr.read().decode("utf-8", errors="replace").strip()

        if exit_code != 0 and check:
            print(f"  [✗] Command failed (exit {exit_code})")
            if err:
                print(f"      STDERR: {err[:500]}")
        if out:
            for line in out.split("\n")[:30]:
                print(f"      {line}")

        return exit_code, out, err

    def close(self):
        if self.client:
            self.client.close()
            print(f"[✓] Disconnected from {self.server['hostname']}")


def check_rescue_mode(conn):
    """Check if server is in rescue mode."""
    _, out, _ = conn.run("cat /etc/motd 2>/dev/null || echo 'no motd'", "Checking if in rescue mode")
    if "rescue" in out.lower() or "hetzner" in out.lower():
        return True
    _, out2, _ = conn.run("hostname", check=False)
    return "rescue" in out2.lower()


def discover_disks(conn):
    """Discover available disks."""
    conn.run("lsblk -d -o NAME,SIZE,MODEL,TYPE | grep disk", "Discovering disks")
    _, out, _ = conn.run("ls /dev/sd? /dev/nvme?n? 2>/dev/null | sort", check=False)
    disks = [d.strip() for d in out.split("\n") if d.strip()]
    print(f"      Available disks: {disks}")
    return disks


def install_os(server_key):
    """Install Ubuntu 24.04 on a server via Hetzner installimage."""
    srv = SERVERS[server_key]
    conn = ServerConnection(server_key)
    conn.connect()

    try:
        # Check rescue mode
        is_rescue = check_rescue_mode(conn)
        if not is_rescue:
            print(f"  [!] Server does not appear to be in rescue mode.")
            print(f"      If OS is already installed, skip this step.")
            response = input("      Continue anyway? (y/N): ").strip().lower()
            if response != "y":
                return

        # Discover disks
        disks = discover_disks(conn)

        # Check which images are available
        conn.run("ls /root/.oldroot/nfs/images/ 2>/dev/null || ls /root/images/ 2>/dev/null || echo 'Checking image list...'",
                 "Available OS images")

        # Determine disk configuration based on server role
        if server_key == "db1":
            # DB server: 2 datacenter SSDs — install OS on first, keep second for data
            primary_disk = disks[0] if disks else "/dev/sda"
            install_config = f"""
DRIVE1 {primary_disk}
BOOTLOADER grub
HOSTNAME {srv['hostname']}
PART /boot ext4 1G
PART lvm vg0 all
LV vg0 root / ext4 100G
LV vg0 swap swap swap 16G
LV vg0 data /data/postgres ext4 all
IMAGE /root/.oldroot/nfs/images/Ubuntu-2404-noble-amd64-base.tar.gz
"""
        elif server_key == "app1":
            # App Primary: 2 NVMe — install OS on first
            primary_disk = disks[0] if disks else "/dev/nvme0n1"
            install_config = f"""
DRIVE1 {primary_disk}
BOOTLOADER grub
HOSTNAME {srv['hostname']}
PART /boot ext4 1G
PART lvm vg0 all
LV vg0 root / ext4 100G
LV vg0 swap swap swap 16G
LV vg0 data /data/k3s ext4 all
IMAGE /root/.oldroot/nfs/images/Ubuntu-2404-noble-amd64-base.tar.gz
"""
        elif server_key == "app2":
            # App Secondary: 3 NVMe — install OS on first
            primary_disk = disks[0] if disks else "/dev/nvme0n1"
            install_config = f"""
DRIVE1 {primary_disk}
BOOTLOADER grub
HOSTNAME {srv['hostname']}
PART /boot ext4 1G
PART lvm vg0 all
LV vg0 root / ext4 100G
LV vg0 swap swap swap 16G
LV vg0 data /data/k3s ext4 all
IMAGE /root/.oldroot/nfs/images/Ubuntu-2404-noble-amd64-base.tar.gz
"""

        print(f"\n  ╔══════════════════════════════════════════════════════╗")
        print(f"  ║  INSTALLING UBUNTU 24.04 ON {srv['hostname'].upper():^20}     ║")
        print(f"  ║  Primary disk: {primary_disk:^37} ║")
        print(f"  ║  THIS WILL ERASE ALL DATA ON THE DISK!              ║")
        print(f"  ╚══════════════════════════════════════════════════════╝")
        
        confirm = input(f"\n  Type 'YES' to proceed with OS installation on {srv['hostname']}: ").strip()
        if confirm != "YES":
            print("  [!] Aborted.")
            return

        # Write install config
        conn.run(
            f"cat > /autosetup << 'EOF'\n{install_config}EOF",
            "Writing installimage configuration",
        )

        # Show the config
        conn.run("cat /autosetup", "Install configuration")

        # Run installimage
        print(f"\n  → Running installimage (this takes 5-15 minutes)...")
        exit_code, out, err = conn.run(
            "installimage -a -c /autosetup",
            "Installing Ubuntu 24.04...",
            timeout=900,
        )

        if exit_code == 0:
            print(f"\n  [✓] OS installation completed successfully!")
            print(f"  → Rebooting server...")
            conn.run("reboot", "Rebooting into new OS", check=False)
            print(f"\n  ⏳ Server is rebooting. Wait ~2-3 minutes, then run:")
            print(f"     python scripts/hetzner/provision.py --phase 1 --server {server_key}")
        else:
            print(f"\n  [✗] Installation failed!")
            print(f"      Check the output above for errors.")
            print(f"      Common fix: Try a different image or disk configuration.")

    finally:
        conn.close()


def check_images(server_key):
    """List available OS images on a rescue mode server."""
    conn = ServerConnection(server_key)
    conn.connect()
    try:
        conn.run("ls -la /root/.oldroot/nfs/images/ 2>/dev/null | grep -i ubuntu", "Ubuntu images available")
        conn.run("ls -la /root/.oldroot/nfs/images/ 2>/dev/null | grep -i debian", "Debian images available")
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Install OS on Hetzner servers from Rescue Mode")
    parser.add_argument(
        "--server",
        required=True,
        choices=["db1", "app1", "app2", "all"],
        help="Server to install OS on",
    )
    parser.add_argument(
        "--check-images",
        action="store_true",
        help="Only list available OS images, don't install",
    )
    args = parser.parse_args()

    if args.check_images:
        servers = [args.server] if args.server != "all" else ["db1", "app1", "app2"]
        for s in servers:
            check_images(s)
        return

    if args.server == "all":
        for s in ["db1", "app1", "app2"]:
            install_os(s)
    else:
        install_os(args.server)


if __name__ == "__main__":
    main()
