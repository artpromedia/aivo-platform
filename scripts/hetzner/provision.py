#!/usr/bin/env python3
"""
AIVO Hetzner Server Provisioning Script
========================================
Provisions 3 Hetzner dedicated servers per the HETZNER_DEPLOYMENT_GUIDE.md

Server assignments:
  Server 1 (DB)           - 95.217.76.42  → aivo-db1  (10.0.0.1)
  Server 2 (App Primary)  - 95.216.245.40 → aivo-app1 (10.0.0.2)
  Server 3 (App Secondary)- 95.217.195.144→ aivo-app2 (10.0.0.3)

Usage:
  python scripts/hetzner/provision.py --phase 1   # OS setup
  python scripts/hetzner/provision.py --phase 2   # Database
  python scripts/hetzner/provision.py --phase 3   # K3s cluster
  python scripts/hetzner/provision.py --phase all  # Everything
"""

import paramiko
import sys
import time
import argparse
import secrets
import string
import json
import os

# ─── Server Definitions ───────────────────────────────────────────────────────

SERVERS = {
    "db1": {
        "hostname": "aivo-db1",
        "public_ip": "95.217.76.42",
        "private_ip": "10.0.0.1",
        "username": "root",
        "password": "Ebmx9V_r?a38NM",
        "role": "database",
    },
    "app1": {
        "hostname": "aivo-app1",
        "public_ip": "95.216.245.40",
        "private_ip": "10.0.0.2",
        "username": "root",
        "password": "2R2ht?gALF7%L%",
        "role": "app-primary",
    },
    "app2": {
        "hostname": "aivo-app2",
        "public_ip": "95.217.195.144",
        "private_ip": "10.0.0.3",
        "username": "root",
        "password": "j?A6M9rKcMHRGT",
        "role": "app-secondary",
    },
}

# ─── Generated Credentials (saved to credentials file) ─────────────────────

CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")


def generate_password(length=32):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def load_or_generate_credentials():
    if os.path.exists(CREDENTIALS_FILE):
        with open(CREDENTIALS_FILE, "r") as f:
            return json.load(f)

    creds = {
        "postgres_app_password": generate_password(32),
        "postgres_repl_password": generate_password(32),
        "redis_password": generate_password(32),
        "pgbouncer_password": generate_password(32),
        "minio_password": generate_password(32),
        "grafana_password": generate_password(24),
        "harbor_admin_password": generate_password(24),
        "harbor_db_password": generate_password(24),
        "deploy_ssh_pubkey": "",  # Will be generated
    }

    with open(CREDENTIALS_FILE, "w") as f:
        json.dump(creds, f, indent=2)
    os.chmod(CREDENTIALS_FILE, 0o600)
    print(f"[✓] Generated credentials saved to {CREDENTIALS_FILE}")
    print("[!] IMPORTANT: Back up this file securely and never commit it to git!")
    return creds


# ─── SSH Helper ────────────────────────────────────────────────────────────────


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

    def run(self, cmd, description="", timeout=300, check=True):
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
                print(f"      STDOUT: {out[:500]}")
        elif out and len(out) < 200:
            print(f"      {out}")

        return exit_code, out, err

    def run_script(self, script, description="", timeout=600):
        """Upload and run a multi-line bash script."""
        if description:
            print(f"  → {description}")

        # Use heredoc approach through exec_command
        full_cmd = f"bash -c '{script}'" if "\n" not in script else f"bash << 'EOSCRIPT'\n{script}\nEOSCRIPT"
        stdin, stdout, stderr = self.client.exec_command(full_cmd, timeout=timeout)
        exit_code = stdout.channel.recv_exit_status()
        out = stdout.read().decode("utf-8", errors="replace").strip()
        err = stderr.read().decode("utf-8", errors="replace").strip()

        if exit_code != 0:
            print(f"  [✗] Script failed (exit {exit_code})")
            if err:
                print(f"      STDERR: {err[:800]}")
        else:
            print(f"  [✓] Done")
            if out and len(out) < 300:
                print(f"      {out}")

        return exit_code, out, err

    def close(self):
        if self.client:
            self.client.close()
            print(f"[✓] Disconnected from {self.server['hostname']}")


# ─── Phase 1: OS Setup ────────────────────────────────────────────────────────


