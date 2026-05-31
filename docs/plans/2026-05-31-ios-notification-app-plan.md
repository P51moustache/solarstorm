# SolarStorm → Simple iOS Subscription App: Build Plan

**Status:** Proposed · **Date:** 2026-05-31 · **Branch:** `claude/app-commercialization-strategy-MlIiF`

## 1. Product vision (the pivot)

Drop the complex three-tier B2B/operator product. Ship a focused consumer app:

> **A space-weather notification app.** Users subscribe to automated alerts for the
> events they care about, customize their own alert rules, get push notifications when
> those events fire, see basic trends, and can export their data. **One paid
> subscription** (~$5–10/month) sold through the **Apple App Store** via Apple's native
> subscription system.

**Out of scope (remove / shelve):** the `plus`/`pro` split, satellite fleet manager,
GNSS operator dashboards, drag-risk / safe-mode tooling, the public REST API + API keys,
3D globe, Stripe. These can return later but are not part of the v1 consumer app.

### Platform decisions (settled)
- **Client:** Expo / React Native (iOS first, Android later for free). This repo was
  originally Expo before the Next.js migration, so we're returning to a mobile codebase.
- **Backend:** Supabase (keep it) — Postgres, Auth, Edge Functions, pg_cron.
- **Payments:** Apple In-App Purchase (StoreKit) via **RevenueCat**, **not Stripe**.
  Apple requires IAP for digital subscriptions and takes 15–30%. RevenueCat handles
  StoreKit/receipt validation and syncs entitlements to Supabase via webhook.

## 2. What we keep vs. rebuild

The valuable, hard-won part of this repo is the **data + logic layer**, which is
framework-agnostic TypeScript and ports directly into Expo.

### Reuse as-is (move into the Expo app or a shared package)
- `lib/api/swpc.ts`, `lib/api/particleFlux.ts`, `lib/api/solarFlux.ts`, `lib/api/*` —
  NOAA/SWPC data clients.
- `lib/api/parsers/*` — Zod parsers for every SWPC feed (kp, plasma, mag, ovation,
  kpForecast, particleFlux, xray, …).
- `lib/services/auroraProbability.ts`, `stormCorrelation.ts` — event/derivation logic.
- The **event-detection thresholds** in `lib/services/alertNotifications.ts` (Kp / Bz /
  speed comparison logic) — but this logic moves **server-side** (see §4).
- `lib/util/*` — time/math/validation helpers.

### Rebuild for mobile
- All `app/**` pages and `components/**` (Next.js + Tailwind + DOM) → Expo screens
  (React Native components). The dashboard, settings/alert-config, trends, history.
- `lib/state/*` Zustand stores — port (Zustand works in RN), but swap `localStorage` /
  `window` guards for `AsyncStorage`.
- Auth — Supabase auth works in Expo via `@supabase/supabase-js` + AsyncStorage session
  storage. The flows in `lib/state/useAuthStore.ts` port over.

### Delete / archive
- `lib/stripe/*`, `app/pricing/*`, `app/api/v1/*`, `app/api-docs/*`,
  `lib/services/apiKeys.ts`, `components/settings/ApiKeySettings.tsx`,
  satellite + GNSS dashboards and services, `app/globe`.
- The Next.js web shell — optionally keep a thin marketing/landing site, but it's not
  the product.

## 3. The core: a customizable, server-side event engine

This is the heart of the product and **does not exist today**. Current notifications
(`lib/services/alertNotifications.ts`) are browser-only and fire *only while a tab is
open*. There is no scheduler. We build a real one.

### 3.1 Data model (new Supabase migration)

Replace the rigid single-row `alert_configs` (Kp/Bz/quiet-hours only) with a flexible
**user-defined event rule** model:

```sql
-- A reusable catalog of metrics the user can build rules on.
-- (Seeded, not user-editable.) e.g. kp, bz, solar_wind_speed, proton_flux_10mev,
-- electron_flux_2mev, aurora_probability, xray_class, sfi
create table public.event_metrics (
  key          text primary key,         -- 'kp'
  label        text not null,            -- 'Kp index'
  unit         text,                     -- 'nT', 'km/s', 'pfu'
  direction    text not null             -- 'above' | 'below' (which way is "an event")
                 check (direction in ('above','below','either'))
);

-- A user's customized subscription to an event.
create table public.alert_rules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  metric_key    text not null references public.event_metrics(key),
  comparator    text not null check (comparator in ('gte','lte')),
  threshold     double precision not null,        -- e.g. Kp >= 5
  sustain_min   integer not null default 0,       -- condition held for N minutes (Bz logic)
  cooldown_min  integer not null default 90,      -- debounce per rule
  quiet_start   time,                             -- per-rule quiet hours (optional)
  quiet_end     time,
  enabled       boolean not null default true,
  label         text,                             -- user's name for the rule
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One row per push target (Expo push token / APNs). Replaces web push_subscriptions.
create table public.device_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  expo_token    text not null,
  platform      text not null check (platform in ('ios','android')),
  created_at    timestamptz not null default now(),
  unique (user_id, expo_token)
);

-- Reuse existing alert_log for server-side dedup/cooldown + the user's history feed.
-- Add: rule_id, metric snapshot.
alter table public.alert_log add column rule_id uuid references public.alert_rules(id);
```

RLS: same own-row pattern already used throughout the existing migration.

