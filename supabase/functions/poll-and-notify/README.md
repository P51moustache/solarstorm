# poll-and-notify

Scheduled edge function that powers automated space-weather notifications.
Every run: fetches NOAA SWPC conditions, stores the latest readings (for
trends/export), evaluates every enabled `alert_rule`, and pushes Expo
notifications to matching users' devices. See
`docs/plans/2026-05-31-ios-notification-app-plan.md` for the full design.

## Deploy

```bash
supabase functions deploy poll-and-notify --no-verify-jwt
```

`--no-verify-jwt` is used because the function authenticates the caller itself
by comparing the `Authorization: Bearer <service-role-key>` header. It does not
need (and must not rely on) Supabase's gateway JWT check, since pg_cron calls it
with the service-role key.

The function reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, which are
injected automatically in the Supabase Edge runtime.

## Test manually

```bash
curl -X POST "$SUPABASE_URL/functions/v1/poll-and-notify" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
# -> {"ok":true,"evaluated":N,"fired":M,"notifications":K,"at":"..."}
```

## Schedule with pg_cron (every 5 minutes)

This is intentionally **not** in a migration because it embeds project-specific
secrets. Run it once in the SQL editor (requires the `pg_cron` and `pg_net`
extensions, both available on Supabase). Store the service-role key in Vault
rather than inlining it.

```sql
-- One-time: enable extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- One-time: stash secrets in Vault
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<service-role-key>', 'service_role_key');

-- Schedule: invoke the function every 5 minutes
select cron.schedule(
  'poll-and-notify',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
               || '/functions/v1/poll-and-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    )
  );
  $$
);

-- To remove later: select cron.unschedule('poll-and-notify');
```

## Notes / Phase 1 limits

- Evaluable metrics: `kp`, `bz`, `solar_wind_speed`. Add more by inserting into
  `event_metrics` and extending `buildSnapshot()`.
- Quiet hours are evaluated in **UTC** (no per-user timezone stored yet).
- The free/subscriber paywall is enforced here: free users only receive
  `is_preset` rules.