def phase1_os_setup(server_key):
    """Phase 1.2: Initial OS Setup for a single server."""
    srv = SERVERS[server_key]
    conn = ServerConnection(server_key)
    conn.connect()

    try:
        # Check OS
        conn.run("cat /etc/os-release | head -3", "Checking OS version")
        conn.run("uname -a", "Kernel info")
        conn.run("lsblk -d -o NAME,SIZE,MODEL,TYPE | grep disk", "Checking disks")
        conn.run("free -h | head -2", "Checking RAM")

        # Update system
        conn.run(
            "export DEBIAN_FRONTEND=noninteractive && apt-get update -qq && apt-get upgrade -y -qq",
            "Updating system packages (this may take a few minutes)...",
            timeout=600,
        )

        # Set hostname
        conn.run(
            f"hostnamectl set-hostname {srv['hostname']}",
            f"Setting hostname to {srv['hostname']}",
        )

        # Set timezone
        conn.run("timedatectl set-timezone UTC", "Setting timezone to UTC")

        # Install essentials
        conn.run(
            "export DEBIAN_FRONTEND=noninteractive && apt-get install -y -qq "
            "curl wget git htop iotop net-tools ufw fail2ban "
            "unattended-upgrades apt-transport-https ca-certificates "
            "gnupg lsb-release jq vlan rsync software-properties-common",
            "Installing essential packages...",
            timeout=300,
        )

        # Configure /etc/hosts
        hosts_content = (
            f"127.0.0.1 localhost\n"
            f"127.0.1.1 {srv['hostname']}\n"
            f"10.0.0.1 aivo-db1\n"
            f"10.0.0.2 aivo-app1\n"
            f"10.0.0.3 aivo-app2\n"
        )
        conn.run(
            f"cat > /etc/hosts << 'EOF'\n{hosts_content}EOF",
            "Configuring /etc/hosts with all server entries",
        )

        # Create deploy user
        conn.run_script(
            """
            id deploy &>/dev/null && echo "User deploy already exists" || {
                adduser --disabled-password --gecos "" deploy
                usermod -aG sudo deploy
                echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
                chmod 440 /etc/sudoers.d/deploy
                echo "Deploy user created"
            }
            # Set up SSH directory for deploy user
            mkdir -p /home/deploy/.ssh
            chmod 700 /home/deploy/.ssh
            chown -R deploy:deploy /home/deploy/.ssh
            """,
            "Creating deploy user with sudo access",
        )

        # Generate SSH key pair for deploy user (for inter-server communication)
        conn.run_script(
            """
            if [ ! -f /home/deploy/.ssh/id_ed25519 ]; then
                ssh-keygen -t ed25519 -f /home/deploy/.ssh/id_ed25519 -N "" -C "deploy@HOSTNAME"
                chown deploy:deploy /home/deploy/.ssh/id_ed25519*
                echo "SSH key generated"
            else
                echo "SSH key already exists"
            fi
            cat /home/deploy/.ssh/id_ed25519.pub
            """.replace("HOSTNAME", srv["hostname"]),
            "Generating SSH key for deploy user",
        )

        # Configure UFW firewall
        conn.run_script(
            """
            ufw --force reset
            ufw default deny incoming
            ufw default allow outgoing
            ufw allow 22/tcp comment 'SSH'
            echo "y" | ufw enable
            ufw status verbose
            """,
            "Configuring UFW firewall (SSH only for now)",
        )

        # Configure fail2ban
        conn.run_script(
            """
            cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
maxretry = 3
bantime = 7200
EOF
            systemctl restart fail2ban
            systemctl enable fail2ban
            fail2ban-client status sshd 2>/dev/null || echo "fail2ban started"
            """,
            "Configuring fail2ban for SSH protection",
        )

        # Enable automatic security updates
        conn.run_script(
            """
            cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF
            cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
            systemctl enable unattended-upgrades
            echo "Automatic security updates configured"
            """,
            "Enabling automatic security updates",
        )

        # Kernel tuning for performance
        conn.run_script(
            """
            cat > /etc/sysctl.d/99-aivo.conf << 'EOF'
# Network performance
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.ip_local_port_range = 1024 65535

# Memory
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.overcommit_memory = 1

# File handles
fs.file-max = 2097152
fs.nr_open = 2097152

# For PostgreSQL (if DB server)
kernel.shmmax = 34359738368
kernel.shmall = 8388608
EOF
            sysctl -p /etc/sysctl.d/99-aivo.conf
            
            # Increase file limits
            cat > /etc/security/limits.d/99-aivo.conf << 'EOF'
* soft nofile 1048576
* hard nofile 1048576
root soft nofile 1048576
root hard nofile 1048576
EOF
            echo "Kernel tuning applied"
            """,
            "Applying kernel tuning for production",
        )

        # Enable 8021q module for VLAN
        conn.run_script(
            """
            modprobe 8021q
            echo "8021q" >> /etc/modules
            echo "VLAN module loaded"
            """,
            "Loading VLAN kernel module for vSwitch",
        )

        print(f"\n[✓] Phase 1 OS Setup complete for {srv['hostname']}")

    finally:
        conn.close()


def phase1_vswitch(server_key):
    """Phase 1.3: Configure vSwitch VLAN interface."""
    srv = SERVERS[server_key]
    conn = ServerConnection(server_key)
    conn.connect()

    try:
        # Detect the main network interface
        _, iface_out, _ = conn.run(
            "ip -o link show | grep -v 'lo\\|docker\\|veth\\|br-\\|flannel\\|cni' | head -1 | awk -F': ' '{print $2}'",
            "Detecting main network interface",
        )
        main_iface = iface_out.strip()
        if not main_iface:
            main_iface = "enp0s31f6"  # Common Hetzner default
        print(f"      Main interface: {main_iface}")

        # Configure VLAN interface
        conn.run_script(
            f"""
            # Check if interfaces.d directory exists and is sourced
            grep -q "source /etc/network/interfaces.d" /etc/network/interfaces 2>/dev/null || \
                echo "source /etc/network/interfaces.d/*" >> /etc/network/interfaces

            cat > /etc/network/interfaces.d/vswitch << 'EOF'
auto {main_iface}.4000
iface {main_iface}.4000 inet static
    address {srv['private_ip']}/24
    vlan-raw-device {main_iface}
    mtu 1400
EOF

            # Bring up the interface
            ifup {main_iface}.4000 2>/dev/null || ip link add link {main_iface} name {main_iface}.4000 type vlan id 4000 && \
                ip addr add {srv['private_ip']}/24 dev {main_iface}.4000 && \
                ip link set {main_iface}.4000 up

            ip addr show {main_iface}.4000
            """,
            f"Configuring vSwitch VLAN interface ({srv['private_ip']})",
        )

        print(f"\n[✓] vSwitch configured for {srv['hostname']} ({srv['private_ip']})")

    finally:
        conn.close()