A few sensible **preset rules** ("Aurora likely", "Strong storm G3+", "Southward Bz")
are inserted for new users by the `handle_new_user()` trigger so the app is useful with
zero setup, while power users add their own.

### 3.2 Scheduled poller (new Supabase Edge Function + pg_cron)

`supabase/functions/poll-and-notify/` — invoked every ~5 min by pg_cron:

1. Fetch current conditions from SWPC (reuse the ported `lib/api` clients).
2. Append latest readings to the history tables (`kp_history`, `solar_wind_history`,
   `proton_flux_history`, … — already exist) so trends/export have data.
3. Load all `enabled` `alert_rules`. For each, evaluate `comparator`/`threshold` against
   the current (and, for `sustain_min`, recent) readings.
4. For rules that fire and pass cooldown (check `alert_log`) and quiet-hours, enqueue a
   notification and write an `alert_log` row.
5. Deliver via Expo Push (`https://exp.host/--/api/v2/push/send`) to the user's
   `device_tokens` → Expo relays to APNs. Uses the service-role key (server-only).

This makes notifications truly automated and device-delivered even when the app is
closed — the single biggest functional gap today.

## 4. Subscription (Apple IAP via RevenueCat)

1. App Store Connect: create one auto-renewing subscription product (e.g.
   `solarstorm.pro.monthly`, ~$5–10/mo, optional yearly).
2. RevenueCat: configure the product + a single entitlement, e.g. `active`.
3. Expo app: `react-native-purchases` (RevenueCat SDK). Paywall screen shows the one
   plan; purchase/restore handled by StoreKit.
4. **Entitlement sync:** RevenueCat webhook → a Supabase Edge Function
   (`supabase/functions/revenuecat-webhook/`) that sets `profiles.tier` to
   `'subscribed'`/`'free'` (we collapse the enum to two states).
5. Gating: free users get presets + limited history; subscribers get custom rules,
   full trends, and export. Enforce **server-side** in `poll-and-notify` and any data
   endpoints — not just in the client.

> Note: keep `lib/stripe/*` only if we also want a web-purchase path later. For the
> iOS-first v1, Stripe is removed to avoid App Store review issues (no external purchase
> links for digital goods).

## 5. Trends & export (the lighter features)

- **Trends:** read from the history tables the poller now fills; render with a RN chart
  lib (e.g. `victory-native` / `react-native-svg`). Logic from `auroraProbability.ts`
  and existing sparkline math ports over.
- **Export:** subscriber-only. A Supabase function returns the user's alert history +
  recent readings as CSV/JSON; share via the iOS share sheet. (The existing
  `lib/services/gnssExport.ts` shows the CSV-building pattern to follow.)

## 6. Phased roadmap

| Phase | Deliverable | Notes |
|-------|-------------|-------|
| 0 | This plan approved | ✅ |
| 1 | **Backend engine** (frontend-agnostic) | ✅ Implemented: migration `20260531120000_event_engine.sql` (§3.1) + `supabase/functions/poll-and-notify` (§3.2, schedule via its README). Defaults used: 2 free preset rules, custom rules/trends/export paid. |
| 2 | **Expo app scaffold** | ✅ Implemented in `mobile/`: Expo + React Navigation, Supabase auth (AsyncStorage session), dashboard (reads poller-filled history), alert-rule CRUD screens. Kept self-contained (not yet a shared `lib/` package — see mobile/README). |
| 3 | **Push wiring** | Register `device_tokens`, request iOS push permission, end-to-end alert delivery. |
| 4 | **Subscription** | RevenueCat + StoreKit, paywall, entitlement webhook, server-side gating. |
| 5 | **Trends + export** | Charts from history tables; CSV/JSON export for subscribers. |
| 6 | **App Store submission** | See §7. |

Phase 1 is the smart place to start (you chose "plan first"): it's the actual product,
it's independent of the client framework, and it de-risks the rest.

## 7. App Store / legal checklist (non-code, required to actually sell)

- Apple Developer Program enrollment ($99/yr).
- App Store Connect listing: name, icon, screenshots, description, category, age rating.
- **Privacy policy + Terms of Service** (hosted URLs) — Apple *requires* both for apps
  with accounts/subscriptions. Neither exists in the repo today.
- App Privacy "nutrition label" (data collection disclosure).
- Subscription metadata: price, free-trial/intro offer, subscription group, and the
  required in-app disclosure text near the purchase button.
- NOAA SWPC / NASA data attribution (public-domain, but attribution expected).
- Fix README contradictions before launch: it says "License: Proprietary" and "support
  email to be added" while the repo now ships an MIT `LICENSE`.

## 8. Open decisions (need your input before/within Phase 1)

1. **Monthly only, or monthly + annual?** (Annual lifts LTV; one product is simpler.)
2. **Free trial / intro offer?** (e.g. 7-day free trial — strong for notification apps.)
3. **Free tier generosity:** do free users get *any* notifications (presets only) or is
   push entirely paywalled? (Recommendation: a couple of preset alerts free, custom
   rules + trends + export paid — proves value before the paywall.)
4. **Android now or later?** Expo gives it nearly free, but Google Play billing is a
   separate setup. (Recommendation: ship iOS first.)
5. **New Expo repo vs. Expo app inside this repo** (monorepo with a shared `lib/`
   package). (Recommendation: monorepo so the ported `lib/` stays DRY.)

---

*Next step after approval: implement Phase 1 (event-rule schema + scheduled poller +
push delivery) on this branch via Supabase Edge Functions.*
