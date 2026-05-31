# SolarStorm

A Next.js web app for real-time space weather monitoring and aurora forecasting. SolarStorm surfaces live geomagnetic activity, solar wind conditions, and aurora probability forecasts in the browser, backed by Supabase for auth and user data.

## Features

- **Real-time Kp Index**: Live geomagnetic activity monitoring with NOAA color coding
- **Solar Wind Data**: Track magnetic field (Bz), speed, and plasma density
- **Aurora Forecasting**: Interactive heatmap showing aurora probability by location
- **Smart Alerts**: Configurable thresholds with Bz confirmation logic
- **Trend Charts**: Historical Kp trends over recent hours
- **Specialized Dashboards**: GNSS and satellite views for operators and power users
- **Dark UI**: Astronomy-friendly interface

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase project (URL + anon key) for auth and data features

### Installation

```bash
# Install dependencies
npm install

# Copy the example environment file and fill in your values
cp .env.local.example .env.local

# Start the dev server (http://localhost:3000)
npm run dev
```

### Environment Variables

Client-exposed variables must be prefixed with `NEXT_PUBLIC_` so Next.js inlines them into the browser bundle. Server-only secrets (such as `NASA_API_KEY`) must NOT use that prefix. See `.env.local.example` for the full list. The two required values are:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The app is designed to build and render without these set — data-dependent pages simply show an empty state and a warning is logged — so `npm run build` and `npm run dev` work on a fresh clone before secrets are configured.

### Scripts

```bash
npm run dev     # Start the Next.js dev server
npm run build   # Production build
npm run start   # Serve the production build
npm run lint    # Lint with next lint
```

## Data Sources

All space weather data is sourced from the **NOAA Space Weather Prediction Center** (services.swpc.noaa.gov):

- **Planetary K-index** (1-minute): Real-time geomagnetic activity
- **Solar Wind Magnetic Field**: Bz component crucial for aurora forecasting
- **Solar Wind Plasma**: Speed and density measurements
- **OVATION Aurora Model**: Probabilistic aurora forecasts
- **Geomagnetic Alerts**: G1-G5 storm warnings

## Architecture

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: React 18, Tailwind CSS, lucide-react icons
- **State Management**: Zustand with persistence
- **Backend / Auth**: Supabase (Postgres, Auth)
- **Payments**: Stripe
- **Validation**: Zod schemas for API data
- **Data / Visualization**: D3 and Three.js (`@react-three/fiber`, `@react-three/drei`)
- **Time**: Day.js for date/time handling

### Project Structure

```
app/                  # Next.js App Router pages, layouts, and API routes
  dashboard/          # Main space-weather dashboard
  gnss-dashboard/     # GNSS-focused view
  satellite-dashboard/# Satellite operations view
  api/                # Route handlers (SWPC/TEC/CME proxies, health, etc.)

components/           # React UI components (charts, dashboard, layout, ...)

lib/
  api/                # SWPC/NASA API clients and Zod parsers
  services/           # Domain logic (radiation belt, HF propagation, ...)
  state/              # Zustand stores
  stripe/             # Stripe config and client
  supabase/           # Supabase client and generated types
  util/               # Time, math, env, logging, validation helpers

supabase/             # SQL migrations and edge functions
```

## Alert Logic

Alerts trigger when:

1. **Kp Threshold**: Current Kp >= user setting (4, 5, or 6)
2. **Bz Confirmation** (optional): Sustained Bz <= -5 nT for >= 10 minutes
3. **Debounce**: No alert in past 90 minutes unless Kp increased

## Aurora Chance Algorithm

Aurora likelihood is estimated from current conditions:

- **High chance** (mid-latitudes): Kp >= 5 AND Bz <= -5 AND speed >= 500 km/s
- **Possible** (higher latitudes): Kp >= 4 AND Bz <= -3
- **Low likelihood**: Other conditions

## License

Proprietary - All rights reserved

## Support

For questions, feedback, or support, contact: [support email to be added]