def phase1_disks(server_key):
    """Phase 1.4: Disk setup."""
    srv = SERVERS[server_key]
    conn = ServerConnection(server_key)
    conn.connect()

    try:
        # Show current disk layout
        conn.run("lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,FSTYPE", "Current disk layout")
        conn.run("df -h | grep -E '^/dev|Filesystem'", "Current mounted filesystems")

        if server_key == "db1":
            conn.run_script(
                """
                # SSD 1 is already at / — create PostgreSQL data directory
                mkdir -p /data/postgres
                
                # Check for second disk
                SECOND_DISK=""
                for disk in sdb sdc nvme1n1 nvme0n1p1; do
                    if [ -b "/dev/$disk" ] && ! mount | grep -q "/dev/$disk"; then
                        SECOND_DISK="/dev/$disk"
                        break
                    fi
                done
                
                if [ -n "$SECOND_DISK" ]; then
                    echo "Found second disk: $SECOND_DISK"
                    # Only format if not already formatted
                    if ! blkid "$SECOND_DISK" | grep -q ext4; then
                        mkfs.ext4 -F "$SECOND_DISK"
                        echo "Formatted $SECOND_DISK as ext4"
                    fi
                    mkdir -p /data/secondary
                    mount "$SECOND_DISK" /data/secondary 2>/dev/null || true
                    grep -q "$SECOND_DISK" /etc/fstab || \
                        echo "$SECOND_DISK /data/secondary ext4 defaults,noatime 0 2" >> /etc/fstab
                    
                    # Create subdirectories on SSD 2
                    mkdir -p /data/secondary/redis
                    mkdir -p /data/secondary/backups
                    mkdir -p /data/secondary/backups/daily
                    mkdir -p /data/secondary/wal-archive
                    
                    # Symlinks
                    ln -sfn /data/secondary/redis /data/redis
                    ln -sfn /data/secondary/backups /data/backups
                    echo "Second disk mounted at /data/secondary"
                else
                    echo "No unmounted second disk found — using single disk layout"
                    mkdir -p /data/secondary/redis /data/secondary/backups/daily /data/secondary/wal-archive
                    ln -sfn /data/secondary/redis /data/redis
                    ln -sfn /data/secondary/backups /data/backups
                fi
                
                ls -la /data/
                df -h /data/secondary 2>/dev/null || df -h /
                """,
                "Setting up DB server disk layout",
            )

        elif server_key == "app1":
            conn.run_script(
                """
                mkdir -p /data/k3s
                
                # Check for second disk
                SECOND_DISK=""
                for disk in nvme1n1 sdb sdc; do
                    if [ -b "/dev/$disk" ] && ! mount | grep -q "/dev/$disk"; then
                        SECOND_DISK="/dev/$disk"
                        break
                    fi
                done
                
                if [ -n "$SECOND_DISK" ]; then
                    echo "Found second disk: $SECOND_DISK"
                    if ! blkid "$SECOND_DISK" | grep -q ext4; then
                        mkfs.ext4 -F "$SECOND_DISK"
                    fi
                    mkdir -p /data/k3s-data
                    mount "$SECOND_DISK" /data/k3s-data 2>/dev/null || true
                    grep -q "$SECOND_DISK" /etc/fstab || \
                        echo "$SECOND_DISK /data/k3s-data ext4 defaults,noatime 0 2" >> /etc/fstab
                    
                    mkdir -p /data/k3s-data/monitoring
                    mkdir -p /data/k3s-data/volumes
                    echo "Second disk mounted at /data/k3s-data"
                else
                    echo "No unmounted second disk — using single disk"
                    mkdir -p /data/k3s-data/monitoring /data/k3s-data/volumes
                fi
                
                ls -la /data/
                """,
                "Setting up App Primary disk layout",
            )

        elif server_key == "app2":
            conn.run_script(
                """
                mkdir -p /data/k3s
                
                # Find unmounted disks
                DISKS=()
                for disk in nvme1n1 nvme2n1 sdb sdc sdd; do
                    if [ -b "/dev/$disk" ] && ! mount | grep -q "/dev/$disk"; then
                        DISKS+=("/dev/$disk")
                    fi
                done
                
                echo "Found ${#DISKS[@]} unmounted disk(s): ${DISKS[*]}"
                
                # Second disk for K3s data
                if [ ${#DISKS[@]} -ge 1 ]; then
                    DISK2="${DISKS[0]}"
                    if ! blkid "$DISK2" | grep -q ext4; then
                        mkfs.ext4 -F "$DISK2"
                    fi
                    mkdir -p /data/k3s-data
                    mount "$DISK2" /data/k3s-data 2>/dev/null || true
                    grep -q "$DISK2" /etc/fstab || \
                        echo "$DISK2 /data/k3s-data ext4 defaults,noatime 0 2" >> /etc/fstab
                    mkdir -p /data/k3s-data/volumes
                fi
                
                # Third disk for MinIO + backups
                if [ ${#DISKS[@]} -ge 2 ]; then
                    DISK3="${DISKS[1]}"
                    if ! blkid "$DISK3" | grep -q ext4; then
                        mkfs.ext4 -F "$DISK3"
                    fi
                    mkdir -p /data/extra
                    mount "$DISK3" /data/extra 2>/dev/null || true
                    grep -q "$DISK3" /etc/fstab || \
                        echo "$DISK3 /data/extra ext4 defaults,noatime 0 2" >> /etc/fstab
                    
                    mkdir -p /data/extra/minio
                    mkdir -p /data/extra/backup-sync
                    mkdir -p /data/extra/wal-sync
                    
                    ln -sfn /data/extra/minio /data/minio
                    ln -sfn /data/extra/backup-sync /data/backup-sync
                    echo "Third disk mounted at /data/extra (MinIO + backups)"
                else
                    echo "No third disk — creating dirs on main disk"
                    mkdir -p /data/extra/minio /data/extra/backup-sync /data/extra/wal-sync
                    ln -sfn /data/extra/minio /data/minio
                    ln -sfn /data/extra/backup-sync /data/backup-sync
                fi
                
                ls -la /data/
                """,
                "Setting up App Secondary disk layout (with MinIO)",
            )

        conn.run("lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,FSTYPE", "Final disk layout")
        print(f"\n[✓] Disk setup complete for {srv['hostname']}")

    finally:
        conn.close()


