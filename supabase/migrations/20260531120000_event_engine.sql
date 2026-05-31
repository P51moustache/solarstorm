-- =====================================================
-- EVENT NOTIFICATION ENGINE (Phase 1)
-- Customizable, server-side space-weather event alerts.
-- See docs/plans/2026-05-31-ios-notification-app-plan.md
-- =====================================================

-- Collapse to a simple two-state subscription model while keeping legacy
-- values valid. 'subscribed' = an active paid subscriber (set by the
-- RevenueCat webhook in Phase 4); anything other than 'free' is treated as
-- subscribed by the poller.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tier_check
  CHECK (tier IN ('free', 'plus', 'pro', 'subscribed'));

-- -----------------------------------------------------
-- Catalog of metrics a user can build alert rules on.
-- Seeded, not user-editable. The poller only evaluates the metrics it knows
-- how to fetch (currently kp, bz, solar_wind_speed); new rows can be added
-- here as the poller learns new feeds.
-- -----------------------------------------------------
CREATE TABLE public.event_metrics (
  key        TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  unit       TEXT,
  direction  TEXT NOT NULL DEFAULT 'either'
               CHECK (direction IN ('above', 'below', 'either'))
);

INSERT INTO public.event_metrics (key, label, unit, direction) VALUES
  ('kp',                'Kp index',         NULL,    'above'),
  ('bz',                'IMF Bz (GSM)',     'nT',    'below'),
  ('solar_wind_speed',  'Solar wind speed', 'km/s',  'above');

-- -----------------------------------------------------
-- A user's customized subscription to an event.
-- -----------------------------------------------------
CREATE TABLE public.alert_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric_key   TEXT NOT NULL REFERENCES public.event_metrics(key),
  comparator   TEXT NOT NULL CHECK (comparator IN ('gte', 'lte')),
  threshold    DOUBLE PRECISION NOT NULL,
  sustain_min  INTEGER NOT NULL DEFAULT 0 CHECK (sustain_min >= 0),   -- condition held for N minutes
  cooldown_min INTEGER NOT NULL DEFAULT 90 CHECK (cooldown_min >= 0), -- debounce per rule
  quiet_start  TIME,                                                  -- per-rule quiet hours (UTC, Phase 1)
  quiet_end    TIME,
  enabled      BOOLEAN NOT NULL DEFAULT true,
  is_preset    BOOLEAN NOT NULL DEFAULT false,                        -- preset rules fire for free users too
  label        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_rules_user_id ON public.alert_rules(user_id);
CREATE INDEX idx_alert_rules_enabled ON public.alert_rules(enabled);

-- -----------------------------------------------------
-- Push targets. One row per device (Expo push token -> APNs/FCM).
-- Supersedes the web-only push_subscriptions table for mobile.
-- -----------------------------------------------------
CREATE TABLE public.device_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_token TEXT NOT NULL,
  platform   TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, expo_token)
);

CREATE INDEX idx_device_tokens_user_id ON public.device_tokens(user_id);

-- -----------------------------------------------------
-- Reuse alert_log for server-side dedup/cooldown and the user's history feed.
-- payload (JSONB) holds the metric snapshot at fire time.
-- -----------------------------------------------------
ALTER TABLE public.alert_log
  ADD COLUMN rule_id UUID REFERENCES public.alert_rules(id) ON DELETE SET NULL;

CREATE INDEX idx_alert_log_rule_id ON public.alert_log(rule_id);

-- -----------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
-- event_metrics is a public read-only catalog.
ALTER TABLE public.event_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read event metrics"
  ON public.event_metrics FOR SELECT
  USING (true);

CREATE POLICY "Users can view own alert rules"
  ON public.alert_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert rules"
  ON public.alert_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert rules"
  ON public.alert_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alert rules"
  ON public.alert_rules FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own device tokens"
  ON public.device_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own device tokens"
  ON public.device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own device tokens"
  ON public.device_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at trigger for alert_rules (function defined in initial schema)
CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------
-- Seed a couple of useful preset rules for every new user so the app is
-- valuable with zero setup. Presets are free; custom rules are paid (enforced
-- server-side in the poller).
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tier)
  VALUES (NEW.id, NEW.email, 'free');

  INSERT INTO public.alert_configs (user_id)
  VALUES (NEW.id);

  INSERT INTO public.alert_rules (user_id, metric_key, comparator, threshold, sustain_min, cooldown_min, is_preset, label)
  VALUES
    (NEW.id, 'kp', 'gte', 5, 0, 90, true, 'Aurora likely (Kp ≥ 5)'),
    (NEW.id, 'kp', 'gte', 7, 0, 60, true, 'Strong storm (Kp ≥ 7)');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
