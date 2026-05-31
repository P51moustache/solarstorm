# SolarStorm Mobile (Expo)

The iOS-first client for the SolarStorm notification app (Phase 2 of
`docs/plans/2026-05-31-ios-notification-app-plan.md`). Built with Expo /
React Native, talking to the same Supabase backend as the event engine.

## What's here (Phase 2)

- **Auth** — email/password sign-in & sign-up with a persisted session
  (`@react-native-async-storage/async-storage`).
- **Dashboard** — current Kp / Bz / solar-wind speed (read from the Supabase
  history tables the `poll-and-notify` function fills) plus a recent-alerts feed.
- **My alerts** — list, toggle, and delete your `alert_rules`.
- **Alert editor** — create/edit a custom rule: metric, comparator, threshold,
  sustain window, cooldown, name, enabled.

The free/subscriber paywall is enforced server-side in the poller; the UI just
nudges free users toward subscribing. Push delivery + the subscription paywall
UI are Phase 3 / Phase 4.

## Run it

```bash
cd mobile
cp .env.example .env        # fill in your Supabase URL + anon key
npm install
npm run ios                 # or: npm run start, then press i
```

Requires the migrations in `../supabase/migrations` to be applied to your
Supabase project so `event_metrics`, `alert_rules`, etc. exist.

## Notes / follow-ups

- **Monorepo:** this app currently re-declares the few types it needs rather
  than importing the web app's `../lib`. Extracting a shared `packages/core`
  (Metro `watchFolders` + workspaces) is a deliberate follow-up so the scaffold
  stays runnable today.
- Live "current conditions" come from Supabase (poller output), not a direct
  SWPC fetch, which keeps the client thin and offline-friendly.
