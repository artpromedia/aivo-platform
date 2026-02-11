#!/usr/bin/env python3
"""Patch parent-svc deployment: add Firebase env vars + fix probes."""

import paramiko
import json

APP1 = "95.216.245.40"

def run_ssh(host, cmd):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username="root")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    rc = stdout.channel.recv_exit_status()
    ssh.close()
    return out, err, rc

def main():
    # JSON patch operations:
    # 1. Fix startupProbe -> tcpSocket
    # 2. Fix livenessProbe -> tcpSocket
    # 3. Add Firebase env vars
    patch = json.dumps([
        # Fix startup probe to tcpSocket
        {
            "op": "replace",
            "path": "/spec/template/spec/containers/0/startupProbe",
            "value": {
                "tcpSocket": {"port": 3000},
                "initialDelaySeconds": 10,
                "periodSeconds": 5,
                "failureThreshold": 30,
                "timeoutSeconds": 5
            }
        },
        # Fix liveness probe to tcpSocket
        {
            "op": "replace",
            "path": "/spec/template/spec/containers/0/livenessProbe",
            "value": {
                "tcpSocket": {"port": 3000},
                "initialDelaySeconds": 15,
                "periodSeconds": 15,
                "failureThreshold": 3,
                "timeoutSeconds": 5
            }
        },
        # Add FIREBASE_PROJECT_ID env var
        {
            "op": "add",
            "path": "/spec/template/spec/containers/0/env/-",
            "value": {
                "name": "FIREBASE_PROJECT_ID",
                "valueFrom": {
                    "secretKeyRef": {
                        "name": "parent-svc-secrets",
                        "key": "firebase-project-id"
                    }
                }
            }
        },
        # Add FIREBASE_CLIENT_EMAIL env var
        {
            "op": "add",
            "path": "/spec/template/spec/containers/0/env/-",
            "value": {
                "name": "FIREBASE_CLIENT_EMAIL",
                "valueFrom": {
                    "secretKeyRef": {
                        "name": "parent-svc-secrets",
                        "key": "firebase-client-email"
                    }
                }
            }
        },
        # Add FIREBASE_PRIVATE_KEY env var
        {
            "op": "add",
            "path": "/spec/template/spec/containers/0/env/-",
            "value": {
                "name": "FIREBASE_PRIVATE_KEY",
                "valueFrom": {
                    "secretKeyRef": {
                        "name": "parent-svc-secrets",
                        "key": "firebase-private-key"
                    }
                }
            }
        },
    ])

    # Write patch to server
    patch_escaped = patch.replace("'", "'\\''")
    out, err, rc = run_ssh(APP1, f"echo '{patch_escaped}' > /tmp/parent-patch.json")
    print(f"Write patch: rc={rc}")

    # Apply JSON patch
    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod patch deploy parent-svc --type='json' --patch-file=/tmp/parent-patch.json")
    print(f"Patch deploy: {out.strip()} {err.strip()}")

    if rc != 0:
        print("FAILED! Trying to debug...")
        out, err, rc = run_ssh(APP1, "cat /tmp/parent-patch.json | python3 -m json.tool")
        print(f"Patch JSON valid: {out[:200]}")
        return

    # Verify probes
    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod get deploy parent-svc -o jsonpath='{.spec.template.spec.containers[0].startupProbe}'")
    print(f"Startup probe: {out}")

    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod get deploy parent-svc -o jsonpath='{.spec.template.spec.containers[0].livenessProbe}'")
    print(f"Liveness probe: {out}")

    # Check env vars include Firebase
    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod get deploy parent-svc -o jsonpath='{.spec.template.spec.containers[0].env[*].name}'")
    print(f"Env vars: {out}")

    # Clean up
    run_ssh(APP1, "rm -f /tmp/parent-patch.json")
    print("Done!")

if __name__ == "__main__":
    main()
