# SolarStorm as a night-sky planner: feature plan (24 Nov 2026)

Zach chose this direction on 24 Nov (see `niches.md`). Nothing here is built yet.

## The job

"Is tonight good for the sky where I am, and when?" for stargazers and night photographers. One
plain answer first, then the hours, then what is up. The aurora becomes one sky event, shown loudly when it
matters and quietly otherwise.

## What the app shows

1. **Tonight** (replaces Now): a headline ("Clear and dark from 22:10 to 03:40"), a 0-100 sky score, and an
   hour-by-hour strip from dusk to dawn: clouds (low, mid and high), darkness, moon up or down, humidity
   and dew risk, wind. The best window is marked.
2. **What's up tonight**: the Milky Way core (when it's up and dark), planets, a meteor shower near its peak (with
   the moon's effect), the aurora (existing Kp and Kp-needed logic), eclipses and bright conjunctions.
3. **Next good nights**: the next 7 nights ranked for each saved place, so people can plan a trip.
4. **Places**: kept. Each place gets its own score and best window.
5. **Alerts**, on the phone: "clear and dark tonight at <place>" in the afternoon, plus the existing aurora
   and storm alerts. A late afternoon digest can arrive late without harm, unlike a storm alert.
6. **Aurora & Sun**: today's Activity and Trends screens move under one section for people who want more.

## Data (free, already used or offline)

- Open-Meteo: cloud cover by layer, humidity, dew point, wind and visibility, hourly for 7 days (already used).
- astronomy-engine (MIT, offline): sun and moon rise and set, twilight, moon phase, planet and Milky Way altitude.
  Replaces the home-made moon formula.
- A static meteor shower table (IMO calendar), updated once a year.
- NOAA SWPC: aurora, as today.
- Later: light pollution (needs a source whose licence allows use in an app), ISS passes (needs TLE data).

## Code shape

- New pure modules in `mobile/src/lib/sky/`: `darkness`, `skyScore`, `bestWindow`, `skyEvents` (one file per
  event kind, in a registry), each tested directly. `viewing.ts` and `aurora.ts` feed into them.
- Screens are built only after Zach picks one of the three visual concepts, through the `concept-build` skill
  and the design core (item design-core).

## Phases

1. Engine: darkness, sky score and best window, with tests. No UI change.
2. Concepts: three visual concepts of the Tonight screen; Zach picks one.
3. Tonight and Next good nights screens, built from the picked concept.
4. Sky events (Milky Way, planets, meteors) and the afternoon "good tonight" alert.
5. Store listing: name, subtitle, screenshots and keywords for stargazing.

## Open for Zach, asked when each one comes up

- Keep the name SolarStorm, or rename for the store (stargazers search "stargazing", "night sky", "clear sky").
- Price: the $0.99 download stays (he said no to free); a Pro unlock is a later question.
