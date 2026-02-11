#!/usr/bin/env python3
"""Check the actual raw DATABASE_URL values (including password) for connectivity issues."""
import paramiko
import base64

APP1 = {"host": "95.216.245.40", "password": "2R2ht?gALF7%L%"}

def ssh_exec(client, cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    return stdout.read().decode("utf-8", errors="replace"), stderr.read().decode("utf-8", errors="replace")

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(APP1["host"], username="root", password=APP1["password"], timeout=10)

    # Get raw DATABASE_URL for working vs failing services
    svcs = {
        "working": ["auth-svc", "billing-svc", "baseline-svc", "content-svc", "session-svc"],
        "failing": ["goal-svc", "notify-svc", "profile-svc", "payments-svc", "assessment-svc"]
    }
    
    for status, svc_list in svcs.items():
        print(f"\n{'=' * 70}")
        print(f"{status.upper()} SERVICES - RAW DATABASE_URL:")
        print(f"{'=' * 70}")
        for svc in svc_list:
            out, _ = ssh_exec(c, f"kubectl get secret -n aivo-prod {svc}-secrets -o jsonpath='{{.data.database-url}}'")
            if out:
                decoded = base64.b64decode(out).decode()
                print(f"  {svc}: {decoded}")
            else:
                out, _ = ssh_exec(c, f"kubectl get secret -n aivo-prod {svc}-secrets -o jsonpath='{{.data}}'")
                print(f"  {svc}: keys={out[:200]}")

    # Check env vars in the deployment specs for failing services
    print(f"\n{'=' * 70}")
    print("DEPLOYMENT ENV VARS (DATABASE_URL source):")
    print(f"{'=' * 70}")
    for svc in ["goal-svc", "assessment-svc", "auth-svc"]:
        out, _ = ssh_exec(c, f"""kubectl get deployment -n aivo-prod {svc} -o jsonpath='{{.spec.template.spec.containers[0].env}}' 2>/dev/null""")
        # Filter for DATABASE_URL
        if "DATABASE_URL" in out:
            import json
            try:
                envs = json.loads(out)
                for env in envs:
                    if env.get("name") == "DATABASE_URL":
                        print(f"  {svc} DATABASE_URL source: {json.dumps(env, indent=2)}")
                        break
            except:
                # Find the DATABASE_URL entry manually  
                idx = out.find("DATABASE_URL")
                print(f"  {svc}: ...{out[max(0,idx-50):idx+200]}...")
        else:
            print(f"  {svc}: DATABASE_URL NOT IN ENV (checking envFrom)")
            out2, _ = ssh_exec(c, f"""kubectl get deployment -n aivo-prod {svc} -o jsonpath='{{.spec.template.spec.containers[0].envFrom}}'""")
            print(f"    envFrom: {out2[:200]}")

    # Test connection FROM a failing pod 
    print(f"\n{'=' * 70}")
    print("CONNECTION TEST FROM FAILING POD:")
    print(f"{'=' * 70}")
    out, _ = ssh_exec(c, "kubectl get pods -n aivo-prod -l app.kubernetes.io/name=goal-svc -o jsonpath='{.items[0].metadata.name}'")
    goal_pod = out.strip()
    if goal_pod:
        # Check if the pod can reach PgBouncer
        out, _ = ssh_exec(c, f"kubectl exec -n aivo-prod {goal_pod} -- nc -zvw3 10.0.0.1 6432 2>&1")
        print(f"  nc test from goal-svc pod: {out.strip()}")
        
        # Check what env vars are set
        out, _ = ssh_exec(c, f"kubectl exec -n aivo-prod {goal_pod} -- printenv DATABASE_URL 2>&1")
        print(f"  DATABASE_URL in pod: {out.strip()}")
        
    c.close()

if __name__ == "__main__":
    main()
