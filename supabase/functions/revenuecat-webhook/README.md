# revenuecat-webhook

Syncs RevenueCat subscription state into `profiles.tier` (`subscribed` / `free`),
so the `poll-and-notify` paywall and the app's tier reflect real purchases.
See `docs/plans/2026-05-31-ios-notification-app-plan.md` §4.

## How the mapping works

The mobile app calls `Purchases.logIn(<supabase user id>)`, so RevenueCat's
`event.app_user_id` equals `profiles.id`. The function grants access on purchase/
renewal-type events and revokes on `EXPIRATION`. `CANCELLATION` (auto-renew off)
and `BILLING_ISSUE` are intentionally ignored — access continues until the
subscription truly expires.

## Setup

```bash
# 1. Deploy (authenticates via its own shared secret, not the gateway JWT)
supabase functions deploy revenuecat-webhook --no-verify-jwt

# 2. Set the shared secret
supabase secrets set REVENUECAT_WEBHOOK_AUTH=<choose-a-strong-secret>
```

Then in RevenueCat → Project settings → Integrations → Webhooks:

- **URL:** `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`
- **Authorization header:** `Bearer <the same REVENUECAT_WEBHOOK_AUTH>`

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the
Edge runtime.

## Product / offer setup (App Store Connect + RevenueCat)

- One auto-renewing subscription, **$6.99/month**, with a **7-day free trial**
  (introductory offer) in App Store Connect.
- In RevenueCat: add the product to the **current Offering** as the `monthly`
  package, and create an entitlement with identifier **`active`** (matches
  `ENTITLEMENT_ID` in `mobile/src/lib/purchases.ts`).
