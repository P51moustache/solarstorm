# SolarStorm ☀️🌍

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Expo SDK 54](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

**Real-time space weather, made legible.** SolarStorm turns live data from NOAA, NASA, and
Open-Meteo into a clear read on what the Sun is doing _right now_ — geomagnetic storms, solar
flares, radiation storms, and aurora forecasts — across a polished native iOS app and a web
dashboard.

This monorepo contains two clients built on a shared set of public space-weather data sources:

| Path | What it is |
| --- | --- |
| [`mobile/`](mobile/) | **Native iOS app** — Expo · React Native · TypeScript. The flagship. |
| repo root | **Web app + JSON API** — Next.js 14 · Supabase · Three.js. |

---

## 📱 iOS app (`mobile/`)

A native space-weather companion with a custom **"Aurora Sky"** design — a living aurora
backdrop whose color and motion are driven by the real-time Kp index and solar-wind data, so the
app literally looks different depending on what the Sun is doing.

**Five focused tabs:**

- **Now** — the overall state at a glance: a plain-language headline ("the sky is asleep / awake /
  on fire"), the live Kp index, solar wind, and (for high latitudes) tonight's aurora odds with
  cloud, moon, and darkness factors.
- **Activity** — _is anything big happening, or coming?_ A headline status, the NOAA R/S/G hazard
  scales, the largest recent solar flare, a live SWPC alerts feed, a **2-week outlook**, and a
  live **Sun cam** (NASA SDO wavelengths + SOHO coronagraph).
- **Trends** — Kp history merged with the forecast on one scrubbable timeline, plus solar-wind
  charts, over 24h / 3-day / 7-day ranges.
- **Places** — save locations (with typeahead search) and see each one's live aurora outlook.
- **Alerts** — on-device notifications (no server) for storms, flares/radiation, a daily digest,
  and a weekly heads-up, via a background task.

Plus first-run onboarding, a **Space Weather 101** primer, and tap-to-learn explainers throughout
for newcomers. Built with **Expo SDK 54, expo-router, React Native 0.81, TypeScript, Reanimated,
react-native-svg, expo-notifications + expo-background-task, Supabase,** and **EAS Build**.

→ See **[`mobile/README.md`](mobile/README.md)** for setup and the build/release process.

## 🌐 Web app (repo root)

A Next.js dashboard for browser-based monitoring, plus a small public JSON API that proxies NOAA
data (keeping API keys server-side).

- Real-time Kp index, solar wind, particle flux, and solar activity
- Interactive 3D globe and aurora probability views (Three.js / react-three-fiber)
- Specialized GNSS, satellite, and HF-propagation dashboards
- Supabase auth + user data; public API at `/api/v1/current`

Built with **Next.js 14, React 18, TypeScript, Supabase, Three.js, Tailwind CSS.**

## 🛰️ Data sources

| Source | Used for |
| --- | --- |
| **NOAA SWPC** | Kp index, solar wind (mag/plasma), R/S/G scales, X-ray flares, alerts, 3-day & 27-day forecasts |
| **NASA SDO / SOHO** | Live solar imagery (multiple wavelengths, coronagraph) |
| **Open-Meteo** | Cloud cover, sunrise/sunset, place geocoding |

## 🚀 Getting started

### Web app
```bash
npm install
cp .env.local.example .env.local   # add Supabase URL + anon key
npm run dev                         # http://localhost:3000
```

### iOS app
```bash
cd mobile
npm install
npx expo start                      # open in Expo Go (SDK 54)
```

## 📈 Status

- **Web** — live.
- **iOS** — feature-complete; in pre-release (TestFlight / App Store submission prep).

## License

[MIT](LICENSE)
