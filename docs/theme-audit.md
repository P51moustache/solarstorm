# Design core (theme audit), 2026-11-23

Zach answered "do it" on the board ("Give the app a design core"). Run was unattended, so the direction is
**closest to today**: the core and guardrails were added and every screen moved onto them with no chosen
look change.

## What the look now rests on
- `mobile/src/theme/`: `palette.ts` (private ramps) → `colors.ts` (roles, incl. NOAA `severity` ramp and
  `aurora` hues), `spacing.ts` (`space`, `layout`, `controlPadding`, `radii`, `iconSize`), `typography.ts`
  (`fonts`, `fontSize`, `lineHeight`, `tracking`, 19 named `textStyles`), `shadows.ts`, `motion.ts` (durations,
  easing, press feedback, haptics, interaction table). One import: `@/theme`.
- `mobile/src/components/ui/`: `Button` (primary/secondary/outline/link/danger × compact/regular/large, loading),
  `Field`, `Toggle`, `Tappable`, `SectionLabel`, plus the old `ScreenTitle`/`Card`/`Metric`/`Pill`.
- `Palette`/`Fonts` were removed from `constants/solar.ts`; its scale helpers read the theme.

## Numbers
| | Before | After |
|---|---|---|
| Raw style values outside the theme (`scan_styles.py`) | 408 | 0 |
| Raw controls outside the library (`component_scan.py`) | 36 | 0 (one scrim sheet in `explainer.tsx` goes through `Tappable`) |
| Hard-coded timings outside a motion hub (+ 3 direct haptics calls) | 1 | 0 |
| Type mixes at call sites | 39 | 19 (mostly a named style plus one override) |

## Proof
- Web build (iPhone width, dark, normal and large text): `diff_snapshots.py` finds 0 subtle and 0 unchosen
  visible changes. The one visible line (Bz value yellow → white on Trends/Now) is live NOAA data: Bz went
  from −3.4 to +2.3 between captures. Side by side: `theme-audit/before-after*.png`.
- `npm test` (style guardrail + 14 tests), `npx tsc --noEmit`, `npm run lint` all pass.

## Small changes made on purpose
- Snaps of ≤2 pt onto the scale (a few line heights 19/21→18/20, gaps 3→4, 22→24, radius 9→10, 20→22);
  `tabBarClearance` is 130 everywhere (two screens had 120), empty-state padding 60 everywhere (one had 50).
- Buttons now share one component: Alerts' "Send test alert" is 15 pt bold with radius 12 (was semibold, 14);
  paywall and account (both hidden behind flags in 1.0.x) now use Space Grotesk instead of the system font.

## Not verified
- Not run on the iOS simulator; web only. Alerts with notifications on (stepper, toggles, test button),
  location cards with saved places, and the account screen were not captured (they need permissions or are flagged off).

## Leads left for a look pass (needs a direction from Zach)
- 20 font sizes and 13 spacing steps are more than the app needs; folding them is a visible change.
- `colors.aurora.*` are named by hue: they are illustration/data hues, kept as such.

## Guardrails
- `npm run lint:theme` (run by `npm test`): `tools/theme-audit/scan_styles.py --fail`, at 0.
- `npm run lint`: blocks raw `Pressable`/`Switch`/`TextInput`/`Touchable*`, `expo-haptics`, palette imports and
  literal durations/`Easing` outside `src/theme` and `src/components/ui`.
