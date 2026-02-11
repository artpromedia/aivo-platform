#!/usr/bin/env python3
"""Get actual crash logs from crashing/not-ready pods."""
import paramiko

APP1 = {"host": "95.216.245.40", "password": "2R2ht?gALF7%L%"}

def ssh_exec(client, cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(APP1["host"], username="root", password=APP1["password"], timeout=10)

    problem_svcs = ["assessment-svc", "analytics-svc", "parent-svc", 
                    "goal-svc", "notify-svc", "profile-svc", 
                    "personalization-svc", "payments-svc"]
    
    for svc in problem_svcs:
        print("=" * 70)
        print(f"  {svc}")
        print("=" * 70)
        
        # Get all pods for this service
        out, _ = ssh_exec(c, f"kubectl get pods -n aivo-prod -l app={svc} -o custom-columns='NAME:.metadata.name,STATUS:.status.phase,RESTARTS:.status.containerStatuses[0].restartCount,REASON:.status.containerStatuses[0].state..reason' --no-headers")
        print(f"  Pods: {out.strip()}")
        
        # Get pod names
        pods_out, _ = ssh_exec(c, f"kubectl get pods -n aivo-prod -l app={svc} -o jsonpath='{{range .items[*]}}{{.metadata.name}} {{end}}'")
        pods = pods_out.strip().split()
        
        if pods:
            pod = pods[0]  # use first pod
            # Try current logs
            logs, lerr = ssh_exec(c, f"kubectl logs -n aivo-prod {pod} --tail=40 2>&1")
            if logs.strip():
                print(f"  Current logs ({pod}):")
                print(logs[-2000:])  # last 2000 chars
            else:
                # Try previous container
                logs, lerr = ssh_exec(c, f"kubectl logs -n aivo-prod {pod} --previous --tail=40 2>&1")
                if logs.strip():
                    print(f"  Previous logs ({pod}):")
                    print(logs[-2000:])
                else:
                    print(f"  No logs from {pod}")
                    # Try describe
                    desc, _ = ssh_exec(c, f"kubectl describe pod -n aivo-prod {pod} 2>&1 | tail -30")
                    print(f"  Describe (last 30):\n{desc}")
        print()

    c.close()

if __name__ == "__main__":
    main()
