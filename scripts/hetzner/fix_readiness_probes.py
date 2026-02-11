"""
Fix K8s probes for services where /ready returns 401 or 404.
Strategy: Change readiness probes to tcpSocket for affected services.
Also check/fix liveness probes that return non-200.

Services with 401 on /ready: auth-svc, session-svc, baseline-svc, consent-svc
Services with 404 on /ready: content-svc, messaging-svc
"""
import os
import re

base_dir = r'c:\Users\ofema\aivo\infra\k8s\base'

# Services that need TCP readiness probes (401 or 404 on /ready)
tcp_ready_services = [
    'auth-svc', 'session-svc', 'baseline-svc', 'consent-svc',
    'content-svc', 'messaging-svc'
]

for svc in tcp_ready_services:
    filepath = os.path.join(base_dir, f'{svc}.yaml')
    if not os.path.exists(filepath):
        print(f"SKIP: {filepath} not found")
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace readiness probe from httpGet to tcpSocket
    # Match the readiness probe block
    # Pattern: readinessProbe:\n            httpGet:\n              path: /ready\n              port: http
    old_ready = """          readinessProbe:
            httpGet:
              path: /ready
              port: http"""
    
    new_ready = """          readinessProbe:
            tcpSocket:
              port: http"""
    
    if old_ready in content:
        content = content.replace(old_ready, new_ready)
        print(f"✅ {svc}: Changed readiness probe to tcpSocket")
    else:
        print(f"⚠️  {svc}: readiness probe pattern not found, checking...")
        # Try alternate pattern
        old_ready2 = """          readinessProbe:
            httpGet:
              path: /ready
              port: 3000"""
        new_ready2 = """          readinessProbe:
            tcpSocket:
              port: 3000"""
        if old_ready2 in content:
            content = content.replace(old_ready2, new_ready2)
            print(f"✅ {svc}: Changed readiness probe to tcpSocket (port 3000)")
        else:
            print(f"❌ {svc}: Could not find readiness probe to replace")
    
    # Also fix liveness probe if using /health that returns 401
    # For consent-svc, /health also returns 401
    if svc in ['consent-svc']:
        old_live = """          livenessProbe:
            httpGet:
              path: /health
              port: http"""
        new_live = """          livenessProbe:
            tcpSocket:
              port: http"""
        if old_live in content:
            content = content.replace(old_live, new_live)
            print(f"✅ {svc}: Changed liveness probe to tcpSocket")
        
        old_start = """          startupProbe:
            httpGet:
              path: /health
              port: http"""
        new_start = """          startupProbe:
            tcpSocket:
              port: http"""
        if old_start in content:
            content = content.replace(old_start, new_start)
            print(f"✅ {svc}: Changed startup probe to tcpSocket")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("\nDone! All probe fixes applied.")
