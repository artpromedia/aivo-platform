# Billing & Subscription Data Model

This document describes the billing and subscription data model for the Aivo Learning Platform.

## Overview

The billing system supports two primary customer types:

1. **Parent Consumers** - Individual parents subscribing for their children
2. **Districts** - Schools/districts with seat-based licensing

Both customer types share a common data model with business logic differentiating their behavior.

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐
│     tenants     │     │      users      │
│   (external)    │     │   (external)    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │ tenant_id             │ owner_user_id
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│           billing_accounts              │
├─────────────────────────────────────────┤
│ • id (UUID, PK)                         │
│ • tenant_id (UUID, FK)                  │
│ • account_type (enum)                   │
│ • owner_user_id (UUID, FK, nullable)    │
│ • display_name                          │
│ • provider (enum)                       │
│ • provider_customer_id                  │
│ • default_currency                      │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌─────────┐ ┌───────────┐ ┌─────────┐
│billing_ │ │subscript- │ │invoices │
│instru-  │ │ions       │ │         │
│ments    │ │           │ │         │
└─────────┘ └─────┬─────┘ └────┬────┘
                  │            │
            ┌─────┴─────┐      │
            │           │      │
            ▼           ▼      ▼
      ┌──────────┐ ┌──────────────┐
      │subscript-│ │invoice_line_ │
      │ion_items │ │items         │
      └──────────┘ └──────────────┘
            │
            ▼
      ┌──────────┐
      │  plans   │
      └──────────┘
