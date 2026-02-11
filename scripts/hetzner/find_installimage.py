#!/usr/bin/env python3
"""Quick diagnostic to find installimage on rescue mode servers."""
import paramiko

SERVERS = {
    "db1": {"public_ip": "95.217.76.42", "password": "Ebmx9V_r?a38NM"},
    "app1": {"public_ip": "95.216.245.40", "password": "2R2ht?gALF7%L%"},
    "app2": {"public_ip": "95.217.195.144", "password": "j?A6M9rKcMHRGT"},
}

def run(client, cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    stdout.channel.recv_exit_status()
    return stdout.read().decode().strip()

srv = SERVERS["db1"]
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(srv["public_ip"], username="root", password=srv["password"], 
               timeout=30, look_for_keys=False, allow_agent=False)

print("PATH:", run(client, "echo $PATH"))
print("\nSearching for installimage:")
print(run(client, "which installimage 2>/dev/null || find / -name 'installimage' -type f 2>/dev/null | head -5"))
print("\nSearching in common locations:")
print(run(client, "ls -la /root/.oldroot/nfs/install/installimage 2>/dev/null; ls -la /usr/local/bin/installimage 2>/dev/null; ls -la /opt/hetzner/installimage 2>/dev/null"))
print("\nChecking rescue environment:")
print(run(client, "ls /root/.oldroot/nfs/install/ 2>/dev/null | head -20"))
print("\nenv PATH:")
print(run(client, "env | grep PATH"))

client.close()
