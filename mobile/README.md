# SolarStorm — iOS app

![Expo SDK 54](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Platform: iOS](https://img.shields.io/badge/Platform-iOS-lightgrey?logo=apple&logoColor=white)

A native iPhone app that turns live NOAA / NASA / Open-Meteo data into a clear, beautiful read
on space weather — geomagnetic storms, solar flares, radiation, and aurora forecasts.

Part of the [SolarStorm](../) project. This is the Expo / React Native client.

## Design — "Aurora Sky"

The whole app sits on a **living aurora backdrop** (animated SVG ribbons + starfield) whose
color, brightness, and motion are driven by the real-time Kp index and IMF Bz — calm indigo on a
quiet night, rippling green-violet during a storm. Frosted-glass cards, the Space Grotesk
typeface, and tap-to-learn explainers throughout keep it legible for newcomers and enthusiasts
alike.

## Features

| Tab | What it does |
| --- | --- |
| **Now** | Plain-language state ("the sky is awake"), live Kp + storm scale, solar wind, and a location-aware aurora card (chance + cloud / moon / darkness factors). |
| **Activity** | Headline "is anything happening?" status, NOAA **R/S/G** scales, largest 24h solar flare, live SWPC alerts, a **2-week outlook**, and a live **Sun cam** (NASA SDO + SOHO coronagraph). |
| **Trends** | Kp history + forecast on one scrubbable timeline, plus solar-wind charts; 24h / 3-day / 7-day ranges. |
| **Places** | Saved locations with typeahead search and per-location aurora outlook. |
| **Alerts** | On-device notifications (storms, flares/radiation, daily digest, weekly heads-up) via a background task — no server required. |

Plus first-run onboarding and a **Space Weather 101** primer.

## Tech

- **Expo SDK 54**, **expo-router** (typed routes), **React Native 0.81**, **TypeScript**
- **react-native-reanimated** + **react-native-svg** — the aurora backdrop, charts, and viz
- **expo-notifications** + **expo-background-task** + **expo-task-manager** — on-device alerts
- **expo-location**, **expo-blur**, **expo-linear-gradient**, **expo-haptics**
- **@supabase/supabase-js** — auth (feature-flagged off for v1)
- **EAS Build / Submit** — CI builds and App Store delivery

## Architecture notes

- The data layer (`src/lib/spaceWeather.ts`) fetches NOAA SWPC directly by default, or routes
  through the project's Next.js backend when `EXPO_PUBLIC_API_BASE_URL` is set.
- Forecast / aurora / viewing math (`src/lib/aurora.ts`, `viewing.ts`) is pure and dependency-free.
- Alerts run from an `expo-background-task` worker (`src/lib/backgroundAlerts.ts`) that evaluates
  conditions and fires deduplicated local notifications — no backend.
- Subscriptions (RevenueCat) and accounts are behind flags in `src/constants/flags.ts`, off for
  the v1 launch.

## Project structure

```
src/
  app/                 # expo-router routes
    (tabs)/            # Now · Activity · Trends · Places · Alerts
    learn.tsx          # Space Weather 101 (modal)
    _layout.tsx        # providers, fonts, aurora backdrop, onboarding gate
  components/          # AuroraBackground, charts, SunCam, ui-kit, explainer …
  lib/                 # spaceWeather, aurora, viewing, location, notifications …
  constants/           # theme / palette, glossary, feature flags
```

## Getting started

```bash
npm install
npx expo start          # press i for the iOS simulator, or scan the QR with Expo Go
```

> Notifications, background tasks, and in-app purchases require a **development / standalone build**
> (not Expo Go, not the simulator). Everything else runs in Expo Go.

## Build & release (EAS)

```bash
eas build --profile development --platform ios   # on-device test build
eas build --profile production  --platform ios   # store build
eas submit --profile production --platform ios   # upload to App Store Connect
```

See [`SHIP.md`](SHIP.md) for the full submission checklist and [`PRIVACY.md`](PRIVACY.md) for the
privacy policy. Data courtesy of NOAA SWPC and NASA.