```

## Core Tables

### 1. billing_accounts

The central entity representing a paying customer.

| Column                 | Type       | Description                                                   |
| ---------------------- | ---------- | ------------------------------------------------------------- |
| `id`                   | UUID       | Primary key                                                   |
| `tenant_id`            | UUID       | Reference to tenant (consumer or district)                    |
| `account_type`         | enum       | `PARENT_CONSUMER`, `DISTRICT`, `PLATFORM_INTERNAL`            |
| `owner_user_id`        | UUID       | For parents: the user who owns/manages the account            |
| `display_name`         | text       | Human-readable name ("Smith Family", "North Valley District") |
| `provider`             | enum       | `STRIPE`, `MANUAL_INVOICE`, `TEST_FAKE`                       |
| `provider_customer_id` | text       | External ID in payment provider (e.g., Stripe `cus_xxx`)      |
| `default_currency`     | varchar(3) | Currency code (default: `USD`)                                |
| `billing_email`        | text       | Email for billing notifications                               |
| `metadata_json`        | JSONB      | Tax info, contract terms, etc.                                |

**Parent vs District:**

- Parents: `owner_user_id` is set, `account_type` = `PARENT_CONSUMER`
- Districts: `owner_user_id` is null, `account_type` = `DISTRICT`

### 2. plans

Available subscription plans and their pricing.

| Column             | Type  | Description                                                      |
| ------------------ | ----- | ---------------------------------------------------------------- |
| `id`               | UUID  | Primary key                                                      |
| `sku`              | text  | Unique identifier (e.g., `PARENT_BASE_MONTHLY`)                  |
| `plan_type`        | enum  | `PARENT_BASE`, `PARENT_ADDON`, `DISTRICT_BASE`, `DISTRICT_ADDON` |
| `name`             | text  | Display name                                                     |
| `unit_price_cents` | int   | Price per unit per billing period                                |
| `billing_period`   | enum  | `MONTHLY`, `YEARLY`                                              |
| `trial_days`       | int   | Trial duration (0 = no trial)                                    |
| `metadata_json`    | JSONB | Modules included, limits, features                               |

**Default Plans (seeded):**

| SKU                     | Type     | Price             | Description                     |
| ----------------------- | -------- | ----------------- | ------------------------------- |
| `PARENT_BASE_MONTHLY`   | Base     | $19.99/mo         | ELA + Math per child            |
| `PARENT_BASE_YEARLY`    | Base     | $169.99/yr        | ELA + Math annual               |
| `ADDON_SEL_MONTHLY`     | Add-on   | $4.99/mo          | Social-Emotional Learning       |
| `ADDON_SPEECH_MONTHLY`  | Add-on   | $7.99/mo          | Speech & Communication          |
| `ADDON_SCIENCE_MONTHLY` | Add-on   | $4.99/mo          | Science curriculum              |
| `ADDON_CODING_MONTHLY`  | Add-on   | $6.99/mo          | Coding & computational thinking |
| `DISTRICT_BASE_MONTHLY` | District | $8.00/learner/mo  | District base license           |
| `DISTRICT_BASE_YEARLY`  | District | $72.00/learner/yr | District annual license         |

### 3. subscriptions

Active or historical subscription agreements.

| Column                     | Type        | Description                                             |
| -------------------------- | ----------- | ------------------------------------------------------- |
| `id`                       | UUID        | Primary key                                             |
| `billing_account_id`       | UUID        | FK to billing_accounts                                  |
| `plan_id`                  | UUID        | FK to plans                                             |
| `status`                   | enum        | `IN_TRIAL`, `ACTIVE`, `PAST_DUE`, `CANCELED`, `EXPIRED` |
| `quantity`                 | int         | # of children (parent) or seats (district)              |
| `trial_start_at`           | timestamptz | Trial period start                                      |
| `trial_end_at`             | timestamptz | Trial period end                                        |
| `current_period_start`     | timestamptz | Current billing period start                            |
| `current_period_end`       | timestamptz | Current billing period end                              |
| `cancel_at_period_end`     | boolean     | If true, won't renew                                    |
| `provider_subscription_id` | text        | External ID (Stripe `sub_xxx`)                          |
| `metadata_json`            | JSONB       | Unlocked modules, contract info                         |

### 4. subscription_items

Individual items within a subscription (for itemized billing).

| Column            | Type | Description                           |
| ----------------- | ---- | ------------------------------------- |
| `id`              | UUID | Primary key                           |
| `subscription_id` | UUID | FK to subscriptions                   |
| `plan_id`         | UUID | FK to plans                           |
| `sku`             | text | SKU reference                         |
| `quantity`        | int  | Quantity of this item                 |
| `learner_id`      | UUID | Optional: specific learner allocation |

**Use Cases:**

- Track which add-on modules each child has
- District seat allocation per learner
- Itemized billing breakdowns

### 5. billing_instruments

Stored payment methods (tokenized, never raw card data).

| Column                       | Type       | Description                   |
| ---------------------------- | ---------- | ----------------------------- |
| `id`                         | UUID       | Primary key                   |
| `billing_account_id`         | UUID       | FK to billing_accounts        |
| `provider_payment_method_id` | text       | Token (Stripe `pm_xxx`)       |
| `brand`                      | text       | Card brand (visa, mastercard) |
| `last4`                      | varchar(4) | Last 4 digits                 |
| `expiry_month`               | smallint   | 1-12                          |
| `expiry_year`                | smallint   | e.g., 2025                    |
| `is_default`                 | boolean    | Default payment method        |

### 6. invoices

Billing invoices for charges and payments.

| Column               | Type        | Description                                      |
| -------------------- | ----------- | ------------------------------------------------ |
| `id`                 | UUID        | Primary key                                      |
| `billing_account_id` | UUID        | FK to billing_accounts                           |
| `invoice_number`     | text        | Human-readable (INV-2024-00001)                  |
| `amount_due_cents`   | int         | Total due                                        |
| `amount_paid_cents`  | int         | Amount paid                                      |
| `status`             | enum        | `DRAFT`, `OPEN`, `PAID`, `VOID`, `UNCOLLECTIBLE` |
| `period_start`       | timestamptz | Period covered                                   |
| `period_end`         | timestamptz | Period covered                                   |
| `metadata_json`      | JSONB       | Proration info, adjustments                      |

### 7. invoice_line_items

Individual charges on invoices.

| Column             | Type  | Description                                       |
| ------------------ | ----- | ------------------------------------------------- |
| `id`               | UUID  | Primary key                                       |
| `invoice_id`       | UUID  | FK to invoices                                    |
| `subscription_id`  | UUID  | Optional: linked subscription                     |
| `description`      | text  | Charge description                                |
| `unit_price_cents` | int   | Unit price                                        |
| `quantity`         | int   | Quantity                                          |
| `amount_cents`     | int   | Total (may differ for prorations)                 |
| `line_item_type`   | text  | `subscription`, `proration`, `credit`, `one_time` |
| `metadata_json`    | JSONB | Proration factor, reason                          |

## Subscription Flows

### Parent Subscription Flow

```
1. Parent signs up
   └─> Create billing_account (type=PARENT_CONSUMER, owner_user_id=parent)
   └─> Create Stripe customer
   └─> Store provider_customer_id

2. Parent adds child to base plan
   └─> Create subscription (plan=PARENT_BASE, quantity=1, status=IN_TRIAL)
   └─> Create subscription_item (learner_id=child)
   └─> Set trial_end_at = now + 30 days

3. Parent adds SEL module for child
   └─> Create subscription_item on existing subscription OR new subscription
   └─> Start trial for add-on

4. Trial ends
   └─> If payment method on file: charge and transition to ACTIVE
   └─> If no payment method: transition to EXPIRED

5. Monthly renewal
   └─> Create invoice with line_items
   └─> Charge payment method
   └─> Update current_period_start/end
```

### District Contract Flow

```
1. District contract signed
   └─> Create billing_account (type=DISTRICT)
   └─> provider = MANUAL_INVOICE (or STRIPE)

2. Create subscription
   └─> plan = DISTRICT_BASE_YEARLY
   └─> quantity = contracted seats (e.g., 500)
   └─> trial_days = 0 (no trial for districts)
   └─> metadata_json = { "contractNumber": "DST-2024-001", ... }

3. Allocate seats to learners
   └─> Create subscription_items for each learner
   └─> Track usage against quantity limit

