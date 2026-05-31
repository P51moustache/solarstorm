// Scheduled poller + notifier (Phase 1 of the iOS notification app).
//
// Runs every ~5 minutes (via pg_cron -> see ./README.md). It:
//   1. Fetches current conditions from NOAA SWPC.
//   2. Appends the latest readings to the history tables (for trends/export).
//   3. Evaluates every enabled alert_rule against current/recent conditions,
//      respecting per-rule cooldown (alert_log), sustain window, and quiet hours.
//   4. Sends Expo push notifications to each user's device_tokens.
//
// Free users only receive preset rules; subscribers ('tier' != 'free') receive
// all of their enabled rules. This is the server-side enforcement of the paywall.
//
// Invoke manually for testing:
//   curl -X POST "$SUPABASE_URL/functions/v1/poll-and-notify" \
//        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SWPC = {
  KP_1MIN: 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json',
  MAG_2HOUR: 'https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json',
  PLASMA_2HOUR: 'https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json',
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface Reading {
  at: string;   // ISO timestamp
  value: number;
}

interface MetricSeries {
  latest: Reading | null;
  // Recent readings sorted ascending by time, used for sustain windows.
  recent: Reading[];
}

type Snapshot = Record<string, MetricSeries>;

interface AlertRule {
  id: string;
  user_id: string;
  metric_key: string;
  comparator: 'gte' | 'lte';
  threshold: number;
  sustain_min: number;
  cooldown_min: number;
  quiet_start: string | null;
  quiet_end: string | null;
  is_preset: boolean;
  label: string | null;
}

// ---------- SWPC fetching ----------

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`SWPC ${url} -> HTTP ${res.status}`);
  return res.json();
}

// planetary_k_index_1m.json: [{ time_tag, kp_index, estimated_kp }, ...]
function parseKp(data: unknown): Reading[] {
  if (!Array.isArray(data)) return [];
  const out: Reading[] = [];
  for (const row of data) {
    const r = row as Record<string, unknown>;
    const kp = (r.estimated_kp ?? r.kp_index) as number | null | undefined;
    if (typeof r.time_tag === 'string' && kp != null && !Number.isNaN(Number(kp))) {
      out.push({ at: r.time_tag, value: Number(kp) });
    }
  }
  return out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

// mag/plasma products: [[headers...], [row...], ...] (array-of-arrays)
function parseProduct(data: unknown, column: (h: string) => boolean): Reading[] {
  if (!Array.isArray(data) || data.length < 2) return [];
  const headers = (data[0] as string[]).map((h) => h.toLowerCase());
  const timeIdx = headers.findIndex((h) => h.includes('time_tag'));
  const valIdx = headers.findIndex((h) => column(h));
  if (timeIdx === -1 || valIdx === -1) return [];

  const out: Reading[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i] as string[];
    const at = row[timeIdx];
    const raw = row[valIdx];
    if (!at || raw == null || raw === '' || raw === 'null') continue;
    const value = parseFloat(raw);
    if (!Number.isNaN(value)) out.push({ at, value });
  }
  return out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

async function buildSnapshot(): Promise<Snapshot> {
  const [kpRaw, magRaw, plasmaRaw] = await Promise.all([
    fetchJson(SWPC.KP_1MIN).catch(() => null),
    fetchJson(SWPC.MAG_2HOUR).catch(() => null),
    fetchJson(SWPC.PLASMA_2HOUR).catch(() => null),
  ]);

  const kp = kpRaw ? parseKp(kpRaw) : [];
  const bz = magRaw ? parseProduct(magRaw, (h) => h.includes('bz_gsm') || h === 'bz') : [];
  const speed = plasmaRaw ? parseProduct(plasmaRaw, (h) => h.includes('speed')) : [];
  const density = plasmaRaw ? parseProduct(plasmaRaw, (h) => h.includes('density')) : [];
  const bt = magRaw ? parseProduct(magRaw, (h) => h.includes('bt')) : [];

  const series = (arr: Reading[]): MetricSeries => ({
    latest: arr.length ? arr[arr.length - 1] : null,
    recent: arr,
  });

  return {
    kp: series(kp),
    bz: series(bz),
    solar_wind_speed: series(speed),
    // carried for history persistence, not (yet) rule-evaluable
    _density: series(density),
    _bt: series(bt),
  };
}

// ---------- Rule evaluation ----------

function compare(value: number, comparator: 'gte' | 'lte', threshold: number): boolean {
  return comparator === 'gte' ? value >= threshold : value <= threshold;
}

function timeInQuietHours(start: string | null, end: string | null, now: Date): boolean {
  if (!start || !end) return false;
  const cur = now.getUTCHours() * 60 + now.getUTCMinutes();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  // Handle windows that wrap past midnight (e.g. 22:00 -> 07:00).
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e;
}

// A rule fires if the condition holds across the whole sustain window
// (sustain_min == 0 means "the latest reading is enough").
function ruleFires(rule: AlertRule, snapshot: Snapshot, now: Date): boolean {
  const series = snapshot[rule.metric_key];
  if (!series || !series.latest) return false;

  if (rule.sustain_min <= 0) {
    return compare(series.latest.value, rule.comparator, rule.threshold);
  }

  const windowStart = now.getTime() - rule.sustain_min * 60_000;
  const inWindow = series.recent.filter((r) => Date.parse(r.at) >= windowStart);
  if (inWindow.length === 0) return false;
  return inWindow.every((r) => compare(r.value, rule.comparator, rule.threshold));
}

function notificationText(rule: AlertRule, snapshot: Snapshot): { title: string; body: string } {
  const v = snapshot[rule.metric_key]?.latest?.value;
  const label = rule.label ?? rule.metric_key;
  const shown = v == null ? '' : ` (now ${Number.isInteger(v) ? v : v.toFixed(1)})`;
  return { title: 'SolarStorm alert', body: `${label}${shown}` };
}

// ---------- Expo push ----------

async function sendExpoPush(
  messages: Array<{ to: string; title: string; body: string; data: Record<string, unknown> }>,
): Promise<string[]> {
  // Returns expo_tokens that are no longer registered and should be pruned.
  const invalid: string[] = [];
  // Expo accepts up to 100 messages per request.
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      const json = await res.json().catch(() => null);
      const data = json?.data;
      if (Array.isArray(data)) {
        data.forEach((ticket, idx) => {
          if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
            invalid.push(batch[idx].to);
          }
        });
      }
    } catch (err) {
      console.error('Expo push batch failed:', err);
    }
  }
  return invalid;
}

