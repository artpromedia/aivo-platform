"""
Fix health probe paths in all K8s base manifests.
Services expose /health and /ready, but K8s checks /health/live and /health/ready.
"""
import os, re

base_dir = r"c:\Users\ofema\aivo\infra\k8s\base"

# Map of actual health routes per service
# Most services: /health for liveness, /ready for readiness
# consent-svc has NO health routes at all - use TCP socket instead
# content-svc, baseline-svc have no /ready - use /health for both

files_changed = 0
for fname in os.listdir(base_dir):
    if not fname.endswith('.yaml') and not fname.endswith('.yml'):
        continue
    fpath = os.path.join(base_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Replace /health/live with /health for liveness/startup probes
    content = content.replace('path: /health/live', 'path: /health')
    
    # Replace /health/ready with /ready for readiness probes  
    content = content.replace('path: /health/ready', 'path: /ready')
    
    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        changes = []
        if '/health/live' in original:
            changes.append('/health/live -> /health')
        if '/health/ready' in original:
            changes.append('/health/ready -> /ready')
        print(f"✅ {fname}: {', '.join(changes)}")
        files_changed += 1

print(f"\nTotal files changed: {files_changed}")
