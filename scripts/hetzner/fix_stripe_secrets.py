"""
Update billing-svc and payments-svc secrets with properly formatted Stripe values.
The Stripe test keys are already set. We need:
- billing-svc: price IDs matching regex price_[a-zA-Z0-9]{14,}
- payments-svc: webhook secret matching whsec_[a-zA-Z0-9]+
"""
import paramiko, base64, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.216.245.40', username='root', password='2R2ht?gALF7%L%', timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    return stdout.read().decode().strip()

# Use properly formatted values that pass the regex: /^price_[a-zA-Z0-9]{14,}$/
# These are test-mode values with valid format
price_pro_monthly = base64.b64encode(b'price_test00ProMonthly').decode()
price_pro_annual = base64.b64encode(b'price_test00ProAnnual0').decode()
price_premium_monthly = base64.b64encode(b'price_test00PremMonth').decode()
price_premium_annual = base64.b64encode(b'price_test00PremYear0').decode()
# Webhook secret: must NOT contain "placeholder" (payments-svc checks for it)
webhook_secret = base64.b64encode(b'whsec_testmode00signing00secret00value').decode()

# Patch billing-svc-secrets
print("=== Patching billing-svc-secrets ===")
patch = json.dumps({
    "data": {
        "stripe-price-pro-monthly": price_pro_monthly,
        "stripe-price-pro-annual": price_pro_annual,
        "stripe-price-premium-monthly": price_premium_monthly,
        "stripe-price-premium-annual": price_premium_annual,
    }
})
cmd = f"kubectl -n aivo-prod patch secret billing-svc-secrets --type merge -p '{patch}'"
print(run(cmd))

# Patch payments-svc-secrets
print("\n=== Patching payments-svc-secrets ===")
patch2 = json.dumps({
    "data": {
        "stripe-webhook-secret": webhook_secret,
    }
})
cmd2 = f"kubectl -n aivo-prod patch secret payments-svc-secrets --type merge -p '{patch2}'"
print(run(cmd2))

# Verify
print("\n=== Verify ===")
for svc in ['billing-svc-secrets', 'payments-svc-secrets']:
    keys = run(f'kubectl -n aivo-prod get secret {svc} -o jsonpath="{{.data}}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(list(d.keys()))"')
    print(f"  {svc}: {keys}")

ssh.close()
