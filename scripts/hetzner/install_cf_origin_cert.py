#!/usr/bin/env python3
"""Install Cloudflare Origin Certificate as K8s TLS secret."""

import paramiko

APP1 = "95.216.245.40"

CERT = """-----BEGIN CERTIFICATE-----
MIIEFTCCAv2gAwIBAgIUS2jYnm8LpJCgQyAAWdijuuOIuXkwDQYJKoZIhvcNAQEL
BQAwgagxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRYwFAYDVQQH
Ew1TYW4gRnJhbmNpc2NvMRkwFwYDVQQKExBDbG91ZGZsYXJlLCBJbmMuMRswGQYD
VQQLExJ3d3cuY2xvdWRmbGFyZS5jb20xNDAyBgNVBAMTK01hbmFnZWQgQ0EgNTZm
MzRkNGMzMmQ3ZGVlZWI5MTdjNWUyN2UwMDgzYWMwHhcNMjYwMjA5MDIyMjAwWhcN
MzYwMjA3MDIyMjAwWjAiMQswCQYDVQQGEwJVUzETMBEGA1UEAxMKQ2xvdWRmbGFy
ZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALY2WDsmETWRbSnrohZO
9avFsxbFCbeCi/dw2/qZnIYIRCwv+naKpvyCjYQ+sLzjfDmWlLo0C5jVYhNliz8T
LotkIR/WuZ3yHnURrkHE4maDgjPX67A+DIJz6kElNjAhiB5yvbUtulDDp5W8ImZE
s11ghrD96rJ/8Rdn632/8qnVH8glG5XgnA708s8IAJektD5PnpWOSLFYx31+6FDp
8tU1g2sN7U4Enw3G61ij5RWH3u+8p1bJ8HDWxb4M5VIUhVaQTpVVQtQ5WQmuJlmm
1EgeE6q5gE5rU3dSCsLOl32p0JZEUyGq/mfz7ayA7McSgiSSecZ6M8PgrDi+ccb7
ZnMCAwEAAaOBuzCBuDATBgNVHSUEDDAKBggrBgEFBQcDAjAMBgNVHRMBAf8EAjAA
MB0GA1UdDgQWBBRRVqz61IZcIxIGaVhJVXpSMlJqfzAfBgNVHSMEGDAWgBTVFy4M
94KBce9oVJz6FhaYITiFSDBTBgNVHR8ETDBKMEigRqBEhkJodHRwOi8vY3JsLmNs
b3VkZmxhcmUuY29tLzYwNjBhY2Q5LTQ2NTItNGVlNS04MzMyLWFiODZmYWM4NmRm
MS5jcmwwDQYJKoZIhvcNAQELBQADggEBAD16KfNWzYLbVTBPSHJjIBsemzXbNK8q
79KywKCt04UqYmN8qkJUt9B8JERKKMGq/L53c4Qs2g38lBCFy0rXfNGiU19hxyT0
SGrROShicUmYKDAvzjykzd6FZwsZcT4dng0pGWQNmheP31CapgzskfBZlJQtQ3qf
OaL9giuNPg8qAtZ5PlVfM0GvEWbVE+eoBhast7ovZxWs1Nd1wKra2jR9YSUm5wKN
ZrZfv09UzyeBcyMV3lV3XSfCJNlb4bCcBXzQCvQ/KUXh+etiBu9vSGghyhFzF/3M
K0qN2MhfPoK5gNieO8KFew/KbLetd3tO1wjYkXn2gxiaVSBixlqd3PQ=
-----END CERTIFICATE-----"""

