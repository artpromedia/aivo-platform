-- User language/locale preferences
-- Sprint 15: Data Residency & Internationalization

CREATE TABLE IF NOT EXISTS user_preferences (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       VARCHAR(64) NOT NULL UNIQUE,
  locale        VARCHAR(10) NOT NULL DEFAULT 'en',
  timezone      VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_locale CHECK (locale IN ('en','es','fr','de','pt','ar','zh','ja','ko','hi'))
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