# ─── Phase 2: Database Setup (Server 1) ───────────────────────────────────────


def phase2_postgresql(creds):
    """Phase 2.1-2.2: Install and configure PostgreSQL 15."""
    conn = ServerConnection("db1")
    conn.connect()

    try:
        conn.run_script(
            """
            # Install PostgreSQL 15
            sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
            wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
            apt-get update -qq
            export DEBIAN_FRONTEND=noninteractive
            apt-get install -y -qq postgresql-15 postgresql-client-15
            echo "PostgreSQL 15 installed"
            """,
            "Installing PostgreSQL 15...",
            timeout=300,
        )

        # Reconfigure for /data/postgres
        conn.run_script(
            """
            systemctl stop postgresql 2>/dev/null || true
            
            # Check if cluster already exists at /data/postgres
            if [ -f /data/postgres/PG_VERSION ]; then
                echo "PostgreSQL cluster already exists at /data/postgres"
            else
                pg_dropcluster 15 main 2>/dev/null || true
                pg_createcluster 15 main -d /data/postgres -- --auth-local=peer --auth-host=scram-sha-256
                echo "PostgreSQL cluster created at /data/postgres"
            fi
            """,
            "Configuring PostgreSQL data directory",
        )

        pg_password = creds["postgres_app_password"]
        repl_password = creds["postgres_repl_password"]

        # Write PostgreSQL configuration
        conn.run_script(
            f"""
            cat > /etc/postgresql/15/main/conf.d/aivo.conf << 'EOF'
# Connection
listen_addresses = '10.0.0.1,127.0.0.1'
port = 5432
max_connections = 500

# Memory (optimized for 128GB RAM, ~32GB for PG)
shared_buffers = 32GB
effective_cache_size = 80GB
work_mem = 64MB
maintenance_work_mem = 2GB
huge_pages = try

# WAL
wal_level = replica
max_wal_senders = 5
wal_keep_size = 2GB
archive_mode = on
archive_command = 'cp %p /data/secondary/wal-archive/%f'

# Checkpoints
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

# Query Planning
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_min_duration_statement = 500
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0

# Autovacuum
autovacuum_max_workers = 4
autovacuum_vacuum_scale_factor = 0.05
autovacuum_analyze_scale_factor = 0.025
EOF
            echo "PostgreSQL configuration written"
            """,
            "Writing PostgreSQL production configuration",
        )

        # Configure pg_hba.conf
        conn.run_script(
            """
            # Add private network access if not already present
            if ! grep -q "aivo_app" /etc/postgresql/15/main/pg_hba.conf; then
                cat >> /etc/postgresql/15/main/pg_hba.conf << 'EOF'

# AIVO K3s cluster access (vSwitch)
host all aivo_app 10.0.0.0/24 scram-sha-256
host replication replicator 10.0.0.0/24 scram-sha-256
EOF
                echo "pg_hba.conf updated"
            else
                echo "pg_hba.conf already configured"
            fi
            """,
            "Configuring PostgreSQL authentication",
        )

        # Create WAL archive directory and start PostgreSQL
        conn.run_script(
            """
            mkdir -p /data/secondary/wal-archive
            chown -R postgres:postgres /data/postgres
            chown postgres:postgres /data/secondary/wal-archive
            systemctl start postgresql
            systemctl enable postgresql
            systemctl is-active postgresql
            """,
            "Starting PostgreSQL",
        )

        # Create databases and users
        conn.run_script(
            f"""
            sudo -u postgres psql << 'EOSQL'
-- Application user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'aivo_app') THEN
        CREATE USER aivo_app WITH PASSWORD '{pg_password}';
    ELSE
        ALTER USER aivo_app WITH PASSWORD '{pg_password}';
    END IF;
END
$$;

-- Create all per-service databases
DO $$
DECLARE
    db_name text;
    databases text[] := ARRAY[
        'aivo_auth', 'aivo_session', 'aivo_content', 'aivo_assessment',
        'aivo_analytics', 'aivo_notification', 'aivo_messaging', 'aivo_billing',
        'aivo_payments', 'aivo_consent', 'aivo_profile', 'aivo_personalization',
        'aivo_goal', 'aivo_focus', 'aivo_parent', 'aivo_baseline',
        'aivo_life_skills', 'aivo_ai_orchestrator',
        'ai_inference', 'training', 'curriculum', 'documents',
        'speech', 'recommendations', 'gateway', 'geolocation'
    ];
BEGIN
    FOREACH db_name IN ARRAY databases LOOP
        IF NOT EXISTS (SELECT FROM pg_database WHERE datname = db_name) THEN
            EXECUTE format('CREATE DATABASE %I OWNER aivo_app', db_name);
            RAISE NOTICE 'Created database: %', db_name;
        ELSE
            RAISE NOTICE 'Database already exists: %', db_name;
        END IF;
    END LOOP;
END
$$;

-- Replication user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'replicator') THEN
        CREATE USER replicator WITH REPLICATION PASSWORD '{repl_password}';
    ELSE
        ALTER USER replicator WITH PASSWORD '{repl_password}';
    END IF;
END
$$;
EOSQL

            # Add extensions to key databases
            for db in aivo_auth aivo_session aivo_content aivo_assessment aivo_analytics aivo_billing aivo_payments; do
                sudo -u postgres psql -d "$db" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS "pgcrypto";' 2>/dev/null
            done
            echo "All databases and users created"
            """,
            "Creating AIVO databases and users (26 databases)...",
            timeout=120,
        )

        # Verify
        conn.run(
            "sudo -u postgres psql -c \"SELECT datname FROM pg_database WHERE datname LIKE 'aivo_%' OR datname IN ('ai_inference','training','curriculum','documents','speech','recommendations','gateway','geolocation') ORDER BY datname;\"",
            "Verifying databases",
        )

        print(f"\n[✓] PostgreSQL 15 installed and configured on aivo-db1")

    finally:
        conn.close()


