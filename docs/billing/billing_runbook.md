# Billing Operations Runbook

This runbook documents common billing scenarios, troubleshooting steps, and operational procedures for the Aivo payments infrastructure.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Common Issues](#common-issues)
3. [Investigation Procedures](#investigation-procedures)
4. [Dunning Flow](#dunning-flow)
5. [Metrics and Monitoring](#metrics-and-monitoring)
6. [Emergency Procedures](#emergency-procedures)

---

## Architecture Overview

### Services

| Service            | Port | Description                                     |
| ------------------ | ---- | ----------------------------------------------- |
| `payments-svc`     | 4070 | Stripe integration, webhook handling            |
| `billing-svc`      | 4060 | Billing accounts, subscriptions, invoices DB    |
| `entitlements-svc` | 4080 | Feature entitlements derived from subscriptions |

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Stripe      │────▶│  payments-svc   │────▶│   billing-svc   │
│   (Webhooks)    │     │   (Port 4070)   │     │   (Port 4060)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │ entitlements-svc│
                        │   (Port 4080)   │
                        └─────────────────┘
```

### Key Tables

- `billing_accounts` - Customer billing profiles
- `subscriptions` - Active/past subscriptions
- `invoices` - Payment records
- `payment_events` - Webhook event log (deduplication)
- `dunning_events` - Dunning process audit trail

---

## Common Issues

### 1. "Subscription looks active in Stripe but not in app"

**Symptoms:**

- Parent reports paying but not seeing premium features
- Stripe dashboard shows active subscription
- App shows subscription as inactive/expired

**Investigation Steps:**

```sql
-- Step 1: Find the billing account
SELECT * FROM billing_accounts
WHERE tenant_id = '<TENANT_ID>'
   OR billing_email = '<EMAIL>';

-- Step 2: Check subscriptions for this account
SELECT s.*, ba.provider_customer_id
FROM subscriptions s
JOIN billing_accounts ba ON s.billing_account_id = ba.id
WHERE ba.id = '<BILLING_ACCOUNT_ID>';

-- Step 3: Verify Stripe subscription ID matches
-- Compare provider_subscription_id with Stripe dashboard
```

**Resolution:**

1. If subscription exists but status is wrong:
   ```sql
   UPDATE subscriptions
   SET status = 'ACTIVE'
   WHERE id = '<SUBSCRIPTION_ID>';
   ```
2. Trigger entitlements recalculation:
   ```bash
   curl -X POST http://localhost:4080/internal/recalculate \
     -H "Content-Type: application/json" \
     -d '{"tenantId": "<TENANT_ID>", "tenantType": "PARENT"}'
   ```

### 2. "Parent reports being charged twice"

**Symptoms:**

- Two charges on credit card
- Two invoices in Stripe for same period
- Parent complaint about double billing

**Investigation Steps:**

```sql
-- Check payment events for duplicates
SELECT provider_event_id, event_type, created_at, payload
FROM payment_events
WHERE billing_account_id = '<BILLING_ACCOUNT_ID>'
ORDER BY created_at DESC
LIMIT 20;

-- Look for duplicate invoices
SELECT * FROM invoices
WHERE billing_account_id = '<BILLING_ACCOUNT_ID>'
  AND amount_cents > 0
ORDER BY period_start DESC;

-- Check idempotency - look for same operation at similar times
SELECT * FROM payment_events
WHERE event_type = 'checkout.session.completed'
  AND created_at > NOW() - INTERVAL '7 days'
  AND billing_account_id = '<BILLING_ACCOUNT_ID>';
```

**Resolution:**

1. Verify in Stripe dashboard which charge is valid
2. If duplicate charge confirmed, process refund in Stripe
3. Check correlation IDs in logs for duplicate webhook processing:
   ```bash
   # Search logs by billing account
   grep '<BILLING_ACCOUNT_ID>' /var/log/payments-svc/*.log | grep 'invoice.paid'
   ```

### 3. "Webhook signature validation failing"

**Symptoms:**

- `400` responses to Stripe webhooks
- Log messages: "Invalid Stripe webhook signature"
- Subscriptions not updating

**Investigation Steps:**

1. Verify webhook secret is correct:

   ```bash
   # Check environment variable
   echo $STRIPE_WEBHOOK_SECRET

   # Compare with Stripe Dashboard > Developers > Webhooks
   ```

2. Check for proxy/load balancer issues:

   ```bash
   # Ensure raw body is preserved
   # Check nginx/load balancer config for body buffering
   ```

3. Verify clock sync:
   ```bash
   # Stripe rejects events if timestamp is too old
   timedatectl status
   ```

**Resolution:**

- Update `STRIPE_WEBHOOK_SECRET` environment variable
- Restart `payments-svc`
- Re-send failed webhooks from Stripe dashboard

### 4. "Entitlements not matching subscription"

**Symptoms:**

- User has premium subscription but missing features
- Entitlements count doesn't match active subscriptions

**Investigation Steps:**

```sql
-- Check subscription status
SELECT id, plan_id, status, current_period_end
FROM subscriptions
WHERE billing_account_id = '<BILLING_ACCOUNT_ID>'
  AND status IN ('ACTIVE', 'IN_TRIAL');

-- Verify entitlements
SELECT * FROM entitlements
WHERE tenant_id = '<TENANT_ID>';
```

**Resolution:**

1. Force entitlements recalculation:

   ```bash
   curl -X POST http://localhost:4080/internal/recalculate \
     -H "Content-Type: application/json" \
     -d '{"tenantId": "<TENANT_ID>", "tenantType": "PARENT"}'
   ```

2. If mismatch persists, validate subscription count matches:
   ```bash
   curl http://localhost:4080/internal/validate/<TENANT_ID>
   ```

---

## Investigation Procedures

### Finding Events by Correlation ID

All billing operations include a `correlationId` for tracing:

```bash
# Search all payments-svc logs
grep '<CORRELATION_ID>' /var/log/payments-svc/*.log

# Example structured log query (if using Elasticsearch/Kibana)
# correlationId: "<CORRELATION_ID>" AND service: "payments-svc"
```

### Checking Webhook Processing

```sql
-- Recent webhook events
SELECT
  provider_event_id,
  event_type,
  created_at,
  payload->>'correlationId' as correlation_id
FROM payment_events
ORDER BY created_at DESC
LIMIT 50;

-- Failed webhooks (check logs)
-- Look for: "Error processing webhook"
```

### Verifying Stripe State

```bash
# List recent Stripe events (using Stripe CLI)
stripe events list --limit 20

# Get specific subscription
stripe subscriptions retrieve <SUB_ID>

# Get customer invoices
stripe invoices list --customer <CUS_ID> --limit 10
```

---

## Dunning Flow

### Timeline

| Day | Action       | Description                                 |
| --- | ------------ | ------------------------------------------- |
| 0   | Banner shown | Payment failed, user sees notification      |
| 3   | Stripe retry | Automatic retry via Stripe                  |
| 7   | Downgrade    | Entitlements revoked, subscription canceled |

### Dunning States

```sql
-- Check dunning state for subscription
SELECT
  s.id,
  s.status,
  de.step,
  de.step_started_at,
  de.scheduled_for,
  de.completed
FROM subscriptions s
LEFT JOIN dunning_events de ON de.subscription_id = s.id
WHERE s.billing_account_id = '<BILLING_ACCOUNT_ID>'
  AND s.status = 'PAST_DUE';
```

### Manual Dunning Override

```bash
# Skip to day 7 (force downgrade)
curl -X POST http://localhost:4070/internal/dunning/execute \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionId": "<SUBSCRIPTION_ID>",
    "action": "DOWNGRADE_ENTITLEMENTS"
  }'

# Recover subscription (after successful payment)
curl -X POST http://localhost:4070/internal/dunning/recover \
  -H "Content-Type: application/json" \
  -d '{"subscriptionId": "<SUBSCRIPTION_ID>"}'
```

---

## Metrics and Monitoring

### Available Metrics

Access metrics at: `http://localhost:4070/internal/metrics`

| Metric                                | Type    | Description                           |
| ------------------------------------- | ------- | ------------------------------------- |
| `billing_subscriptions_created_total` | Counter | New subscriptions by plan/tenant type |
| `billing_invoices_total`              | Counter | Invoices by status (paid/failed)      |
| `billing_webhook_events_total`        | Counter | Webhook events by type                |
| `billing_webhook_failures_total`      | Counter | Failed webhook processing             |
| `billing_payments_total`              | Counter | Payment attempts                      |
| `billing_dunning_actions_total`       | Counter | Dunning actions taken                 |
| `billing_subscriptions_active`        | Gauge   | Current active subscriptions          |
| `billing_trials_active`               | Gauge   | Current trials                        |
| `billing_trials_expiring_soon`        | Gauge   | Trials expiring in 7 days             |

### Alert Thresholds

| Metric                                           | Warning | Critical |
| ------------------------------------------------ | ------- | -------- |
| `webhook_failures_total` (1h)                    | > 10    | > 50     |
| `invoices_failed_total` (1h)                     | > 20    | > 100    |
| `dunning_actions_total{action="downgrade"}` (1d) | > 50    | > 200    |

### Grafana Queries

```promql
# Webhook failure rate
rate(billing_webhook_failures_total[5m])

# Invoice failure rate by currency
sum by (currency) (rate(billing_invoices_total{status="failed"}[1h]))

# Active subscription count
billing_subscriptions_active

# Dunning activity
sum by (action) (rate(billing_dunning_actions_total[1d]))
```

---

## Emergency Procedures

### Webhook Backlog

If Stripe shows failed webhooks piling up:

1. Check service health:

   ```bash
   curl http://localhost:4070/health
   ```

2. Check logs for errors:

   ```bash
   tail -100 /var/log/payments-svc/error.log
   ```

3. If database issues, check connection:

   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

4. Re-send failed webhooks from Stripe dashboard (one at a time)

### Mass Subscription Sync

If many subscriptions are out of sync:

```bash
# Export Stripe subscriptions
stripe subscriptions list --status active --limit 100 > stripe_subs.json

# Run sync script (creates audit trail)
node scripts/sync-subscriptions.js stripe_subs.json --dry-run
node scripts/sync-subscriptions.js stripe_subs.json --execute
```

### Disable Dunning (Emergency)

If dunning is causing issues:

```bash
# Set environment variable
export DUNNING_ENABLED=false

# Restart payments-svc
systemctl restart payments-svc

# Alternative: Skip all pending dunning
UPDATE dunning_events
SET completed = true,
    completed_at = NOW(),
    completion_reason = 'EMERGENCY_SKIP'
WHERE completed = false;
```

---

## Contact

- **On-call SRE:** Check PagerDuty rotation
- **Billing Questions:** billing-support@aivo.com
- **Stripe Issues:** Stripe Dashboard > Support

---

_Last updated: 2025-01-14_
