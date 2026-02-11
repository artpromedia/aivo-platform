#!/usr/bin/env python3
"""Fix ingresses to use aivolearning.com domain only (remove aivo.ai references)."""

import paramiko
import json
import textwrap

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
    # =========================================================
    # 1. API Ingress — all 18 services under api.aivolearning.com
    # =========================================================
    api_ingress = textwrap.dedent("""\
    apiVersion: networking.k8s.io/v1
    kind: Ingress
    metadata:
      name: aivo-api-ingress
      namespace: aivo-prod
      labels:
        app.kubernetes.io/environment: production
        environment: production
        platform: hetzner
      annotations:
        nginx.ingress.kubernetes.io/ssl-redirect: "true"
        nginx.ingress.kubernetes.io/use-forwarded-headers: "true"
        nginx.ingress.kubernetes.io/enable-cors: "true"
        nginx.ingress.kubernetes.io/cors-allow-origin: "https://aivolearning.com,https://app.aivolearning.com,https://www.aivolearning.com"
        nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        nginx.ingress.kubernetes.io/cors-allow-headers: "Accept, Authorization, Content-Type, X-Request-ID, X-Tenant-ID"
        nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
        nginx.ingress.kubernetes.io/cors-max-age: "3600"
        nginx.ingress.kubernetes.io/proxy-body-size: "50m"
        nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"
        nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
        nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
        nginx.ingress.kubernetes.io/limit-rps: "50"
        nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
        prometheus.io/scrape: "true"
    spec:
      ingressClassName: nginx
      tls:
      - hosts:
        - api.aivolearning.com
        secretName: cloudflare-origin-tls
      rules:
      - host: api.aivolearning.com
        http:
          paths:
          - path: /api/v1/auth
            pathType: Prefix
            backend:
              service:
                name: auth-svc
                port:
                  number: 3000
          - path: /api/v1/sessions
            pathType: Prefix
            backend:
              service:
                name: session-svc
                port:
                  number: 3000
          - path: /api/v1/consent
            pathType: Prefix
            backend:
              service:
                name: consent-svc
                port:
                  number: 3000
          - path: /api/v1/profile
            pathType: Prefix
            backend:
              service:
                name: profile-svc
                port:
                  number: 3000
          - path: /api/v1/content
            pathType: Prefix
            backend:
              service:
                name: content-svc
                port:
                  number: 3000
          - path: /api/v1/assessments
            pathType: Prefix
            backend:
              service:
                name: assessment-svc
                port:
                  number: 3000
          - path: /api/v1/personalization
            pathType: Prefix
            backend:
              service:
                name: personalization-svc
                port:
                  number: 3000
          - path: /api/v1/life-skills
            pathType: Prefix
            backend:
              service:
                name: life-skills-svc
                port:
                  number: 3000
          - path: /api/v1/ai
            pathType: Prefix
            backend:
              service:
                name: ai-orchestrator
                port:
                  number: 3000
          - path: /api/v1/analytics
            pathType: Prefix
            backend:
              service:
                name: analytics-svc
                port:
                  number: 3000
          - path: /api/v1/notifications
            pathType: Prefix
            backend:
              service:
                name: notify-svc
                port:
                  number: 3000
          - path: /api/v1/messages
            pathType: Prefix
            backend:
              service:
                name: messaging-svc
                port:
                  number: 3000
          - path: /api/v1/goals
            pathType: Prefix
            backend:
              service:
                name: goal-svc
                port:
                  number: 3000
          - path: /api/v1/focus
            pathType: Prefix
            backend:
              service:
                name: focus-svc
                port:
                  number: 3000
          - path: /api/v1/billing
            pathType: Prefix
            backend:
              service:
                name: billing-svc
                port:
                  number: 3000
          - path: /api/v1/payments
            pathType: Prefix
            backend:
              service:
                name: payments-svc
                port:
                  number: 3000
          - path: /api/v1/parent
            pathType: Prefix
            backend:
              service:
                name: parent-svc
                port:
                  number: 3000
          - path: /api/v1/baseline
            pathType: Prefix
            backend:
              service:
                name: baseline-svc
                port:
                  number: 3000
          - path: /health
            pathType: Exact
            backend:
              service:
                name: auth-svc
                port:
                  number: 3000
    """)

    # =========================================================
    # 2. WebSocket Ingress — ws.aivolearning.com
    # =========================================================
    ws_ingress = textwrap.dedent("""\
    apiVersion: networking.k8s.io/v1
    kind: Ingress
    metadata:
      name: aivo-realtime-ingress
      namespace: aivo-prod
      labels:
        app.kubernetes.io/environment: production
        environment: production
        platform: hetzner
      annotations:
        nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
        nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
        nginx.ingress.kubernetes.io/websocket-services: "messaging-svc"
        nginx.ingress.kubernetes.io/upstream-hash-by: "$remote_addr"
        prometheus.io/scrape: "true"
    spec:
      ingressClassName: nginx
      tls:
      - hosts:
        - ws.aivolearning.com
        secretName: cloudflare-origin-tls
      rules:
      - host: ws.aivolearning.com
        http:
          paths:
          - path: /ws/messages
            pathType: Prefix
            backend:
              service:
                name: messaging-svc
                port:
                  number: 3000
          - path: /ws/notifications
            pathType: Prefix
            backend:
              service:
                name: notify-svc
                port:
                  number: 3000
    """)

    # Write files to server and apply
    for name, content in [("api-ingress.yaml", api_ingress), ("ws-ingress.yaml", ws_ingress)]:
        escaped = content.replace("'", "'\\''")
        out, err, rc = run_ssh(APP1, f"cat > /tmp/{name} << 'ENDYAML'\n{content}\nENDYAML")
        print(f"Write {name}: rc={rc}")

    # Apply both
    out, err, rc = run_ssh(APP1, "kubectl apply -f /tmp/api-ingress.yaml")
    print(f"API ingress: {out.strip()} {err.strip()}")

    out, err, rc = run_ssh(APP1, "kubectl apply -f /tmp/ws-ingress.yaml")
    print(f"WS ingress: {out.strip()} {err.strip()}")

    # Verify
    out, err, rc = run_ssh(APP1, "kubectl -n aivo-prod get ingress")
    print(f"\n=== Ingresses ===\n{out}")

    # Cleanup
    run_ssh(APP1, "rm -f /tmp/api-ingress.yaml /tmp/ws-ingress.yaml")
    print("Done!")

if __name__ == "__main__":
    main()
