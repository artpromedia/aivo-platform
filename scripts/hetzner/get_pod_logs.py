#!/usr/bin/env python3
"""Get pod labels and logs from all pods in aivo-prod."""
import paramiko

APP1 = {"host": "95.216.245.40", "password": "2R2ht?gALF7%L%"}

def ssh_exec(client, cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    return stdout.read().decode("utf-8", errors="replace"), stderr.read().decode("utf-8", errors="replace")

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(APP1["host"], username="root", password=APP1["password"], timeout=10)

    # Get all pods with their labels
    out, _ = ssh_exec(c, "kubectl get pods -n aivo-prod --show-labels --no-headers")
    print("ALL PODS WITH LABELS:")
    print(out[:3000])
    
    print("\n" + "=" * 70)
    
    # Get the not-ready/crashing pods
    out, _ = ssh_exec(c, """kubectl get pods -n aivo-prod --field-selector=status.phase!=Succeeded -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount' --no-headers | grep -E 'false|<none>'""")
    print("NOT-READY PODS:")
    print(out)
    
    # Get logs from specific crashing pods by name
    problem_pods = []
    for line in out.strip().split("\n"):
        if line.strip():
            pod_name = line.split()[0]
            problem_pods.append(pod_name)
    
    # Limit to unique services, pick one pod per service
    seen = set()
    for pod in problem_pods:
        # Extract service name (remove hash suffixes)
        parts = pod.rsplit("-", 2)
        svc = parts[0] if len(parts) >= 3 else pod
        if svc in seen:
            continue
        seen.add(svc)
        
        print(f"\n{'=' * 70}")
        print(f"LOGS: {pod}")
        print(f"{'=' * 70}")
        logs, lerr = ssh_exec(c, f"kubectl logs -n aivo-prod {pod} --tail=50 2>&1")
        if logs.strip():
            print(logs[-2000:])
        else:
            logs, _ = ssh_exec(c, f"kubectl logs -n aivo-prod {pod} --previous --tail=50 2>&1")
            if logs.strip():
                print(f"(previous container):\n{logs[-2000:]}")
            else:
                print("(no logs - checking events)")
                desc, _ = ssh_exec(c, f"kubectl describe pod -n aivo-prod {pod} 2>&1 | grep -A 20 'Events:'")
                print(desc[:1500])

    c.close()

if __name__ == "__main__":
    main()
