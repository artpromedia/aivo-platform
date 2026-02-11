#!/usr/bin/env python3
"""Install Cloudflare Origin Certificate v2 (with SANs) as K8s TLS secret."""

import paramiko

APP1 = "95.216.245.40"

CERT = """-----BEGIN CERTIFICATE-----
MIIEFTCCAv2gAwIBAgIUC7tQQB3NgYjK2Kq2dxUK+r134jUwDQYJKoZIhvcNAQEL
BQAwgagxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRYwFAYDVQQH
Ew1TYW4gRnJhbmNpc2NvMRkwFwYDVQQKExBDbG91ZGZsYXJlLCBJbmMuMRswGQYD
VQQLExJ3d3cuY2xvdWRmbGFyZS5jb20xNDAyBgNVBAMTK01hbmFnZWQgQ0EgNTZm
MzRkNGMzMmQ3ZGVlZWI5MTdjNWUyN2UwMDgzYWMwHhcNMjYwMjA5MDIzMTAwWhcN
MzYwMjA3MDIzMTAwWjAiMQswCQYDVQQGEwJVUzETMBEGA1UEAxMKQ2xvdWRmbGFy
ZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANE/ppYxvvfzZMpzCPo7
Kdq18V0ZgOCsHE+9KIfYj3Zo4G3tGHEZGj51rWMmh+FMSkEwZqJ/ddCPScRdhmlF
DH7PwhkAGLYG55yPavic6H/OdVFgycVpW+Z4Ml9ESXgqc/eWju2rYvBsBpUwBdxa
TAMpR2MKJdO+XOevSI7Ol0PWHEOM7VI5whjgGb86WC+ChigPwHoxOqDxv3DzaGGG
/WMsOgA9GmB//U7AAh9zLxilTtL1ESsIqQx+7DsnCg/gv7EvAR7Cqq/MkxMnraZn
kBcteVZMWNrxE2D7iXtKOn2TVe5RQDUwyTFPf71CAwhTWXLHTnRywwPErzCSRCnm
tnMCAwEAAaOBuzCBuDATBgNVHSUEDDAKBggrBgEFBQcDAjAMBgNVHRMBAf8EAjAA
MB0GA1UdDgQWBBQz3JsbNA974zoFbU0ftvTq8EnTgDAfBgNVHSMEGDAWgBTVFy4M
94KBce9oVJz6FhaYITiFSDBTBgNVHR8ETDBKMEigRqBEhkJodHRwOi8vY3JsLmNs
b3VkZmxhcmUuY29tLzYwNjBhY2Q5LTQ2NTItNGVlNS04MzMyLWFiODZmYWM4NmRm
MS5jcmwwDQYJKoZIhvcNAQELBQADggEBAHfH59VjNCUlPJuH4pneUgVvD3n+KLS8
Jp5cOFJMH1N+EaW1/6QZxIGeTjZeuBkO3zPqjcmKo5N7bdeCnh3r3rIwbbcqJ9Ss
4dgRAGpuCCATQvw3JHO9AVlq6Gtm4ZYynrv7ebk3KlaTTK4Yp9EsPDQ95xYBOuFv
zlTlCLQa+jNXSLd+0r9a70CRH8PHtizzZHFAXHDba3b0m7fKlhtn0kI0EbYmPVH5
L81axAeeRePcaX4nad14VXIkhk7kivrrGVzrm2nYDWfiMANedW5fubBmbg3pWVUQ
lO5chUGmgO2MBSGMyKBehzTVJg73Jfu/Yz/2fNJhHJZ1FttC9p3uMtI=
-----END CERTIFICATE-----"""

