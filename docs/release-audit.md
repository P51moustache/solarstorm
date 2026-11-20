# Release audit

Date: 2026-11-19
Release: SolarStorm 1.0.1 (build 7), iOS, to TestFlight
Commit: 5d34c7a
Result: clear

First run (no earlier record), on a hotfix. Structural debt is recorded here as the baseline the next release
ratchets from; only findings people using the app would notice could block. None is new in 1.0.1 (each already
ships in 1.0.0), and this release restores the live NOAA data, so the gate is clear. Counts are for the commit
above. Commands run from the repository root.

## Checks

- **Theme: needs-decision.** 408 raw styling values (409 before this release's fix). The theme file holds a
  palette and font names only: no spacing, type or radius scales.
  `python3 ~/.claude/skills/theme-audit/scripts/scan_styles.py mobile/src --theme constants/solar.ts --fail`
- **Components: needs-decision.** 36 raw controls outside the shared library (`components/ui-kit.tsx`: 4
  components, no Button, Field or Toggle).
  `python3 ~/.claude/skills/component-audit/scripts/component_scan.py mobile/src --lib components/ui-kit.tsx --max-bypass 0`
- **Motion: needs-decision.** 1 hard-coded timing. No motion hub; the rest is system defaults.
  `python3 ~/.claude/skills/motion-audit/scripts/motion_scan.py mobile/src --max-literal 0`
- **Navigation: needs-decision.** Literal routes 3, overrides 0, dead routes 0. No navigation hub. Typed routes
  are on, so the typechecker already rejects a literal that names no route.
  `python3 ~/.claude/skills/navigation-audit/scripts/nav_scan.py mobile/src --max-literal 0 --max-override 0 --max-dead 0`
- **Agent-ready: not-set-up.** P0 0, P1 6. No component catalog (11 shared components, 0 duplicates).
  `python3 ~/.claude/skills/agent-ready/scripts/agent_scan.py mobile --check`
  `python3 ~/.claude/skills/agent-ready/scripts/component_catalog.py mobile --check --fail-on-duplicates`
- **Project checks: pass.** 14 tests pass (`npm test` in `mobile/`); `npx tsc --noEmit` is clean.
- **On screen: pass.** Onboarding, Now, Activity, Learn, Trends, Places and Alerts walked on an iPhone 17 Pro
  simulator with live data, on the build of 9a675d9 (the commit after it changes one color reference to the
  same value). Not covered: VoiceOver, and frame-by-frame timing of the launch hand-off.

## Fixed in this release

- `mobile/src/app/(tabs)/locations.tsx`: the Places dropdown background reads `Palette.surfaceAlt` (same value).
- `mobile/AGENTS.md`: the Expo docs link pointed at SDK 56; the app is on SDK 54.

## Accepted as the baseline (first-run rule)

Theme 408, components 36, motion 1 with no hub, navigation literal 3 / override 0 / dead 0, agent-ready
P0 0 / P1 6 with no catalog. A count above these in a later release is a regression.

## Open items (Zach decides; each already ships in 1.0.0, and each fix changes look or behaviour)

1. `solarstorm://paywall` opens the hidden paywall (prices, "Restore purchases") while monetization is off and
   no products exist. Recommended: guard the route while `MONETIZATION_ENABLED` is false.
2. `Palette.textFaint` is about 3.0-3.5:1 on captions, units and inactive tab labels (4.5:1 is the floor).
3. The aurora backdrop animates forever and ignores Reduce Motion (`mobile/src/components/AuroraBackground.tsx`).
4. Icon-only buttons have no accessibility role or label, and some tap targets are small (paywall, Learn,
   onboarding, Places).
5. Launch swaps onboarding or a blank view for the app with no transition (`mobile/src/app/_layout.tsx`).
6. Smaller: Places and onboarding buttons differ in radius, padding and font; the Places tab's screen is titled
   "Locations"; Learn and the paywall have nothing beneath them on a cold deep link; "Next 3 nights" starts at
   the UTC day; `expo` and `expo-constants` are one patch release behind.
