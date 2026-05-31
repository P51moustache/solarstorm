// RevenueCat -> Supabase entitlement sync.
//
// RevenueCat posts subscription lifecycle events here; we translate them into
// profiles.tier ('subscribed' | 'free'). The app calls Purchases.logIn(<supabase
// user id>), so event.app_user_id is the profiles.id we update.
//
// Configure in RevenueCat (Project settings -> Integrations -> Webhooks):
//   URL:    https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
//   Header: Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH>   (a secret you choose)
//
// Deploy:  supabase functions deploy revenuecat-webhook --no-verify-jwt
// Secrets: supabase secrets set REVENUECAT_WEBHOOK_AUTH=<the same secret>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Events that grant access vs. revoke it. CANCELLATION (auto-renew off) and
// BILLING_ISSUE keep access until the subscription actually EXPIRES.
const GRANT = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
  'PRODUCT_CHANGE',
  'TRANSFER',
]);
const REVOKE = new Set(['EXPIRATION']);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Authenticate the webhook with the shared secret configured in RevenueCat.
  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (!expected || req.headers.get('Authorization') !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let event: { type?: string; app_user_id?: string };
  try {
    const body = await req.json();
    event = body?.event ?? {};
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const type = event.type ?? '';
  const userId = event.app_user_id;

  // Ignore events we don't act on (e.g. CANCELLATION, BILLING_ISSUE, TEST).
  if (!userId || (!GRANT.has(type) && !REVOKE.has(type))) {
    return new Response(JSON.stringify({ ok: true, ignored: type }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const tier = GRANT.has(type) ? 'subscribed' : 'free';
  const { error } = await supabase.from('profiles').update({ tier }).eq('id', userId);

  if (error) {
    console.error('Failed to update profile tier:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, type, tier }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