KEY = """-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDRP6aWMb7382TK
cwj6OynatfFdGYDgrBxPvSiH2I92aOBt7RhxGRo+da1jJofhTEpBMGaif3XQj0nE
XYZpRQx+z8IZABi2Buecj2r4nOh/znVRYMnFaVvmeDJfREl4KnP3lo7tq2LwbAaV
MAXcWkwDKUdjCiXTvlznr0iOzpdD1hxDjO1SOcIY4Bm/OlgvgoYoD8B6MTqg8b9w
82hhhv1jLDoAPRpgf/1OwAIfcy8YpU7S9RErCKkMfuw7JwoP4L+xLwEewqqvzJMT
J62mZ5AXLXlWTFja8RNg+4l7Sjp9k1XuUUA1MMkxT3+9QgMIU1lyx050csMDxK8w
kkQp5rZzAgMBAAECggEAQ6Sx86fNNlamZJPfeRUbKKrchd4yvW6mEFjz+0ZUylCJ
DMAywIz+4OYl0QGpt3l0H7LH2wwdR/iqPiKFyw4ZRf1fn7laQ63jvcbXK9t9haN2
ZYJGd9zhapW8ovNuVLxUlNtFBSv8ZgBl+GB35I4EOJlljGzBYbwOSI9vg0rht3mw
MENI11y8riB7h93gYonBp0VFKsHHp/PzBFBdMazkiEMXXa2ABSm0xtdCd0Jc8sZO
B9c+EHM9u9gF2Qj4/9CVbAbaQQiKs/1qVAd7qIxjosJ02vPMCZmjXJMNnqi78nvb
lRKjbQkVm4U7E7/QtasMIXW09eHAaR7zQsnEIhbggQKBgQDpJwmVN9dowdE1Jm6g
nExoQ8gPhWXI4YDvbgrN5IApxjZHNEuVKze6h7nzgZVxgewNYH6SgcyLmoQMRI3B
fL9QQkppbB7Sy42HOwSkDg29mwjsdGZW0cTaVXVIkuW8jKv0XCuqxn+eExr7b0od
kWSU6c3bE21xFMrZxK9WXngbEwKBgQDlwPN3GfRK2olHPe90908aYAcQS1lfHkzv
6JL8b7Wr8PgtIFLkd08+7aRVow1SnMAPnPsyRfEAh0xSL/w47eHis7Fa979rwy88
vZqYTOCGu2LuBC70s/bTlvyShdwcXVGkZ8FhuBrd343tWKOrTRQbpo6Bz8TjNuFS
5i7HFL4DIQKBgG3ARJCLYskbQ2Hjn3vXV1hVX91+i/VNwaXzhP56q6H+fhpykYm8
eFVEAtKPk0uFPxrk63AHzcOBjts/ggMst9oN+n05uiC8VPjtXTfkra8tRbwY5vvD
bwjf5X+uNprVFTTIFn4jRnugvrjRIHBeupwmmxKfSItMoFh2b5sWiS8lAoGAexbH
mQxvo9a261MUQf7pA0FlJ2am593M7E8WyGV02DxOSabiogIFk7ova63iSlsuTm8U
6RctidHyoqmQoFNZzGHm58yJYkt8uDcAZw3w0F3+H3RgT7tGxo9Cm6FZjly0i7cG
lLrUsf++AuWVMgYmerXd7VAJtI1HZGlrsD69meECgYEAyy2pCcJfwXLXP35LleRa
gS3TGzRFmk48BGDQYSwOnaIbviipTrtxRqE3ChUhmrqLjvPqz8a2/AeXNTDbYR2p
KnRPC8ZEbFLTrv52a49l9z4vaQLyZlFQ+H6GyGi206Y82LRmsZqb8cQKUApN3V0X
4tQIERvNA2RRYA4UaoPPvCU=
-----END PRIVATE KEY-----"""

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
    # Write cert and key to server
    run_ssh(APP1, f"cat > /tmp/cf-origin.crt << 'EOF'\n{CERT}\nEOF")
    run_ssh(APP1, f"cat > /tmp/cf-origin.key << 'EOF'\n{KEY}\nEOF")
    print("Wrote cert and key files to server")

    # Check SANs on new cert
    out, err, rc = run_ssh(APP1, "openssl x509 -in /tmp/cf-origin.crt -noout -subject -issuer -ext subjectAltName 2>&1")
    print(f"Cert details:\n{out}")

    # Delete existing secret and recreate
    run_ssh(APP1, "kubectl -n aivo-prod delete secret cloudflare-origin-tls 2>/dev/null")
    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod create secret tls cloudflare-origin-tls --cert=/tmp/cf-origin.crt --key=/tmp/cf-origin.key")
    print(f"Create secret: {out.strip()} {err.strip()}")

    # Force NGINX to reload by restarting the ingress controller
    out, err, rc = run_ssh(APP1, "kubectl -n ingress-nginx rollout restart deploy/ingress-nginx-controller 2>/dev/null || kubectl -n ingress-nginx rollout restart daemonset/ingress-nginx-controller 2>/dev/null")
    print(f"Restart ingress: {out.strip()} {err.strip()}")

    # Wait for reload
    import time
    print("Waiting 15s for NGINX to reload...")
    time.sleep(15)

    # Verify cert served by NGINX
    out, err, rc = run_ssh(APP1, "echo | openssl s_client -connect localhost:443 -servername api.aivolearning.com 2>/dev/null | openssl x509 -noout -subject -issuer -ext subjectAltName 2>/dev/null")
    print(f"NGINX serving cert:\n{out}")

    # Test HTTPS through Cloudflare
    out, err, rc = run_ssh(APP1, "curl -sv --resolve api.aivolearning.com:443:104.26.0.176 --max-time 10 https://api.aivolearning.com/health 2>&1 | tail -10")
    print(f"Cloudflare test:\n{out}")

    # Clean up
    run_ssh(APP1, "rm -f /tmp/cf-origin.crt /tmp/cf-origin.key")
    print("Done!")

if __name__ == "__main__":
    main()