def phase2_pgbouncer(creds):
    """Phase 2.3: Install and configure PgBouncer."""
    conn = ServerConnection("db1")
    conn.connect()

    try:
        conn.run(
            "export DEBIAN_FRONTEND=noninteractive && apt-get install -y -qq pgbouncer",
            "Installing PgBouncer",
        )

        pg_password = creds["postgres_app_password"]

        conn.run_script(
            f"""
            cat > /etc/pgbouncer/pgbouncer.ini << 'EOF'
[databases]
* = host=127.0.0.1 port=5432

[pgbouncer]
listen_addr = 10.0.0.1
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
server_lifetime = 3600
server_idle_timeout = 600
log_connections = 0
log_disconnections = 0
log_pooler_errors = 1
stats_period = 60
EOF

            cat > /etc/pgbouncer/userlist.txt << 'EOF'
"aivo_app" "{pg_password}"
EOF

            chown postgres:postgres /etc/pgbouncer/userlist.txt
            chmod 640 /etc/pgbouncer/userlist.txt

            systemctl restart pgbouncer
            systemctl enable pgbouncer
            systemctl is-active pgbouncer
            """,
            "Configuring PgBouncer connection pooler",
        )

        print(f"\n[✓] PgBouncer installed and configured")

    finally:
        conn.close()


def phase2_redis(creds):
    """Phase 2.4: Install and configure Redis 7."""
    conn = ServerConnection("db1")
    conn.connect()

    try:
        redis_password = creds["redis_password"]

        conn.run_script(
            """
            curl -fsSL https://packages.redis.io/gpg | gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg 2>/dev/null || true
            echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/redis.list > /dev/null
            apt-get update -qq
            export DEBIAN_FRONTEND=noninteractive
            apt-get install -y -qq redis-server
            echo "Redis installed"
            """,
            "Installing Redis 7...",
            timeout=120,
        )

        conn.run_script(
            f"""
            cat > /etc/redis/redis.conf << 'EOF'
bind 10.0.0.1 127.0.0.1
port 6379
protected-mode yes
requirepass {redis_password}

# Memory
maxmemory 16gb
maxmemory-policy allkeys-lru

# Persistence
dir /data/secondary/redis
dbfilename dump.rdb
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# Performance
tcp-backlog 511
timeout 300
tcp-keepalive 300
io-threads 4
io-threads-do-reads yes

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
EOF

            chown -R redis:redis /data/secondary/redis
            mkdir -p /var/log/redis
            chown redis:redis /var/log/redis
            systemctl restart redis-server
            systemctl enable redis-server
            """,
            "Configuring Redis 7 for production",
        )

        # Verify
        conn.run(
            f"redis-cli -a {redis_password} ping 2>/dev/null",
            "Verifying Redis connection",
        )

        print(f"\n[✓] Redis 7 installed and configured")

    finally:
        conn.close()


def phase2_db_firewall():
    """Phase 2.5: Configure database server firewall."""
    conn = ServerConnection("db1")
    conn.connect()

    try:
        conn.run_script(
            """
            # Allow database services from private network only
            ufw allow from 10.0.0.0/24 to any port 5432 comment 'PostgreSQL'
            ufw allow from 10.0.0.0/24 to any port 6432 comment 'PgBouncer'
            ufw allow from 10.0.0.0/24 to any port 6379 comment 'Redis'
            ufw allow from 10.0.0.0/24 to any port 6443 comment 'K3s API'
            ufw allow from 10.0.0.0/24 to any port 10250 comment 'Kubelet'
            ufw allow from 10.0.0.0/24 to any port 8472/udp comment 'Flannel VXLAN'
            ufw status numbered
            """,
            "Configuring DB server firewall for private network access",
        )

        print(f"\n[✓] Database firewall configured")

    finally:
        conn.close()


def phase2_backups(creds):
    """Phase 2.6: Set up automated backup script."""
    conn = ServerConnection("db1")
    conn.connect()

    try:
        conn.run_script(
            """
            cat > /usr/local/bin/aivo-backup.sh << 'SCRIPT'
#!/bin/bash
set -euo pipefail
BACKUP_DIR="/data/backups/daily"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Dump all databases
for DB in aivo_auth aivo_session aivo_content aivo_assessment aivo_analytics \\
          aivo_notification aivo_messaging aivo_billing aivo_payments aivo_consent \\
          aivo_profile aivo_personalization aivo_goal aivo_focus aivo_parent \\
          aivo_baseline aivo_life_skills aivo_ai_orchestrator \\
          ai_inference training curriculum documents speech recommendations gateway geolocation; do
    pg_dump -U postgres -Fc "$DB" > "$BACKUP_DIR/${DB}_${DATE}.dump" 2>/dev/null || echo "WARN: Failed to dump $DB"
done

# Copy Redis snapshot
cp /data/redis/dump.rdb "$BACKUP_DIR/redis_${DATE}.rdb" 2>/dev/null || echo "WARN: No Redis snapshot"

# Sync to Server 3 (backup mirror) — will work once SSH keys are shared
rsync -az --delete "$BACKUP_DIR/" deploy@10.0.0.3:/data/extra/backup-sync/db/ 2>/dev/null || echo "WARN: rsync to app2 failed (SSH key not yet configured?)"
rsync -az /data/secondary/wal-archive/ deploy@10.0.0.3:/data/extra/wal-sync/ 2>/dev/null || echo "WARN: WAL rsync to app2 failed"

# Prune local backups older than 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete 2>/dev/null || true
find /data/secondary/wal-archive -type f -mtime +14 -delete 2>/dev/null || true

echo "[$(date)] Backup completed: $BACKUP_DIR"
SCRIPT

            chmod +x /usr/local/bin/aivo-backup.sh
            echo "0 3 * * * root /usr/local/bin/aivo-backup.sh >> /var/log/aivo-backup.log 2>&1" > /etc/cron.d/aivo-backup
            chmod 644 /etc/cron.d/aivo-backup
            echo "Backup script installed, scheduled daily at 3 AM UTC"
            """,
            "Installing automated backup script",
        )

        print(f"\n[✓] Automated backups configured")

    finally:
        conn.close()


