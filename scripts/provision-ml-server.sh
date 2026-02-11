#!/bin/bash
set -euo pipefail

echo "=== Setting timezone ==="
timedatectl set-timezone UTC

echo "=== Updating system ==="
export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y

echo "=== Installing essentials ==="
apt install -y curl wget git htop iotop net-tools \
  ufw fail2ban unattended-upgrades apt-transport-https \
  ca-certificates gnupg lsb-release jq vlan

echo "=== Creating deploy user ==="
if ! id deploy &>/dev/null; then
  adduser --disabled-password --gecos "" deploy
  usermod -aG sudo deploy
fi
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
chmod 440 /etc/sudoers.d/deploy

# Copy SSH keys to deploy user
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

echo "=== SSH hardening ==="
sed -i 's/#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

echo "=== Configuring firewall ==="
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow from 10.0.0.0/24 to any port 6443 comment 'K3s API'
ufw allow from 10.0.0.0/24 to any port 10250 comment 'Kubelet'
ufw allow from 10.0.0.0/24 to any port 8472/udp comment 'Flannel VXLAN'
ufw allow from 10.0.0.0/24 comment 'vSwitch private network'
echo "y" | ufw enable

echo "=== Setting up K3s directory ==="
mkdir -p /data/k3s

echo "=== Setting up ML data disk (nvme1n1) ==="
if ! mount | grep -q /data/ml; then
  mkfs.ext4 -F /dev/nvme1n1
  mkdir -p /data/ml
  mount /dev/nvme1n1 /data/ml
  if ! grep -q '/data/ml' /etc/fstab; then
    echo '/dev/nvme1n1 /data/ml ext4 defaults,noatime 0 2' >> /etc/fstab
  fi
fi

# ML subdirectories
mkdir -p /data/ml/models
mkdir -p /data/ml/lora-adapters
mkdir -p /data/ml/volumes
mkdir -p /data/ml/tmp

echo "=== Loading 8021q VLAN kernel module ==="
modprobe 8021q
if ! grep -q 8021q /etc/modules; then
  echo "8021q" >> /etc/modules
fi

echo ""
echo "========================================="
echo "  PROVISION COMPLETE"
echo "========================================="
echo ""
hostname
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2)"
echo "CPU: $(lscpu | grep 'Model name' | sed 's/.*: *//')"
echo "RAM: $(free -h | awk '/Mem:/ {print $2}')"
echo ""
echo "Disk layout:"
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT
echo ""
echo "Firewall status:"
ufw status numbered
echo ""
echo "NEXT STEP: Add this server to the Hetzner vSwitch in Robot,"
echo "then configure the VLAN interface."
