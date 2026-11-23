# SolarStorm

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Expo SDK 54](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=black)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

An iPhone app that turns live NOAA, NASA and Open-Meteo data into a plain read on space weather:
geomagnetic storms, solar flares, radiation storms and the chance of seeing the aurora tonight.
On the App Store as a paid download.

## What is where

| Path | What it is |
| --- | --- |
| [`mobile/`](mobile/) | The iOS app: Expo SDK 54, React Native 0.81, expo-router, TypeScript. Setup and release steps are in [`mobile/README.md`](mobile/README.md) and [`mobile/SHIP.md`](mobile/SHIP.md). |
| [`docs/`](docs/) | The GitHub Pages site behind the App Store support and privacy links (`index.html`, `privacy.html`), and [`release-audit.md`](docs/release-audit.md), the record of the last release check. |
| [`supabase/`](supabase/) | Database schema and two edge functions. The app reads only the `profiles` table, and only when accounts are on (they are off). The other tables and both functions date from a retired web app. |

The repository root used to hold a Next.js web dashboard and planning docs for a B2B pivot. Both
were removed in November 2026; they are in the git history before that change.

## The app

- **Now**: a plain-language headline ("the sky is awake"), the live Kp index, solar wind and, for
  your location, tonight's aurora odds with cloud, moon and darkness factors.
- **Activity**: the NOAA R/S/G scales, the largest recent flare, live SWPC alerts, a two-week
  outlook and a live Sun cam (NASA SDO and SOHO).
- **Trends**: Kp history and forecast on one timeline, and solar-wind speed and Bz over the last
  24 hours.
- **Places**: saved locations with their own aurora outlook.
- **Alerts**: on-device notifications for storms, flares and radiation, plus a daily digest and a
  weekly heads-up, from a background task (no server).

## Data sources

| Source | Used for |
| --- | --- |
| NOAA SWPC | Kp index, solar wind (magnetometer and plasma), R/S/G scales, X-ray flares, alerts, 3-day and 27-day forecasts |
| NASA SDO / SOHO | Live solar imagery |
| Open-Meteo | Cloud cover, sunrise and sunset, place search |

## Run it

```bash
cd mobile
npm install
npx expo start
```

Tests and typecheck, from `mobile/`:

```bash
npm test
npx tsc --noEmit
```

## License

[MIT](LICENSE)
