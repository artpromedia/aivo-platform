"""Check readiness probe type for each service manifest."""
import os, re

base_dir = r'c:\Users\ofema\aivo\infra\k8s\base'

for fname in sorted(os.listdir(base_dir)):
    if not fname.endswith('.yaml') or fname in ['kustomization.yaml', 'namespace.yaml']:
        continue
    with open(os.path.join(base_dir, fname), 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find readiness probe type
    rp_match = re.search(r'readinessProbe:\s*\n\s*(httpGet|tcpSocket):', content)
    if rp_match:
        probe_type = rp_match.group(1)
        if probe_type == 'httpGet':
            # Get the path
            path_match = re.search(r'readinessProbe:\s*\n\s*httpGet:\s*\n\s*path:\s*(\S+)', content)
            path = path_match.group(1) if path_match else '?'
            print(f"  {fname}: httpGet → {path}")
        else:
            print(f"✅ {fname}: tcpSocket")
    else:
        print(f"❓ {fname}: no readiness probe found")
