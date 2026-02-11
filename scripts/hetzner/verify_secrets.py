#!/usr/bin/env python3
"""Verify secrets and pod status on the cluster."""
import paramiko, json

APP1 = {"host": "95.216.245.40", "user": "root", "password": "2R2ht?gALF7%L%"}

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(APP1["host"], username=APP1["user"], password=APP1["password"], timeout=30, banner_timeout=30)

def run(cmd):
    _, stdout, stderr = ssh.exec_command(f"KUBECONFIG=/root/.kube/config {cmd}", timeout=30)
    return stdout.read().decode().strip()

print("=" * 60)
print("SECRETS IN aivo-prod NAMESPACE")
print("=" * 60)
print(run("kubectl -n aivo-prod get secrets -o custom-columns=NAME:.metadata.name,TYPE:.type --no-headers"))

print()
print("=" * 60)
print("POD STATUS")
print("=" * 60)
print(run("kubectl -n aivo-prod get pods --no-headers"))

print()
print("=" * 60)
print("LLM SECRET KEYS CHECK")
print("=" * 60)
out = run("kubectl -n aivo-prod get secret llm-provider-secrets -o jsonpath='{.data}' 2>/dev/null")
if out:
    data = json.loads(out.strip("'"))
    for k in data:
        import base64
        val = base64.b64decode(data[k]).decode()
        masked = val[:8] + "..." + val[-4:] if len(val) > 16 else "***"
        print(f"  {k}: {masked}")

print()
print("=" * 60)
print("BILLING SECRET KEYS CHECK")
print("=" * 60)
out = run("kubectl -n aivo-prod get secret billing-svc-secrets -o jsonpath='{.data}' 2>/dev/null")
if out:
    data = json.loads(out.strip("'"))
    for k in data:
        import base64
        val = base64.b64decode(data[k]).decode()
        masked = val[:10] + "..." + val[-4:] if len(val) > 18 else "***"
        print(f"  {k}: {masked}")

ssh.close()
print("\n✅ Verification complete")
