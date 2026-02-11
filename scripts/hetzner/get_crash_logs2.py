#!/usr/bin/env python3
"""Get crash logs using correct label selectors."""
import paramiko, time

def ssh_exec(client, cmd, timeout=60):
    for attempt in range(3):
        try:
            stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
            return stdout.read().decode().strip()
        except Exception as e:
            if attempt < 2:
                time.sleep(3)
            else:
                return f"ERROR: {e}"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("95.216.245.40", username="root", password="2R2ht?gALF7%L%", timeout=30)

# First check what labels pods actually have
print("=== SAMPLE POD LABELS ===")
result = ssh_exec(client, "kubectl get pods -n aivo-prod -o custom-columns='NAME:.metadata.name,LABELS:.metadata.labels' --no-headers 2>/dev/null | head -5")
print(result)

# Check deployment labels
print("\n=== DEPLOYMENT SELECTORS ===")
result = ssh_exec(client, "kubectl get deployments -n aivo-prod -o custom-columns='NAME:.metadata.name,SELECTOR:.spec.selector.matchLabels' --no-headers 2>/dev/null | head -20")
print(result)

# Try getting logs by pod name directly
print("\n=== CRASH LOGS BY POD NAME ===")
# Get a crashing pod for each service
result = ssh_exec(client, "kubectl get pods -n aivo-prod --no-headers -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount' 2>/dev/null | grep false | head -18")
print(result)

# Get logs from one pod per service
seen = set()
for line in result.split('\n'):
    parts = line.split()
    if not parts:
        continue
    pod = parts[0]
    # Extract service name
    svc = '-'.join(pod.rsplit('-', 2)[0].split('-')[:-1]) if pod.count('-') > 2 else pod
    # Simpler: just get everything before the last hash segment
    # auth-svc-5f65bdcc87-snvg7 -> auth-svc
    segments = pod.split('-')
    # Find where the hash starts (usually last 2 segments)
    svc = '-'.join(segments[:-2])
    if svc in seen:
        continue
    seen.add(svc)
    log = ssh_exec(client, f"kubectl logs -n aivo-prod {pod} --tail=5 2>&1 | tail -5")
    err = ""
    for l in log.split('\n'):
        ll = l.lower()
        if any(k in ll for k in ['error', 'cannot', 'missing', 'not provided', 'not found', 'required', 'no such', 'throw']):
            err = l.strip()
            break
    if not err and log:
        err = log.split('\n')[-1].strip()
    print(f"\n  {svc}: {err[:250]}")

client.close()
