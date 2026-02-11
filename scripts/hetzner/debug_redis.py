#!/usr/bin/env python3
"""Debug and fix Redis on aivo-db1."""

import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("95.217.76.42", username="root", password="Ebmx9V_r?a38NM")

def run(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

# Check redis log
print("=== REDIS LOG ===")
out, _ = run("cat /var/log/redis/redis-server.log 2>/dev/null || echo 'no log'")
print(out[-2000:] if len(out) > 2000 else out)

# Check redis config issues
print("\n=== REDIS CONFIG TEST ===")
out, err = run("redis-server --test-memory 1 2>&1; echo EXIT:$?")
print(out)

# Try starting manually to see errors
print("\n=== MANUAL START ===")
out, err = run("redis-server /etc/redis/redis.conf --daemonize no 2>&1 & sleep 2; kill %1 2>/dev/null; wait 2>/dev/null")
print(f"stdout: {out}")
print(f"stderr: {err}")

# Check if there's a systemd service override
print("\n=== SYSTEMD SERVICE FILE ===")
out, _ = run("systemctl cat redis-server.service 2>/dev/null | head -30")
print(out)

# Check data directory
print("\n=== DATA DIRECTORY ===")
out, _ = run("ls -la /data/secondary/redis/ 2>/dev/null")
print(out)

# Check redis-server version
print("\n=== REDIS VERSION ===")
out, _ = run("redis-server --version")
print(out)

# Check if the password special chars are causing config parse errors
print("\n=== CONFIG PARSE TEST ===")
out, err = run("redis-server /etc/redis/redis.conf --test-config 2>&1 || echo 'FAILED'")
print(f"out: {out}")
print(f"err: {err}")

# Full config dump
print("\n=== FULL REDIS CONF ===")
out, _ = run("cat /etc/redis/redis.conf")
print(out)

ssh.close()
