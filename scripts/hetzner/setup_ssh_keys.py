"""
Copy SSH public key to all 3 Hetzner servers so we can SSH without passwords.
"""
import paramiko
import os

# Read local public key
pub_key_path = os.path.expanduser("~/.ssh/id_ed25519.pub")
with open(pub_key_path, 'r') as f:
    pub_key = f.read().strip()

print(f"Public key: {pub_key[:50]}...")

servers = [
    {"host": "95.217.76.42",  "name": "db1",  "password": "Ebmx9V_r?a38NM"},
    {"host": "95.216.245.40", "name": "app1", "password": "2R2ht?gALF7%L%"},
    {"host": "95.217.195.144","name": "app2", "password": "j?A6M9rKcMHRGT"},
]

for s in servers:
    print(f"\n--- {s['name']} ({s['host']}) ---")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(s['host'], username='root', password=s['password'], timeout=15)
        
        # Ensure .ssh dir exists and add key if not already present
        cmd = f"""
mkdir -p ~/.ssh && chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys
grep -qF '{pub_key}' ~/.ssh/authorized_keys 2>/dev/null || echo '{pub_key}' >> ~/.ssh/authorized_keys
echo "Key installed. Lines in authorized_keys: $(wc -l < ~/.ssh/authorized_keys)"
"""
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print(stdout.read().decode().strip())
        err = stderr.read().decode().strip()
        if err:
            print(f"  stderr: {err}")
        ssh.close()
        print(f"  ✅ Done")
    except Exception as e:
        print(f"  ❌ Error: {e}")

print("\n=== Now test passwordless SSH ===")
print("Run: ssh root@95.216.245.40 hostname")