# ─── Phase 3: K3s Cluster Setup ───────────────────────────────────────────────


def phase3_k3s_server():
    """Phase 3.1: Install K3s server on App Primary."""
    conn = ServerConnection("app1")
    conn.connect()

    try:
        # Detect main interface
        _, iface_out, _ = conn.run(
            "ip -o link show | grep -v 'lo\\|docker\\|veth\\|br-\\|flannel\\|cni' | head -1 | awk -F': ' '{print $2}'",
            "Detecting network interface",
        )
        main_iface = iface_out.strip() or "enp0s31f6"

        # Open firewall ports for K3s
        conn.run_script(
            """
            ufw allow 6443/tcp comment 'K3s API Server'
            ufw allow 10250/tcp comment 'Kubelet'
            ufw allow 8472/udp comment 'Flannel VXLAN'
            ufw allow from 10.0.0.0/24 comment 'vSwitch private network'
            ufw allow 80/tcp comment 'HTTP'
            ufw allow 443/tcp comment 'HTTPS'
            ufw status
            """,
            "Opening firewall ports for K3s",
        )

        conn.run_script(
            f"""
            # Install K3s server
            curl -sfL https://get.k3s.io | sh -s - server \\
              --node-ip=10.0.0.2 \\
              --advertise-address=10.0.0.2 \\
              --flannel-iface={main_iface}.4000 \\
              --tls-san=10.0.0.2 \\
              --tls-san=aivo-app1 \\
              --disable=traefik \\
              --disable=servicelb \\
              --data-dir=/data/k3s \\
              --write-kubeconfig-mode=644 \\
              --kube-apiserver-arg="--default-not-ready-toleration-seconds=30" \\
              --kube-apiserver-arg="--default-unreachable-toleration-seconds=30"
            
            echo "Waiting for K3s to start..."
            sleep 10
            systemctl is-active k3s
            """,
            "Installing K3s server (control plane)...",
            timeout=300,
        )

        # Get node token
        _, token, _ = conn.run(
            "cat /var/lib/rancher/k3s/server/node-token",
            "Retrieving K3s node token",
        )

        # Verify
        conn.run("kubectl get nodes -o wide", "Verifying K3s cluster")

        # Label the node
        conn.run(
            "kubectl label node aivo-app1 role=app --overwrite",
            "Labeling aivo-app1 as app node",
        )

        print(f"\n[✓] K3s server installed on aivo-app1")
        print(f"    Node token: {token[:20]}... (saved for agent joins)")

        return token

    finally:
        conn.close()


def phase3_k3s_agents(token):
    """Phase 3.2: Join K3s agents on DB and App2."""
    # Server 1 (DB) — joins as tainted database node
    conn = ServerConnection("db1")
    conn.connect()

    try:
        _, iface_out, _ = conn.run(
            "ip -o link show | grep -v 'lo\\|docker\\|veth\\|br-\\|flannel\\|cni' | head -1 | awk -F': ' '{print $2}'",
            "Detecting network interface",
        )
        main_iface = iface_out.strip() or "enp0s31f6"

        conn.run_script(
            f"""
            curl -sfL https://get.k3s.io | K3S_URL=https://10.0.0.2:6443 K3S_TOKEN='{token}' sh -s - agent \\
              --node-ip=10.0.0.1 \\
              --flannel-iface={main_iface}.4000 \\
              --node-label="role=database" \\
              --node-taint="role=database:NoSchedule"
            
            echo "Waiting for agent to register..."
            sleep 10
            systemctl is-active k3s-agent
            """,
            "Joining aivo-db1 to K3s cluster (tainted database node)...",
            timeout=180,
        )
        print(f"\n[✓] aivo-db1 joined K3s cluster as database agent")

    finally:
        conn.close()

    # Server 3 (App2)
    conn = ServerConnection("app2")
    conn.connect()

    try:
        _, iface_out, _ = conn.run(
            "ip -o link show | grep -v 'lo\\|docker\\|veth\\|br-\\|flannel\\|cni' | head -1 | awk -F': ' '{print $2}'",
            "Detecting network interface",
        )
        main_iface = iface_out.strip() or "enp0s31f6"

        # Open firewall ports
        conn.run_script(
            """
            ufw allow from 10.0.0.0/24 comment 'vSwitch private network'
            ufw allow 80/tcp comment 'HTTP'
            ufw allow 443/tcp comment 'HTTPS'
            ufw allow 10250/tcp comment 'Kubelet'
            ufw allow 8472/udp comment 'Flannel VXLAN'
            """,
            "Opening firewall ports for K3s agent",
        )

        conn.run_script(
            f"""
            curl -sfL https://get.k3s.io | K3S_URL=https://10.0.0.2:6443 K3S_TOKEN='{token}' sh -s - agent \\
              --node-ip=10.0.0.3 \\
              --flannel-iface={main_iface}.4000 \\
              --data-dir=/data/k3s \\
              --node-label="role=app"
            
            echo "Waiting for agent to register..."
            sleep 10
            systemctl is-active k3s-agent
            """,
            "Joining aivo-app2 to K3s cluster...",
            timeout=180,
        )
        print(f"\n[✓] aivo-app2 joined K3s cluster as app agent")

    finally:
        conn.close()

    # Verify from control plane
    conn = ServerConnection("app1")
    conn.connect()
    try:
        conn.run("kubectl get nodes -o wide", "Verifying all nodes in cluster")
    finally:
        conn.close()


