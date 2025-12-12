-- CreateView: vw_billing_status
-- A materialized view for FinOps reconciliation dashboard
-- Shows billing accounts with subscription status, invoice status, and payment health

-- Drop view if it exists (for idempotency)
DROP VIEW IF EXISTS vw_billing_status;

-- Create the billing status view
CREATE VIEW vw_billing_status AS
SELECT
    ba.id AS billing_account_id,
    ba."tenantId" AS tenant_id,
    ba."accountType" AS account_type,
    ba."displayName" AS display_name,
    ba."billingEmail" AS billing_email,
    ba.provider AS payment_provider,
    ba."providerCustomerId" AS stripe_customer_id,
    ba."createdAt" AS account_created_at,
    
    -- Subscription summary
    COUNT(DISTINCT s.id) AS total_subscriptions,
    COUNT(DISTINCT CASE WHEN s.status = 'ACTIVE' THEN s.id END) AS active_subscriptions,
    COUNT(DISTINCT CASE WHEN s.status = 'IN_TRIAL' THEN s.id END) AS trial_subscriptions,
    COUNT(DISTINCT CASE WHEN s.status = 'PAST_DUE' THEN s.id END) AS past_due_subscriptions,
    COUNT(DISTINCT CASE WHEN s.status = 'CANCELED' THEN s.id END) AS canceled_subscriptions,
    
    -- Latest subscription info
    MAX(s."currentPeriodEnd") AS latest_period_end,
    MIN(CASE WHEN s.status = 'PAST_DUE' THEN s."currentPeriodEnd" END) AS past_due_since,
    
    -- Invoice summary
    COUNT(DISTINCT i.id) AS total_invoices,
    COUNT(DISTINCT CASE WHEN i.status = 'OPEN' THEN i.id END) AS open_invoices,
    COUNT(DISTINCT CASE WHEN i.status = 'PAID' THEN i.id END) AS paid_invoices,
    COUNT(DISTINCT CASE WHEN i.status = 'UNCOLLECTIBLE' THEN i.id END) AS uncollectible_invoices,
    
    -- Financial summary (in cents)
    COALESCE(SUM(i."amountDueCents"), 0) AS total_invoiced_cents,
    COALESCE(SUM(i."amountPaidCents"), 0) AS total_collected_cents,
    COALESCE(SUM(CASE WHEN i.status = 'OPEN' THEN i."amountDueCents" - i."amountPaidCents" ELSE 0 END), 0) AS outstanding_balance_cents,
    
    -- Payment health score (simple heuristic)
    CASE
        WHEN COUNT(DISTINCT CASE WHEN s.status = 'PAST_DUE' THEN s.id END) > 0 THEN 'AT_RISK'
        WHEN COUNT(DISTINCT CASE WHEN i.status = 'OPEN' AND i."dueAt" < NOW() THEN i.id END) > 0 THEN 'OVERDUE'
        WHEN COUNT(DISTINCT CASE WHEN s.status = 'ACTIVE' THEN s.id END) > 0 THEN 'HEALTHY'
        WHEN COUNT(DISTINCT CASE WHEN s.status = 'IN_TRIAL' THEN s.id END) > 0 THEN 'TRIAL'
        ELSE 'INACTIVE'
    END AS health_status,
    
    -- Recent activity
    MAX(pe."createdAt") AS last_payment_event_at,
    MAX(i."paidAt") AS last_payment_at,
    
    -- MRR calculation (monthly recurring revenue in cents)
    COALESCE(SUM(
        CASE 
            WHEN s.status IN ('ACTIVE', 'IN_TRIAL') AND p."billingPeriod" = 'MONTHLY' 
            THEN p."unitPriceCents" * s.quantity
            WHEN s.status IN ('ACTIVE', 'IN_TRIAL') AND p."billingPeriod" = 'YEARLY' 
            THEN (p."unitPriceCents" * s.quantity) / 12
            ELSE 0
        END
    ), 0) AS mrr_cents

FROM billing_accounts ba
LEFT JOIN subscriptions s ON s."billingAccountId" = ba.id
LEFT JOIN plans p ON s."planId" = p.id
LEFT JOIN invoices i ON i."billingAccountId" = ba.id
LEFT JOIN payment_events pe ON pe."billingAccountId" = ba.id

GROUP BY
    ba.id,
    ba."tenantId",
    ba."accountType",
    ba."displayName",
    ba."billingEmail",
    ba.provider,
    ba."providerCustomerId",
    ba."createdAt";

-- Create index suggestions for performance (run manually if needed)
-- These are comments since indexes on views aren't directly possible
-- Instead, ensure underlying tables have proper indexes:
-- - billing_accounts: id, tenantId, accountType
-- - subscriptions: billingAccountId, status
-- - invoices: billingAccountId, status
-- - payment_events: billingAccountId

-- Create a summary stats view for dashboard widgets
CREATE VIEW vw_billing_summary_stats AS
SELECT
    COUNT(DISTINCT billing_account_id) AS total_accounts,
    COUNT(DISTINCT CASE WHEN health_status = 'HEALTHY' THEN billing_account_id END) AS healthy_accounts,
    COUNT(DISTINCT CASE WHEN health_status = 'AT_RISK' THEN billing_account_id END) AS at_risk_accounts,
    COUNT(DISTINCT CASE WHEN health_status = 'OVERDUE' THEN billing_account_id END) AS overdue_accounts,
    COUNT(DISTINCT CASE WHEN health_status = 'TRIAL' THEN billing_account_id END) AS trial_accounts,
    COUNT(DISTINCT CASE WHEN health_status = 'INACTIVE' THEN billing_account_id END) AS inactive_accounts,
    SUM(total_subscriptions) AS total_subscriptions,
    SUM(active_subscriptions) AS active_subscriptions,
    SUM(past_due_subscriptions) AS past_due_subscriptions,
    SUM(total_invoiced_cents) AS total_invoiced_cents,
    SUM(total_collected_cents) AS total_collected_cents,
    SUM(outstanding_balance_cents) AS outstanding_balance_cents,
    SUM(mrr_cents) AS total_mrr_cents
FROM vw_billing_status;
