"""Fix remaining readiness probes for session-svc, focus-svc, content-svc"""
import os

base_dir = r'c:\Users\ofema\aivo\infra\k8s\base'

# These services need TCP readiness probes added
services_to_fix = ['session-svc', 'focus-svc']  # content-svc already done

old_ready = """          readinessProbe:
            httpGet:
              path: /ready
              port: http"""

new_ready = """          readinessProbe:
            tcpSocket:
              port: http"""

for svc in services_to_fix:
    filepath = os.path.join(base_dir, f'{svc}.yaml')
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old_ready in content:
        content = content.replace(old_ready, new_ready)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ {svc}: Fixed readiness probe to tcpSocket")
    else:
        print(f"⚠️  {svc}: Pattern not found")

# Check content-svc is already fixed
filepath = os.path.join(base_dir, 'content-svc.yaml')
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()
if 'tcpSocket' in content:
    print("✅ content-svc: Already has tcpSocket")
else:
    if old_ready in content:
        content = content.replace(old_ready, new_ready)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ content-svc: Fixed readiness probe to tcpSocket")
    else:
        print(f"⚠️  content-svc: Pattern not found, checking...")
        # Show readinessProbe lines
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'readiness' in line.lower():
                print(f"  line {i+1}: {line}")
                for j in range(1, 5):
                    if i+j < len(lines):
                        print(f"  line {i+j+1}: {lines[i+j]}")
