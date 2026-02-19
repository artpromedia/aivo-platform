-- =============================================================================
-- AIVO Learning — Newsletter Subscription System
-- =============================================================================
-- Target: enterprise-email-postgres (oonrumail-postgres container)
-- Database: enterprise_email
-- User: email_admin
--
-- Creates the newsletter management schema for aivolearning.com:
--   • newsletter_lists         – mailing list definitions
--   • newsletter_subscribers   – subscriber records with double opt-in
--   • newsletter_campaigns     – campaign / send history
--   • newsletter_send_log      – per-recipient delivery log
--
-- Seeds:
--   • 2 default lists (weekly-digest, course-announcements)
--   • 2 email templates (newsletter branded layout, newsletter_confirm)
--
-- Run:
--   docker exec -i oonrumail-postgres psql -U email_admin -d enterprise_email < scripts/provision_aivolearning_newsletter.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. NEWSLETTER LISTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_lists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(64)  NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    from_name       VARCHAR(255) NOT NULL DEFAULT 'AIVO Learning',
    from_email      VARCHAR(255) NOT NULL DEFAULT 'newsletter@aivolearning.com',
    reply_to        VARCHAR(255),
    double_opt_in   BOOLEAN      NOT NULL DEFAULT TRUE,
    welcome_email   BOOLEAN      NOT NULL DEFAULT TRUE,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    settings        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    subscriber_count INTEGER     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_lists_slug    ON newsletter_lists (slug);
CREATE INDEX IF NOT EXISTS idx_newsletter_lists_active  ON newsletter_lists (is_active);

