# Tonight spec, from concept C (Living sky)

Concept: `research/concepts/tonight-reference.png` (picked by Zach, 24 Nov 2026). Sizes checked: iPhone 16 Pro
(393×852 pt) and iPhone SE (375×667 pt), web build at 2x.
Core: theme `mobile/src/theme/`, components `mobile/src/components/ui/`, motion hub `mobile/src/theme/motion.ts`.
Data: `planTonight()` in `mobile/src/lib/sky/tonight.ts` (headline, hour strip, Moon, what's up, aurora glow).

## Regions

### Horizon art (behind the hero)
- **Job**: set the mood: a night sky over mountains and a lake; shows an aurora glow only when the aurora is likely.
- **Data**: `tonight.auroraGlow` (aurora read ≥ `AURORA_LIKELY_PERCENT`, 50%).
- **Part**: **new** `HorizonScene` (`components/tonight/`): SVG sky gradient, stars, Milky Way haze, far and near
  ridges with snow, tree lines, lake. Nothing existing draws a landscape; `AuroraBackground` stays the app-wide sky.
- **Values**: every fill is a `colors.night.*` role; height `componentSize.horizon`.
- **Moves**: aurora glow breathes with `motion.duration.breathe` / `motion.easing.breathe` (the backdrop's preset).
- **States**: no aurora read → no glow.

### Top bar
- **Job**: brand. **Part**: row with `sparkles` icon + "SolarStorm", `textStyles.cardTitle`, centred.
- The concept's settings gear is left out: the app has no settings screen yet.

### Title block (left)
- **Job**: say which night and where. **Data**: "Tonight", place label, date. Hardest case: a long place name
  ("Llanfairpwllgwyngyll, Wales") → one line, ellipsised, the chevron stays visible.
- **Part**: `ScreenTitle`-style title via `textStyles.screenTitle`; place row is a `Tappable` (pin `iconSize.md`,
  `textStyles.cardTitle`, chevron `iconSize.sm`), date `textStyles.footnote` / `colors.textMuted`.
- **States**: no place → the hero shows "Pick a place" and the setup card replaces the strip.

### Sky score ring (right)
- **Job**: tonight's 0-100 score at a glance. **Data**: `plan.score`. Hardest: 100 (three digits), 0.
- **Part**: **new shared** `ScoreRing` (`components/ui/`): a 0-100 dial is a reusable control (Week will use it).
- **Values**: size `componentSize.scoreRing`, stroke `componentSize.scoreRingStroke`, gradient
  `colors.night.scoreFrom` → `scoreTo`, track `colors.fill`, value `textStyles.scoreValue`, label
  `textStyles.caption` / `textMuted`.
- **Moves**: arc fills once when the score arrives, `motion.duration.reveal` / `motion.easing.reveal`.
- **Lines up with**: top of the "Tonight" title.

### Headline
- **Job**: the plain answer. **Data**: `headline.title` / `headline.detail`. Hardest: "Fog hides the sky tonight"
  plus a two-sentence detail → wraps, never clips.
- **Part**: view with a left accent bar (`componentSize.accentBar`, `colors.night.window`), title
  `textStyles.heroHeadline`, detail `textStyles.bodyLarge` / `textMuted`. Gap `space[1.5]`, bar inset `space[3]`.

### Hour strip card
- **Job**: hour by hour, dusk to dawn: cloud, darkness, the best window, the Moon.
- **Data**: `tonight.hours` (one column per whole hour; 8 in June at 55°N, 16+ in a polar winter), `plan.bounds`,
  `tonight.moon`.
- **Part**: `Glass` card with **new** `HourStrip`: fixed label column (`componentSize.stripLabel`) + horizontal
  `ScrollView` of `componentSize.hourColumn` columns, so long nights scroll instead of squeezing. Best window =
  rounded box `radii.md`, border `colors.night.window`, fill `colors.night.windowFill`. Dusk/Dawn in the header
  (`textStyles.caption` label, `textStyles.footnoteStrong` time). Moon row: `moon` icon, `textStyles.footnote`,
  illumination bar (`componentSize.track`, `radii.pill`, fill `colors.night.moon`).
- **Lines up with**: label column icons on one left edge; every row's values on the column centres.
- **States**: no forecast → cloud cells show "–"; no best window → no box.
- **Moves**: opens scrolled so the best window (or the first hour) is in view; no animation.

### What's up tonight
- **Job**: what to look at. **Data**: `tonight.events` (Milky Way core, planets brightest first, aurora). Hardest:
  six rows; none (summer high latitude, no read) → "Nothing bright is up tonight."
- **Part**: `Glass` with title `textStyles.panelTitle`; rows are **new shared** `ListRow` (leading tile, title,
  subtitle, optional chevron). Leading `EventTile`: `componentSize.eventTile`, `radii.md`, `colors.fill` with
  the kind's icon.
- **Moves**: aurora row press → Aurora & Sun (`press.opacity`). Other rows have no detail page yet, so no chevron.

### Tab bar
- First tab becomes **Tonight** (telescope). Now's space-weather dashboard moves to **Aurora & Sun**; Activity
  and Trends leave the bar and open from Aurora & Sun. "Week" waits for the Next good nights screen.

## Roundings
| Where | In the picture | Token | Why this step |
|---|---|---|---|
| Screen side inset | ~20 pt | `layout.screenPadding` (16) | every screen's inset |
| Card inset | ~22 pt | `Glass` default `space[4.5]` | every card's inset |
| Card gap | ~14 pt | `layout.stackGap` (12) | every stack of cards |
| Headline size | ~1.6× body | `fontSize.title1` (24) | nearest step that keeps 2 lines at 375 pt |
| Score number | ~2.4× headline | `fontSize.hero2` (44) | fits "100" inside the ring |
| Ring diameter | ~92 pt | 116 | holds "100" at hero2 with the label above |
| Event title | bold, ~body+2 | `textStyles.cardTitle` | card titles elsewhere |

## Core additions
| Kind | Name | Role | Why nothing existing fits |
|---|---|---|---|
| palette | `dusk`, `slate`, `teal` ramps | horizon and window hues | no pink-violet horizon or teal in the palette |
| color roles | `colors.night.*` | horizon art, score ring, best window, Moon bar | new kind of surface |
| spacing | `componentSize` | fixed sizes of the ring, strip, tiles, horizon | the scale had no component sizes |
| type | `heroHeadline`, `scoreValue`, `panelTitle`, `lineHeight.title` | the answer line, the score, a panel's heading | no 24 pt multi-line or 44 pt numeric style |
| motion | `duration.reveal`, `easing.reveal` + 2 registry rows | score ring fill | first one-shot reveal in the app |
| component | `ScoreRing`, `ListRow` | 0-100 dial; tappable list row | none existed |

## Left as is on purpose
- Photo thumbnails in What's up are icon tiles: no image assets yet.
- Darkness row reads 0-100 % (Sun darkness × moonlight) instead of mag/arcsec²: there is no sky-brightness
  model, and a made-up SQM number would mislead.
- Meteor showers are not listed yet (needs the IMO table; separate item).
- Times use 24-hour HH:MM as in the concept.