def phase3_ingress():
    """Phase 3.4-3.5: Install Ingress NGINX and cert-manager."""
    conn = ServerConnection("app1")
    conn.connect()

    try:
        # Install Ingress NGINX
        conn.run_script(
            """
            kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.5/deploy/static/provider/baremetal/deploy.yaml
            
            echo "Waiting for ingress-nginx to start..."
            sleep 30
            kubectl -n ingress-nginx wait --for=condition=Available deployment/ingress-nginx-controller --timeout=120s 2>/dev/null || echo "Still starting..."
            
            # Patch to use host network
            kubectl -n ingress-nginx patch deployment ingress-nginx-controller \\
              --type='json' \\
              -p='[{"op":"add","path":"/spec/template/spec/hostNetwork","value":true},
                   {"op":"replace","path":"/spec/template/spec/containers/0/ports/0/containerPort","value":80},
                   {"op":"replace","path":"/spec/template/spec/containers/0/ports/1/containerPort","value":443}]'
            
            # Ensure it runs on app nodes only
            kubectl -n ingress-nginx patch deployment ingress-nginx-controller \\
              --type='json' \\
              -p='[{"op":"add","path":"/spec/template/spec/tolerations","value":[]},
                   {"op":"add","path":"/spec/template/spec/nodeSelector","value":{"role":"app"}}]'
            
            echo "Ingress NGINX configured"
            """,
            "Installing and configuring Ingress NGINX...",
            timeout=180,
        )

        # Install cert-manager
        conn.run_script(
            """
            kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.yaml
            
            echo "Waiting for cert-manager..."
            sleep 30
            kubectl wait --for=condition=Available deployment --all -n cert-manager --timeout=120s 2>/dev/null || echo "Still starting..."
            
            # Create Let's Encrypt issuer
            cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@aivo.ai
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
            echo "cert-manager and Let's Encrypt issuer configured"
            """,
            "Installing cert-manager with Let's Encrypt...",
            timeout=180,
        )

        # Install Helm
        conn.run_script(
            """
            if ! command -v helm &>/dev/null; then
                curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
                echo "Helm installed"
            else
                echo "Helm already installed"
                helm version --short
            fi
            """,
            "Installing Helm",
        )

        print(f"\n[✓] Ingress NGINX, cert-manager, and Helm installed")

    finally:
        conn.close()


# ─── Phase 9: MinIO ───────────────────────────────────────────────────────────


def phase9_minio(creds):
    """Phase 9.1: Install MinIO on Server 3."""
    conn = ServerConnection("app2")
    conn.connect()

    try:
        minio_password = creds["minio_password"]

        conn.run_script(
            f"""
            # Install MinIO
            if ! command -v minio &>/dev/null; then
                wget -q https://dl.min.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio
                chmod +x /usr/local/bin/minio
                echo "MinIO server installed"
            else
                echo "MinIO already installed"
            fi
            
            # Install mc (MinIO client)
            if ! command -v mc &>/dev/null; then
                wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
                chmod +x /usr/local/bin/mc
                echo "MinIO client installed"
            else
                echo "MinIO client already installed"
            fi
            
            # Ensure data dir exists and is owned by deploy
            mkdir -p /data/extra/minio
            chown -R deploy:deploy /data/extra/minio
            
            # Create systemd service
            cat > /etc/systemd/system/minio.service << 'EOF'
[Unit]
Description=MinIO Object Storage
After=network.target

[Service]
User=deploy
Group=deploy
ExecStart=/usr/local/bin/minio server /data/extra/minio --console-address ":9001" --address ":9000"
Environment="MINIO_ROOT_USER=aivo-admin"
Environment="MINIO_ROOT_PASSWORD={minio_password}"
Restart=always
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

            systemctl daemon-reload
            systemctl start minio
            systemctl enable minio
            sleep 3
            systemctl is-active minio
            """,
            "Installing and configuring MinIO...",
            timeout=120,
        )

        # Create buckets
        conn.run_script(
            f"""
            mc alias set aivo http://10.0.0.3:9000 aivo-admin '{minio_password}' 2>/dev/null || true
            
            for bucket in content-assets user-uploads backups exports static-assets ml-models research-data; do
                mc mb aivo/$bucket 2>/dev/null || echo "Bucket $bucket already exists"
            done
            
            mc ls aivo/
            """,
            "Creating MinIO buckets",
        )

        # Open MinIO port on private network only
        conn.run_script(
            """
            ufw allow from 10.0.0.0/24 to any port 9000 comment 'MinIO API'
            ufw allow from 10.0.0.0/24 to any port 9001 comment 'MinIO Console'
            """,
            "Opening firewall for MinIO (private network only)",
        )

        print(f"\n[✓] MinIO installed on aivo-app2 with buckets created")

    finally:
        conn.close()


# ─── Phase 6: Monitoring ──────────────────────────────────────────────────────


def phase6_monitoring(creds):
    """Phase 6: Deploy monitoring stack."""
    conn = ServerConnection("app1")
    conn.connect()

    try:
        grafana_password = creds["grafana_password"]

        conn.run_script(
            f"""
            # Add Helm repos
            helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
            helm repo add grafana https://grafana.github.io/helm-charts 2>/dev/null || true
            helm repo update
            
            # Create monitoring namespace
            kubectl create namespace aivo-monitoring 2>/dev/null || true
            
            # Install Prometheus + Grafana stack
            helm install monitoring prometheus-community/kube-prometheus-stack \\
              --namespace aivo-monitoring \\
              --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \\
              --set grafana.persistence.enabled=true \\
              --set grafana.persistence.size=10Gi \\
              --set grafana.adminPassword='{grafana_password}' \\
              --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.resources.requests.storage=5Gi \\
              --wait --timeout=300s 2>/dev/null || echo "Monitoring already installed or still installing..."
            
            # Install Loki for logs
            helm install loki grafana/loki-stack \\
              --namespace aivo-monitoring \\
              --set loki.persistence.enabled=true \\
              --set loki.persistence.size=50Gi \\
              --set promtail.enabled=true \\
              --wait --timeout=180s 2>/dev/null || echo "Loki already installed or still installing..."
            
            kubectl -n aivo-monitoring get pods
            """,
            "Deploying Prometheus + Grafana + Loki monitoring stack...",
            timeout=600,
        )

        print(f"\n[✓] Monitoring stack deployed")

    finally:
        conn.close()