-- ---------------------------------------------------------------------------
-- 2. NEWSLETTER SUBSCRIBERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id         UUID         NOT NULL REFERENCES newsletter_lists(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    first_name      VARCHAR(128),
    last_name       VARCHAR(128),
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'unsubscribed', 'bounced', 'complained')),
    confirm_token   VARCHAR(128),
    confirmed_at    TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,
    source          VARCHAR(64)  DEFAULT 'website',
    ip_address      INET,
    metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (list_id, email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subs_list     ON newsletter_subscribers (list_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subs_email    ON newsletter_subscribers (email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subs_status   ON newsletter_subscribers (list_id, status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subs_token    ON newsletter_subscribers (confirm_token) WHERE confirm_token IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. NEWSLETTER CAMPAIGNS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id         UUID         NOT NULL REFERENCES newsletter_lists(id) ON DELETE CASCADE,
    subject         VARCHAR(500) NOT NULL,
    preview_text    VARCHAR(255),
    from_name       VARCHAR(255),
    from_email      VARCHAR(255),
    html_body       TEXT,
    text_body       TEXT,
    template_id     VARCHAR(128),
    template_data   JSONB        DEFAULT '{}'::jsonb,
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed')),
    scheduled_at    TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    total_sent      INTEGER      NOT NULL DEFAULT 0,
    total_delivered  INTEGER     NOT NULL DEFAULT 0,
    total_opened    INTEGER      NOT NULL DEFAULT 0,
    total_clicked   INTEGER      NOT NULL DEFAULT 0,
    total_bounced   INTEGER      NOT NULL DEFAULT 0,
    total_complained INTEGER     NOT NULL DEFAULT 0,
    total_unsubscribed INTEGER   NOT NULL DEFAULT 0,
    tags            TEXT[]       DEFAULT '{}',
    metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_camp_list    ON newsletter_campaigns (list_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_camp_status  ON newsletter_campaigns (status);
CREATE INDEX IF NOT EXISTS idx_newsletter_camp_sent    ON newsletter_campaigns (sent_at DESC) WHERE sent_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. NEWSLETTER SEND LOG (per-recipient delivery tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_send_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID         NOT NULL REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
    subscriber_id   UUID         NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed')),
    provider_id     VARCHAR(255),
    opened_at       TIMESTAMPTZ,
    clicked_at      TIMESTAMPTZ,
    bounced_at      TIMESTAMPTZ,
    bounce_reason   TEXT,
    error_message   TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_log_campaign ON newsletter_send_log (campaign_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_log_sub      ON newsletter_send_log (subscriber_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_log_status   ON newsletter_send_log (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_newsletter_log_email    ON newsletter_send_log (email);

-- ---------------------------------------------------------------------------
-- 5. UPDATED_AT TRIGGER FUNCTION
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION newsletter_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply auto-update trigger to all newsletter tables
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['newsletter_lists', 'newsletter_subscribers', 'newsletter_campaigns', 'newsletter_send_log']
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I; CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION newsletter_set_updated_at();',
            tbl, tbl, tbl, tbl
        );
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. SUBSCRIBER COUNT SYNC FUNCTION
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION newsletter_sync_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE newsletter_lists
        SET subscriber_count = (
            SELECT COUNT(*) FROM newsletter_subscribers
            WHERE list_id = NEW.list_id AND status = 'active'
        )
        WHERE id = NEW.list_id;
    END IF;
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.list_id <> NEW.list_id) THEN
        UPDATE newsletter_lists
        SET subscriber_count = (
            SELECT COUNT(*) FROM newsletter_subscribers
            WHERE list_id = OLD.list_id AND status = 'active'
        )
        WHERE id = OLD.list_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_newsletter_sub_count ON newsletter_subscribers;
CREATE TRIGGER trg_newsletter_sub_count
AFTER INSERT OR UPDATE OF status, list_id OR DELETE
ON newsletter_subscribers
FOR EACH ROW
EXECUTE FUNCTION newsletter_sync_subscriber_count();

-- ---------------------------------------------------------------------------
-- 7. SEED DATA — DEFAULT LISTS
-- ---------------------------------------------------------------------------
INSERT INTO newsletter_lists (slug, name, description, from_name, from_email, reply_to, double_opt_in, welcome_email, settings)
VALUES
(
    'weekly-digest',
    'AIVO Weekly Digest',
    'Weekly roundup of learning tips, platform updates, and curated educational resources for K-12 educators and parents.',
    'AIVO Learning',
    'digest@aivolearning.com',
    'hello@aivolearning.com',
    TRUE,
    TRUE,
    '{"frequency": "weekly", "sendDay": "tuesday", "sendHour": 9, "timezone": "America/Chicago"}'::jsonb
),
(
    'course-announcements',
    'Course & Feature Announcements',
    'Be the first to know about new courses, curriculum updates, and platform features.',
    'AIVO Learning',
    'announcements@aivolearning.com',
    'hello@aivolearning.com',
    FALSE,
    TRUE,
    '{"frequency": "as-needed"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. SEED DATA — EMAIL TEMPLATES (stored in newsletter_campaigns as drafts)
-- ---------------------------------------------------------------------------
-- These serve as reusable template campaigns that can be cloned for sends.

INSERT INTO newsletter_campaigns (
    list_id, subject, preview_text, status, template_id, template_data, tags, metadata
)
SELECT
    nl.id,
    'Welcome to the AIVO Weekly Digest!',
    'Your weekly dose of K-12 learning insights is here.',
    'draft',
    'newsletter-branded-layout',
    jsonb_build_object(
        'headerLogo', 'https://aivolearning.com/images/aivo-logo-horizontal-purple.svg',
        'headerColor', '#4F46E5',
        'footerText', '© AIVO Learning · Minneapolis, MN',
        'unsubscribeUrl', '{{unsubscribeUrl}}',
        'preferencesUrl', 'https://aivolearning.com/email-preferences'
    ),
    ARRAY['template', 'welcome', 'weekly-digest'],
    '{"isTemplate": true, "templateName": "newsletter-branded-layout"}'::jsonb
FROM newsletter_lists nl
WHERE nl.slug = 'weekly-digest'
ON CONFLICT DO NOTHING;

INSERT INTO newsletter_campaigns (
    list_id, subject, preview_text, status, template_id, template_data, tags, metadata
)
SELECT
    nl.id,
    'Please Confirm Your Subscription',
    'One click to confirm your AIVO Learning newsletter subscription.',
    'draft',
    'newsletter-confirm',
    jsonb_build_object(
        'headerLogo', 'https://aivolearning.com/images/aivo-logo-horizontal-purple.svg',
        'confirmUrl', '{{confirmUrl}}',
        'listName', '{{listName}}',
        'supportEmail', 'hello@aivolearning.com'
    ),
    ARRAY['template', 'double-opt-in', 'confirmation'],
    '{"isTemplate": true, "templateName": "newsletter-confirm"}'::jsonb
FROM newsletter_lists nl
WHERE nl.slug = 'weekly-digest'
ON CONFLICT DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFICATION
-- ---------------------------------------------------------------------------
\echo '--- Newsletter Lists ---'
SELECT id, slug, name, double_opt_in, subscriber_count FROM newsletter_lists ORDER BY slug;

\echo '--- Newsletter Campaign Templates ---'
SELECT id, subject, template_id, status, array_to_string(tags, ', ') AS tags FROM newsletter_campaigns ORDER BY subject;

\echo ''
\echo '✓ AIVO Learning newsletter schema provisioned successfully.'
