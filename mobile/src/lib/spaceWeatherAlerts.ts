import { kpScale } from '@/constants/solar';
import { alertWouldFire, getAlertPrefs } from '@/lib/alertPrefs';
import { getNotifyState, present, setNotifyState } from '@/lib/notifications';
import { getCurrentConditions, getLatestFlare, getOutlook, getScales } from '@/lib/spaceWeather';

/**
 * Evaluate all on-device alert types against fresh data and fire local
 * notifications, with dedupe so the same event isn't announced repeatedly.
 * Called from the background task (and can be triggered manually for testing).
 */
export async function runAlertChecks(nowMs = Date.now()): Promise<void> {
  const prefs = await getAlertPrefs();
  if (!prefs.notificationsEnabled) return;

  const state = await getNotifyState();
  const next = { ...state };

  const [conditions, scales, flare, outlook] = await Promise.all([
    getCurrentConditions().catch(() => null),
    getScales().catch(() => null),
    getLatestFlare().catch(() => null),
    getOutlook(14).catch(() => []),
  ]);

  const kp = conditions?.kp ?? null;
  const bz = conditions?.solarWind.bz ?? null;

  // 1) Geomagnetic storm crosses the user's threshold.
  if (alertWouldFire(prefs, kp, bz) && kp !== null) {
    const recently = state.lastStormAt != null && nowMs - state.lastStormAt < 6 * 3600_000;
    const escalated = state.lastStormKp != null && kp >= state.lastStormKp + 1;
    if (!recently || escalated) {
      await present('Geomagnetic storm', `Kp ${kp.toFixed(1)} — ${kpScale(kp).label}.${bz != null && bz < 0 ? ' Bz is southward.' : ''}`);
      next.lastStormAt = nowMs;
      next.lastStormKp = kp;
    }
  }

  // 2) Strong flares + radiation storms.
  if (prefs.flares) {
    const cls = flare?.maxClass ?? '';
    const c = cls.trim().toUpperCase()[0];
    if ((c === 'M' || c === 'X') && cls !== state.lastFlare) {
      await present('Strong solar flare', `${cls} flare detected — possible radio blackout on Earth's dayside.`);
      next.lastFlare = cls;
    }
    const s = scales?.S.scale ?? 0;
    if (s >= 2 && s !== state.lastSScale) {
      await present('Radiation storm', `NOAA S${s} radiation storm underway — a risk to satellites and polar flights.`);
      next.lastSScale = s;
    } else if (s < 2) {
      next.lastSScale = s; // reset so the next onset re-notifies
    }
  }

  // 3) Daily digest, once per day at/after the chosen hour.
  if (prefs.dailyDigest) {
    const d = new Date(nowMs);
    const today = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (d.getHours() >= prefs.digestHour && state.lastDigestDate !== today) {
      const summary = kp !== null ? `${kpScale(kp).label} · Kp ${kp.toFixed(1)}` : 'Conditions unavailable';
      await present('Today’s space weather', summary);
      next.lastDigestDate = today;
    }
  }

  // 4) Weekly heads-up when the 2-week outlook is elevated.
  if (prefs.weekly && outlook.length) {
    const peak = outlook.reduce((a, b) => (b.kp > a.kp ? b : a), outlook[0]);
    if (peak.kp >= 5) {
      const stale = state.lastWeeklyAt == null || nowMs - state.lastWeeklyAt > 3 * 24 * 3600_000;
      const bigger = state.lastWeeklyPeak == null || peak.kp > state.lastWeeklyPeak;
      if (stale || bigger) {
        await present('Heads-up this fortnight', `Elevated activity likely — up to Kp ${peak.kp} around ${peak.label}.`);
        next.lastWeeklyAt = nowMs;
        next.lastWeeklyPeak = peak.kp;
      }
    }
  }

  await setNotifyState(next);
}