// ---------- Main ----------

Deno.serve(async (req) => {
  // Only allow service-role (cron) invocation.
  const auth = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (auth !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const now = new Date();

  // 1 + 2. Fetch conditions and persist latest readings for trends/export.
  let snapshot: Snapshot;
  try {
    snapshot = await buildSnapshot();
  } catch (err) {
    console.error('Failed to build snapshot:', err);
    return new Response(JSON.stringify({ error: 'SWPC fetch failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (snapshot.kp.latest) {
    await supabase.from('kp_history').insert({
      timestamp: snapshot.kp.latest.at,
      value: snapshot.kp.latest.value,
    });
  }
  if (snapshot.bz.latest || snapshot.solar_wind_speed.latest) {
    await supabase.from('solar_wind_history').insert({
      timestamp: (snapshot.bz.latest ?? snapshot.solar_wind_speed.latest)!.at,
      bz: snapshot.bz.latest?.value ?? null,
      speed: snapshot.solar_wind_speed.latest?.value ?? null,
      density: snapshot._density.latest?.value ?? null,
    });
  }

  // 3. Evaluate rules. Join profiles to enforce the free/subscriber paywall.
  const { data: rules, error: rulesErr } = await supabase
    .from('alert_rules')
    .select('*, profiles!inner(tier)')
    .eq('enabled', true);

  if (rulesErr) {
    console.error('Failed to load alert rules:', rulesErr);
    return new Response(JSON.stringify({ error: 'rule query failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fired: AlertRule[] = [];
  for (const row of rules ?? []) {
    const rule = row as unknown as AlertRule & { profiles: { tier: string } };
    const subscribed = rule.profiles.tier !== 'free';
    // Paywall: free users only get preset rules.
    if (!subscribed && !rule.is_preset) continue;
    if (timeInQuietHours(rule.quiet_start, rule.quiet_end, now)) continue;
    if (!ruleFires(rule, snapshot, now)) continue;

    // Cooldown: skip if this rule fired within cooldown_min.
    if (rule.cooldown_min > 0) {
      const since = new Date(now.getTime() - rule.cooldown_min * 60_000).toISOString();
      const { count } = await supabase
        .from('alert_log')
        .select('id', { count: 'exact', head: true })
        .eq('rule_id', rule.id)
        .gte('sent_at', since);
      if ((count ?? 0) > 0) continue;
    }

    fired.push(rule);
  }

  // 4. Build + send notifications, log them, prune dead tokens.
  let sentCount = 0;
  for (const rule of fired) {
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('expo_token')
      .eq('user_id', rule.user_id);

    const { title, body } = notificationText(rule, snapshot);

    if (tokens && tokens.length) {
      const messages = tokens.map((t: { expo_token: string }) => ({
        to: t.expo_token,
        title,
        body,
        data: { ruleId: rule.id, metric: rule.metric_key },
      }));
      const invalid = await sendExpoPush(messages);
      if (invalid.length) {
        await supabase.from('device_tokens').delete().in('expo_token', invalid);
      }
      sentCount += messages.length;
    }

    // Log regardless of device presence so cooldown + history feed stay correct.
    await supabase.from('alert_log').insert({
      user_id: rule.user_id,
      rule_id: rule.id,
      alert_type: rule.metric_key,
      payload: {
        threshold: rule.threshold,
        comparator: rule.comparator,
        value: snapshot[rule.metric_key]?.latest?.value ?? null,
        label: rule.label,
      },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      evaluated: rules?.length ?? 0,
      fired: fired.length,
      notifications: sentCount,
      at: now.toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
