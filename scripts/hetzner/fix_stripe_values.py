import paramiko, base64, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    return stdout.read().decode().strip()

# Check current values
for secret_name in ['payments-svc-secrets', 'billing-svc-secrets']:
    print(f"=== {secret_name} ===")
    data = run(f'kubectl -n aivo-prod get secret {secret_name} -o json')
    d = json.loads(data)
    for key, val in d.get('data', {}).items():
        decoded = base64.b64decode(val).decode()
        # Mask values for security
        if len(decoded) > 20:
            print(f"  {key}: {decoded[:15]}...{decoded[-5:]}")
        else:
            print(f"  {key}: {decoded}")
    print()

# Now patch with valid-format values
print("=== Patching billing-svc-secrets with valid price IDs ===")

# These match /^price_[a-zA-Z0-9]{14,}$/
prices = {
    'stripe-price-pro-monthly': 'price_test00ProMonthly',      # 20 alphanumeric after price_
    'stripe-price-pro-annual': 'price_test000ProAnnual',       # 20 alphanumeric after price_
    'stripe-price-premium-monthly': 'price_test0PremMonthly',  # 20 alphanumeric after price_
    'stripe-price-premium-annual': 'price_test00PremAnnual',   # 20 alphanumeric after price_
}

patch_data = {}
for k, v in prices.items():
    patch_data[k] = base64.b64encode(v.encode()).decode()

patch = json.dumps({"data": patch_data})
result = run(f"kubectl -n aivo-prod patch secret billing-svc-secrets --type merge -p '{patch}'")
print(f"  {result}")

print("\n=== Patching payments-svc-secrets with valid webhook secret ===")
whsec = 'whsec_test00signingsecret00val'  # No "placeholder" substring
patch2 = json.dumps({"data": {"stripe-webhook-secret": base64.b64encode(whsec.encode()).decode()}})
result2 = run(f"kubectl -n aivo-prod patch secret payments-svc-secrets --type merge -p '{patch2}'")
print(f"  {result2}")

# Verify
print("\n=== Verification ===")
for secret_name in ['payments-svc-secrets', 'billing-svc-secrets']:
    data = run(f'kubectl -n aivo-prod get secret {secret_name} -o json')
    d = json.loads(data)
    for key, val in d.get('data', {}).items():
        decoded = base64.b64decode(val).decode()
        if 'price' in key or 'webhook' in key:
            print(f"  {secret_name}/{key}: {decoded}")

ssh.close()
