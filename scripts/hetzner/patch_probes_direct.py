"""
Use kubectl patch to directly update readiness probes on existing deployments.
This avoids the selector immutability issue with kustomize.
"""
import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out if out else err

# Services that need readiness probe changed to tcpSocket
tcp_probe_services = [
    'auth-svc', 'session-svc', 'baseline-svc', 'consent-svc',
    'content-svc', 'messaging-svc', 'focus-svc'
]

# Patch readiness probe to tcpSocket
tcp_patch = json.dumps({
    "spec": {
        "template": {
            "spec": {
                "containers": [{
                    "name": "PLACEHOLDER",
                    "readinessProbe": {
                        "tcpSocket": {"port": 3000},
                        "httpGet": None,
                        "initialDelaySeconds": 5,
                        "periodSeconds": 10,
                        "timeoutSeconds": 5,
                        "failureThreshold": 3
                    }
                }]
            }
        }
    }
})

for svc in tcp_probe_services:
    patch = tcp_patch.replace("PLACEHOLDER", svc)
    result = run(f"kubectl -n aivo-prod patch deployment {svc} --type=strategic -p '{patch}'")
    status = '✅' if 'patched' in result else '❌'
    print(f"  {status} {svc}: {result[:80]}")

# Also patch consent-svc liveness + startup probes to tcp
print("\n=== Consent-svc liveness + startup probes ===")
consent_full_patch = json.dumps({
    "spec": {
        "template": {
            "spec": {
                "containers": [{
                    "name": "consent-svc",
                    "livenessProbe": {
                        "tcpSocket": {"port": 3000},
                        "httpGet": None,
                        "initialDelaySeconds": 15,
                        "periodSeconds": 15,
                        "timeoutSeconds": 5,
                        "failureThreshold": 3
                    },
                    "startupProbe": {
                        "tcpSocket": {"port": 3000},
                        "httpGet": None,
                        "initialDelaySeconds": 10,
                        "periodSeconds": 5,
                        "timeoutSeconds": 5,
                        "failureThreshold": 30
                    }
                }]
            }
        }
    }
})
result = run(f"kubectl -n aivo-prod patch deployment consent-svc --type=strategic -p '{consent_full_patch}'")
print(f"  consent-svc: {result[:80]}")

# Also add SECURITY_TOKEN_SECRET env var to assessment-svc deployment
print("\n=== assessment-svc SECURITY_TOKEN_SECRET ===")
assess_patch = json.dumps({
    "spec": {
        "template": {
            "spec": {
                "containers": [{
                    "name": "assessment-svc",
                    "env": [{
                        "name": "SECURITY_TOKEN_SECRET",
                        "valueFrom": {
                            "secretKeyRef": {
                                "name": "assessment-svc-secrets",
                                "key": "security-token-secret"
                            }
                        }
                    }]
                }]
            }
        }
    }
})
result = run(f"kubectl -n aivo-prod patch deployment assessment-svc --type=strategic -p '{assess_patch}'")
print(f"  assessment-svc: {result[:80]}")

# Restart all patched deployments
print("\n=== Rolling restart patched deployments ===")
all_patched = tcp_probe_services + ['assessment-svc']
for svc in all_patched:
    result = run(f'kubectl -n aivo-prod rollout restart deployment/{svc}')
    print(f"  {svc}: {result}")

ssh.close()
print("\nDone!")