# ─── Cross-server SSH key sharing ──────────────────────────────────────────────


def share_ssh_keys():
    """Share deploy user SSH keys between all servers for inter-server rsync."""
    pubkeys = {}

    # Collect public keys from all servers
    for key in SERVERS:
        conn = ServerConnection(key)
        conn.connect()
        try:
            _, pubkey, _ = conn.run(
                "cat /home/deploy/.ssh/id_ed25519.pub",
                f"Collecting SSH pubkey from {SERVERS[key]['hostname']}",
            )
            pubkeys[key] = pubkey.strip()
        finally:
            conn.close()

    # Distribute all public keys to all servers
    all_keys = "\n".join(pubkeys.values())
    for key in SERVERS:
        conn = ServerConnection(key)
        conn.connect()
        try:
            conn.run_script(
                f"""
                echo '{all_keys}' > /home/deploy/.ssh/authorized_keys
                chmod 600 /home/deploy/.ssh/authorized_keys
                chown deploy:deploy /home/deploy/.ssh/authorized_keys
                
                # Also add to root's authorized_keys for now
                mkdir -p /root/.ssh
                echo '{all_keys}' >> /root/.ssh/authorized_keys
                sort -u /root/.ssh/authorized_keys -o /root/.ssh/authorized_keys
                
                # Disable strict host checking for private network
                cat > /home/deploy/.ssh/config << 'EOF'
Host 10.0.0.*
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
Host aivo-*
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF
                chown deploy:deploy /home/deploy/.ssh/config
                chmod 600 /home/deploy/.ssh/config
                echo "SSH keys distributed to {SERVERS[key]['hostname']}"
                """,
                f"Distributing SSH keys to {SERVERS[key]['hostname']}",
            )
        finally:
            conn.close()

    print(f"\n[✓] SSH keys shared between all servers for deploy user")


# ─── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="AIVO Hetzner Server Provisioning")
    parser.add_argument(
        "--phase",
        required=True,
        choices=["1", "1.3", "1.4", "2", "3", "6", "9", "keys", "all", "verify"],
        help="Phase to run: 1=OS Setup, 1.3=vSwitch, 1.4=Disks, 2=Database, 3=K3s, 6=Monitoring, 9=MinIO, keys=SSH keys, all=Everything, verify=Check status",
    )
    parser.add_argument(
        "--server",
        choices=["db1", "app1", "app2", "all"],
        default="all",
        help="Target server (default: all)",
    )
    args = parser.parse_args()

    creds = load_or_generate_credentials()

    if args.phase == "verify":
        # Quick health check on all servers
        for key in SERVERS:
            conn = ServerConnection(key)
            conn.connect()
            try:
                conn.run("hostname && uptime", "Status")
                conn.run("df -h / | tail -1", "Root disk")
                conn.run("free -h | head -2", "Memory")
            finally:
                conn.close()
        return

    if args.phase in ("1", "all"):
        print("\n" + "=" * 60)
        print("PHASE 1: OS Setup")
        print("=" * 60)
        servers = [args.server] if args.server != "all" else ["db1", "app1", "app2"]
        for s in servers:
            phase1_os_setup(s)

    if args.phase in ("1.3", "all"):
        print("\n" + "=" * 60)
        print("PHASE 1.3: vSwitch Configuration")
        print("=" * 60)
        servers = [args.server] if args.server != "all" else ["db1", "app1", "app2"]
        for s in servers:
            phase1_vswitch(s)

    if args.phase in ("1.4", "all"):
        print("\n" + "=" * 60)
        print("PHASE 1.4: Disk Setup")
        print("=" * 60)
        servers = [args.server] if args.server != "all" else ["db1", "app1", "app2"]
        for s in servers:
            phase1_disks(s)

    if args.phase in ("keys", "all"):
        print("\n" + "=" * 60)
        print("SSH Key Sharing")
        print("=" * 60)
        share_ssh_keys()

    if args.phase in ("2", "all"):
        print("\n" + "=" * 60)
        print("PHASE 2: Database Setup (aivo-db1)")
        print("=" * 60)
        phase2_postgresql(creds)
        phase2_pgbouncer(creds)
        phase2_redis(creds)
        phase2_db_firewall()
        phase2_backups(creds)

    if args.phase in ("3", "all"):
        print("\n" + "=" * 60)
        print("PHASE 3: K3s Cluster Setup")
        print("=" * 60)
        token = phase3_k3s_server()
        phase3_k3s_agents(token)
        phase3_ingress()

    if args.phase in ("9", "all"):
        print("\n" + "=" * 60)
        print("PHASE 9: MinIO Object Storage")
        print("=" * 60)
        phase9_minio(creds)

    if args.phase in ("6", "all"):
        print("\n" + "=" * 60)
        print("PHASE 6: Monitoring Stack")
        print("=" * 60)
        phase6_monitoring(creds)

    print("\n" + "=" * 60)
    print("PROVISIONING COMPLETE")
    print("=" * 60)
    print(f"\nCredentials saved to: {CREDENTIALS_FILE}")
    print("⚠️  IMPORTANT: Back up credentials.json securely!")


if __name__ == "__main__":
    main()
