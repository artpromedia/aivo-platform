#!/usr/bin/env python3
"""Add Firebase credentials to parent-svc-secrets in K8s."""

import paramiko
import json
import base64

FIREBASE_PROJECT_ID = "aivo-learning-7eee8"
FIREBASE_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@aivo-learning-7eee8.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY = """-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDAnlwT1xg8FlGz
UV9uC2JGP+N9ZnyikT3/MJdZjXggK0V8pbWYALzG9FmLwyhAL84H+m+rCSyCcKFR
x4QQdu+bojffcrnlVxaauIFSPvwXxbOM4njKLxtrXc8mEu8W0IVOj6BnDowYdIpS
wva3MDypZJLwP7fkfEoeJPuGrS7iMmZdGalPG7R1BDZEAQPZkDpND2yMXIjoTypS
I+FUP7gv95JOpeFV7YI9n8+5suD2peAKwr2vXsgT0Dv6Rsc5PMCn9upSeH6yt7Fl
JSrVhOq4OKyGt1fLqaqXgm8u/jeuMtLdTEr0PGukPwQ5EgKLzKaFwBNizROwTH9f
4is7PA7zAgMBAAECggEAFNXMXfUJUQ6U/dGSggPHOJQWlmzslGUjkKP/6xbrZIdp
t8bw8qU5xkeOHBkbFH5XSfOj+ps+bkmimYb8WQ+UcYBFjO0LAKy/7DKDApN/j066
UkX5DN21mJKIIrUvmYcqtEnC7wLa0pZgk/001LHqDeSsJEKwMI3lMoeLkZDQHnVn
GWDw/LhgFynmmKS92cfvoxnYMSoY6GY7ORGhIZKSGpSRFr1i/+KW6scRlVo/X0fw
WOBG6vgYd4sIrtXJlhasT/mQ7bGlV/Iti79rLdy08nEFJSls0NV/FRDadGHhUyKC
7dDaH74wkuo3CdusniNkLFuLoFlF395A82CuCVgQ0QKBgQDn49tl0bcPN8Am9/Of
06umWFUB+vDjT8aWWRnPf5rlVBTxPGwMlZ7r9ek3+5NOH+8LTrjpkiqN40AxprXi
LuqDHp5LB/2mcexnWsp6rKhaTTQ7djr9zVPX50K79IVhKCa7durd8YSBLhXYNSlw
bLBIW+z4lHm+skAmdIts/PdUmwKBgQDUpTn9Oj9P7DGv8OSHpaAOzwJzIFeslWw+
VvkEdjiSGqkKwsL+tDAmycpMCT407X1jyC+JiId8ioASDyb/jRxPbL/oJ/jNlB9X
Qp5UPmN8jQlLrn4V8tcbpq5wDREZE/l0hY2qYUkA62zP2qR7YKd/SZPWKQsQMYDs
ocFeJcfYiQKBgDdoByUV7cJyFLR67DgVEF9nnbAicGovxohn87XTjIQdCf/16u86
1MUWdcoNj03MbYZrId2VMhvC37S9W5oWkawQpcvRtfaOI+kyFU0ocfVZmxBWGJRJ
+i2NMTHNpAzp1g9Ww5mSOpHPHCMT2LnnDlvLsxxWBZzd5FwL3sCE1OffAoGASpQc
T3TDSbuT/Znl/LEY/riZqlj4ht3tFbwZH/h6hLt2+AAwtXXqwV/aZGqFd7inVyna
N4k7w3Er06meytfpyu1gLQL/3tIJX+hMcU1kRQWN8g4jyHzf9qGx4jii+4Gm5rgE
ZHI0UW9APXH4aBERDbJ3eA/zAl3qUpO0ptlnSskCgYA4YTFF3tV3Q+OMth1JfkLL
FTrNck1VTe8Y7mVNTyG7T8PTH8bNsT4ydd4F5aiqfitY/aSxtZuFkThI5yPH0+h6
EdAPfEY4cioqLUORtVlokPz2n/PC0Owq7A8/KNtxONWxjqpYVnuD3pmZIiHygUbE
w9tdOtsF5vGnGXS52EKjPQ==
-----END PRIVATE KEY-----
"""

APP1 = "95.216.245.40"

def run_ssh(host, cmd):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username="root")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    ssh.close()
    return out, err

def main():
    # Build the patch JSON
    patch = json.dumps({
        "stringData": {
            "firebase-project-id": FIREBASE_PROJECT_ID,
            "firebase-client-email": FIREBASE_CLIENT_EMAIL,
            "firebase-private-key": FIREBASE_PRIVATE_KEY.strip(),
        }
    })

    # Write patch file on server
    # Escape for shell
    patch_escaped = patch.replace("'", "'\\''")
    out, err = run_ssh(APP1, f"echo '{patch_escaped}' > /tmp/fb-patch.json")
    print(f"Write patch file: {out}{err}")

    # Verify
    out, err = run_ssh(APP1, "python3 -c \"import json; d=json.load(open('/tmp/fb-patch.json')); print('Keys:', list(d['stringData'].keys())); print('PK starts with:', d['stringData']['firebase-private-key'][:30])\"")
    print(f"Verify: {out}{err}")

    # Apply patch
    out, err = run_ssh(APP1, "kubectl -n aivo-prod patch secret parent-svc-secrets --type=merge --patch-file=/tmp/fb-patch.json")
    print(f"Patch result: {out}{err}")

    # Verify secret has all keys
    out, err = run_ssh(APP1, "kubectl -n aivo-prod get secret parent-svc-secrets -o jsonpath='{.data}' | python3 -c \"import sys,json; d=json.loads(sys.stdin.read()); print('Secret keys:', sorted(d.keys()))\"")
    print(f"Secret keys: {out}{err}")

    # Clean up
    run_ssh(APP1, "rm -f /tmp/fb-patch.json")
    print("Done! Cleaned up patch file.")

if __name__ == "__main__":
    main()