KEY = """-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC2Nlg7JhE1kW0p
66IWTvWrxbMWxQm3gov3cNv6mZyGCEQsL/p2iqb8go2EPrC843w5lpS6NAuY1WIT
ZYs/Ey6LZCEf1rmd8h51Ea5BxOJmg4Iz1+uwPgyCc+pBJTYwIYgecr21LbpQw6eV
vCJmRLNdYIaw/eqyf/EXZ+t9v/Kp1R/IJRuV4JwO9PLPCACXpLQ+T56VjkixWMd9
fuhQ6fLVNYNrDe1OBJ8NxutYo+UVh97vvKdWyfBw1sW+DOVSFIVWkE6VVULUOVkJ
riZZptRIHhOquYBOa1N3UgrCzpd9qdCWRFMhqv5n8+2sgOzHEoIkknnGejPD4Kw4
vnHG+2ZzAgMBAAECggEAOsc7HRGBmaso8M3vQo0EGP40cFLteIInTpHclHF7GY2P
GEX94MGHbotaxV9HuhcUGqulnI9vckTbV3B5Q8aXTCXnvZKR3A6fnpougU7WzcT8
embbw8WwWWC1H4C2gz4937yZz9lJcgY7iEThP+ZHiga6TFwMmrpE9ozyXWVPDVOE
c/l0ndwPpKRjrK6NmuzAjqhq+3PGAjYkWyLmvZASORCbRL74SCTf2m1VgsIbqPLg
4wJN4d1HPvAKa2wDjidacfJu6syaNAZzaO08CzjTzlE+oJShCUQ6yyxG9xystMkn
0utIg5Rfy7aanWoVwdDGDPr/1rGjOd9ZU6F/Z6o4MQKBgQDgcXsfqt8kAZQGoydZ
pD3xNhA+z7OSBTRdwMdiLbAmWB2XyZxFZhI+Wfu6F9kheGhG09PhLIu6cLarMiLr
jsGS9NZ33UG767+2skO5tdQ0VF1V5FeNLy03jHXZdl5qpsWuxpmOj7JI8L57uuTV
znZbO0JpWiRUrt5lI/pnHwtWKwKBgQDP1NGGhAiCqdpZd8mFKRCfm6Dq+Cinm9qE
GHDVBfK1W8Vkc6HQUB6+643fTyh76ifLSKNjzNfQf7Eq0M9V8rVTmkb5CJurnZJt
r6vyjLtsXYahS9jIGXOCgF8Hzs9Uy0rPeuOzLt8Uz+2GVd19Qi3KZnj4m7BKpEP6
yA5qbOwU2QKBgH2vjt9g9KxZJefBnduZGgbl25sQ/OIcgAKwXfcg1q/iUFAb2qMS
Uc0Q3uKLUFBp+RsQrGpAY874J5Me9Gcs/kGpUiC1ioYNssJAeaSZqkfTpqDeyhiJ
/qxIwAYTPzRCSBljpcIrvg8SodjwBA2nHKhiOwJ8NDQn6OqCh0sQG20ZAoGBAMUH
utfvBm5xfrrBEIC4bLUUAtugBlLYM7J1xUp/SBjdduaDpU1rF6rif+7MCdJoK+/R
3my3/4X/+MNhkJ6n6XXn1g80NPje+roYCEh7WRgkFoWF9W/GiTaYYv9w9igqTrMi
iwoNjpoZgdKQRtoASo8O1PLEDr7EulnfHaORvcMJAoGBAL4AGe2iYxBC+hxf1eJ0
RRNc57RR+XJATK2cCCnsrr0ZUTR2JGYjGokAF9HijL+bybUh7WKEdeE7R7FF4wKD
rdrfwnfQwqyFS+q1xp6A5VSAYV1+1+C4LZskO3bmkfFos9vrsknU7YgGx1uwu6vf
HWMGEoKDn8X318MKNqH5uyaL
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
    cert_escaped = CERT.replace("'", "'\\''")
    key_escaped = KEY.replace("'", "'\\''")

    run_ssh(APP1, f"cat > /tmp/cf-origin.crt << 'EOF'\n{CERT}\nEOF")
    run_ssh(APP1, f"cat > /tmp/cf-origin.key << 'EOF'\n{KEY}\nEOF")
    print("Wrote cert and key files to server")

    # Delete existing secret if any
    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod delete secret cloudflare-origin-tls 2>/dev/null; echo ok")
    print(f"Delete old secret: {out.strip()}")

    # Create TLS secret
    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod create secret tls cloudflare-origin-tls --cert=/tmp/cf-origin.crt --key=/tmp/cf-origin.key")
    print(f"Create secret: {out.strip()} {err.strip()}")

    if rc != 0:
        print(f"FAILED with rc={rc}")
        return

    # Verify secret
    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod get secret cloudflare-origin-tls -o jsonpath='{.type}'")
    print(f"Secret type: {out}")

    # Verify ingresses reference it
    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod get ingress -o wide")
    print(f"\n=== Ingresses ===\n{out}")

    # Clean up
    run_ssh(APP1, "rm -f /tmp/cf-origin.crt /tmp/cf-origin.key")
    print("Cleaned up temp files. Done!")

if __name__ == "__main__":
    main()