4. Invoice generation
   └─> Manual or automated based on contract terms
   └─> May include prorations for seat changes

5. Mid-year seat increase
   └─> Update subscription.quantity
   └─> Create prorated invoice line_item
```

## Trial Handling

### Trial Fields

- `trial_start_at`: When trial began
- `trial_end_at`: When trial ends (triggers conversion or expiration)
- `status = IN_TRIAL`: Currently in trial

### Trial Conversion Logic

```typescript
async function processTrialEnd(subscription: Subscription) {
  if (subscription.trialEndAt <= now) {
    const billingAccount = await getBillingAccount(subscription.billingAccountId);
    const hasPaymentMethod = await hasDefaultPaymentMethod(billingAccount.id);

    if (hasPaymentMethod) {
      // Charge and activate
      await chargeSubscription(subscription);
      await updateStatus(subscription.id, 'ACTIVE');
    } else {
      // No payment method - expire
      await updateStatus(subscription.id, 'EXPIRED');
      await notifyTrialExpired(billingAccount);
    }
  }
}
```

## Proration Handling

Prorations are stored in `invoice_line_items.metadata_json`:

```json
{
  "lineItemType": "proration",
  "prorationFactor": 0.5,
  "originalPeriodStart": "2024-01-01T00:00:00Z",
  "originalPeriodEnd": "2024-01-31T00:00:00Z",
  "reason": "mid-cycle upgrade from PARENT_BASE to PARENT_BASE + ADDON_SEL"
}
```

### Proration Scenarios

1. **Mid-cycle upgrade**: Credit remaining time on old plan, charge prorated new plan
2. **Seat increase (district)**: Charge prorated amount for new seats
3. **Downgrade**: Credit applied to next invoice

## Common Queries

### All active subscriptions for a tenant

```sql
SELECT s.*
FROM subscriptions s
JOIN billing_accounts ba ON s.billing_account_id = ba.id
WHERE ba.tenant_id = $1
  AND s.status IN ('IN_TRIAL', 'ACTIVE');
```

### All invoices for a parent

```sql
SELECT i.*
FROM invoices i
JOIN billing_accounts ba ON i.billing_account_id = ba.id
WHERE ba.owner_user_id = $1
ORDER BY i.issued_at DESC;
```

### Subscriptions expiring in next 7 days

```sql
SELECT s.*, ba.billing_email
FROM subscriptions s
JOIN billing_accounts ba ON s.billing_account_id = ba.id
WHERE s.status = 'IN_TRIAL'
  AND s.trial_end_at BETWEEN now() AND now() + interval '7 days';
```

### District seat utilization

```sql
SELECT
  s.id as subscription_id,
  s.quantity as contracted_seats,
  COUNT(si.id) as allocated_seats,
  s.quantity - COUNT(si.id) as available_seats
FROM subscriptions s
LEFT JOIN subscription_items si ON si.subscription_id = s.id
JOIN billing_accounts ba ON s.billing_account_id = ba.id
WHERE ba.account_type = 'DISTRICT'
  AND s.status = 'ACTIVE'
GROUP BY s.id;
```

## Indexes

| Table                | Index                                  | Purpose                           |
| -------------------- | -------------------------------------- | --------------------------------- |
| `billing_accounts`   | `(tenant_id, account_type)`            | Find accounts by tenant           |
| `billing_accounts`   | `(provider_customer_id)`               | Webhook lookups                   |
| `subscriptions`      | `(billing_account_id, status)`         | Active subs for account           |
| `subscriptions`      | `(status, current_period_end)`         | Renewal processing                |
| `invoices`           | `(billing_account_id, issued_at DESC)` | Invoice history                   |
| `subscription_items` | `(learner_id)`                         | Find what a learner has access to |

## Payment Provider Integration

The schema is provider-agnostic. Key integration points:

1. **Customer creation**: Store `provider_customer_id` in `billing_accounts`
2. **Subscription creation**: Store `provider_subscription_id` in `subscriptions`
3. **Payment methods**: Store `provider_payment_method_id` in `billing_instruments`
4. **Invoices**: Store `provider_invoice_id` in `invoices`
5. **Webhooks**: Process events and update local state

### Supported Providers

- `STRIPE`: Full integration with Stripe Billing
- `MANUAL_INVOICE`: For districts with PO/check payment
- `TEST_FAKE`: Development/testing without real payments

## Security Considerations

1. **Never store raw card data** - Only tokenized references and last4/brand
2. **PCI compliance** - Use Stripe Elements or similar for card collection
3. **RBAC** - Parents see only their accounts; districts see their tenant
4. **Audit trail** - All tables have `created_at`/`updated_at`

## Future Extensions

1. **Usage-based billing**: `usage_records` table ready for metered billing
2. **Coupons/discounts**: Add `coupons` and `subscription_discounts` tables
3. **Multiple currencies**: Already supports `default_currency` per account
4. **Referral credits**: Track in `invoice_line_items` with type `credit`
