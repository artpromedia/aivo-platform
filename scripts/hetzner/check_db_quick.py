#!/usr/bin/env python3
"""Quick check: raw DATABASE_URL and pod connectivity."""
import paramiko, base64

APP1 = {"host": "95.216.245.40", "password": "2R2ht?gALF7%L%"}

def ssh_exec(client, cmd, timeout=15):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    return stdout.read().decode("utf-8", errors="replace"), stderr.read().decode("utf-8", errors="replace")

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(APP1["host"], username="root", password=APP1["password"], timeout=10)

    # Get raw DATABASE_URL for auth-svc (working) vs goal-svc (failing)
    for svc in ["auth-svc", "goal-svc"]:
        out, _ = ssh_exec(c, f"kubectl get secret -n aivo-prod {svc}-secrets -o jsonpath='{{.data.database-url}}'")
        if out:
            decoded = base64.b64decode(out).decode()
            print(f"{svc} DATABASE_URL: {decoded}")
    
    # Check env var source in deployment
    for svc in ["auth-svc", "goal-svc"]:
        out, _ = ssh_exec(c, f"kubectl get deployment -n aivo-prod {svc} -o jsonpath='{{.spec.template.spec.containers[0].envFrom}}' 2>/dev/null")
        print(f"\n{svc} envFrom: {out}")
        out, _ = ssh_exec(c, f"kubectl get deployment -n aivo-prod {svc} -o json 2>/dev/null | grep -A5 DATABASE_URL")
        print(f"{svc} DATABASE_URL env spec:\n{out}")
    
    # Check actual DATABASE_URL inside pods
    for svc_label in ["auth-svc", "goal-svc"]:
        out, _ = ssh_exec(c, f"kubectl get pods -n aivo-prod -l app.kubernetes.io/name={svc_label} -o jsonpath='{{.items[0].metadata.name}}'")
        pod = out.strip()
        if pod:
            out2, _ = ssh_exec(c, f"kubectl exec -n aivo-prod {pod} -- printenv DATABASE_URL 2>&1")
            print(f"\n{svc_label} pod ({pod}) DATABASE_URL: {out2.strip()}")
    
    c.close()

if __name__ == "__main__":
    main()
