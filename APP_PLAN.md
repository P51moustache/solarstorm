Here’s a ready-to-paste prompt you can give an AI coding bot. It assumes an Expo (managed) + TypeScript project is already initialized. It tells the bot exactly what to build, which libraries to use, the file structure, APIs, alert logic, and what “done” looks like.

⸻

PROMPT FOR CODING BOT — Build SolarStorm (Expo, TypeScript)

You are building SolarStorm, a $1.99 utility app that shows real-time solar weather + aurora chance using free NOAA/SWPC APIs. The app has a single primary screen with a polished, Apple-style UI and a minimal settings sheet. You will deliver complete, runnable code files (no stubs), following the exact stack and design below.

0) Stack & Libraries (Expo managed)
	•	Language: TypeScript
	•	State: zustand
	•	Validation: zod
	•	HTTP: native fetch + small wrapper
	•	Storage: @react-native-async-storage/async-storage
	•	Time: dayjs
	•	UI: expo-linear-gradient, @shopify/react-native-skia (for heatmap + sparkline), react-native-svg (fallback for simple vector)
	•	Location (optional for future): expo-location (wire but don’t block UI)
	•	Background & notifications: expo-background-fetch, expo-task-manager, expo-notifications
	•	Icons: @expo/vector-icons
	•	Routing: Expo Router expo-router
	•	Testing: jest, @testing-library/react-native, msw (mock SWPC endpoints)

Install (the code should include a section in README with these):

expo install expo-linear-gradient expo-notifications expo-task-manager expo-background-fetch expo-location @react-native-async-storage/async-storage
npm i zustand zod dayjs @shopify/react-native-skia react-native-svg
npm i -D jest @testing-library/react-native @testing-library/jest-native msw whatwg-fetch

1) Data Sources (all free)

Use these exact endpoints (JSON):
	•	Kp (1-minute)
https://services.swpc.noaa.gov/json/planetary_k_index_1m.json
	•	Aurora (OVATION, latest)
https://services.swpc.noaa.gov/json/ovation_aurora_latest.json
	•	Solar wind (2-hour recent)
	•	Magnetic field (Bz): https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json
	•	Plasma (speed, density): https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json
	•	SWPC Alerts feed (optional badge)
https://services.swpc.noaa.gov/products/alerts.json

Parsing Notes
	•	planetary_k_index_1m.json returns an array of objects; use last element for “now”.
	•	mag-2-hour.json & plasma-2-hour.json return CSV-like JSON arrays where first row is headers; convert to objects.
	•	ovation_aurora_latest.json contains a grid of probabilities with coordinates; you will rasterize into a heatmap.

2) Product Requirements

Screens

A. Home (single screen)
	•	Header row:
	•	“Kp Now” big numeric tile (0–9) with NOAA color band.
	•	Updated X min ago sublabel (based on newest of Kp/Bz/Speed).
	•	KPI cards row (3 cards):
	•	Solar wind speed (km/s)
	•	Bz (nT; show arrow/down when negative)
	•	Density (p/cm³)
	•	Sparkline (last 6 hours of Kp) small and subtle.
	•	Aurora Heatmap thumbnail (Skia canvas): tappable → full screen modal (simple toolbar with close & legend).
	•	Aurora Chance Badge (logic below) with friendly text (e.g., “High chance at mid-latitudes”).
	•	SWPC Alert chip if a G1+ alert is present (tap to see last alert text in a sheet).

B. Settings Sheet (modal from gear icon)
	•	Kp Alert Threshold (segmented: 4, 5, 6, Off; default 5)
	•	Bz Alert Gate (toggle default ON): trigger only if Bz ≤ −5 nT for ≥10 min
	•	Notification permission button (request if not granted)
	•	Data sources (static, with links shown as plain text)
	•	Reset cache button

Alert Logic (background)
	•	Background task checks every 15 minutes (or Expo’s allowed minimum):
	•	Fetch latest Kp and Bz (convert from mag/plasma feeds).
	•	Trigger a local notification if:
	•	kp >= userThreshold AND
	•	Bz ≤ −5 nT for at least 10 minutes (infer by looking at last few datapoints’ timestamps)
	•	Debounce: do not alert more than once per 90 minutes unless Kp crosses into a higher band than last alert.

Aurora Chance Badge (on Home)
	•	If kp >= 5 AND bz <= -5 AND speed >= 500: “High chance at mid-latitudes”
	•	Else if kp >= 4 AND bz <= -3: “Possible at higher latitudes”
	•	Else: “Low likelihood; watch for drops in Bz”
	•	This is guidance; include tiny caption “Based on real-time nowcast indicators.”

Design & Theming
	•	Palette: deep navy #0B1020 → emerald #00D084 gradient accents; text on dark.
	•	Typography: iOS-style, SF Pro; large numerals for Kp.
	•	Motion: when bz < 0 and speed > 500, apply a subtle shimmering gradient on the Kp tile.
	•	Accessibility: sufficient color contrast; support Dynamic Type (scale fonts); VoiceOver labels for KPIs.

3) Project/File Structure

Use Expo Router and this tree:

app/
  _layout.tsx
  index.tsx                // Home screen
  modal-map.tsx            // Fullscreen aurora heatmap
  modal-settings.tsx       // Settings sheet
components/
  KpTile.tsx
  KpiCard.tsx
  Sparkline.tsx
  AuroraHeatmap.tsx
  AlertChip.tsx
  Section.tsx
lib/
  api/
    fetchJson.ts
    swpc.ts                // all fetchers
    parsers/
      kp.ts
      mag.ts
      plasma.ts
      ovation.ts
      alerts.ts
  state/
    useStore.ts            // zustand store
    persist.ts
  util/
    time.ts
    colors.ts
    math.ts
    notifications.ts
    background.ts
  viz/
    heatmap.ts             // grid→raster (Skia Image)
    sparkline.ts
assets/
  icons/
    app-icon.svg (or .png)
  fonts/ (if needed)
tests/
  unit/
  integration/
README.md

4) Types & Parsing (TypeScript)

Kp

export type KpPoint = {
  time_tag: string;           // ISO
  kp_index?: number | null;
  estimated_kp?: number | null;
};

Parser: take last element, prefer estimated_kp ?? kp_index.

Solar wind (mag-2-hour.json / plasma-2-hour.json)
	•	First row is headers; rows are arrays of strings.
	•	Map to objects:

export type MagPoint = { time_tag: string; bz: number | null; bt?: number | null; };
export type PlasmaPoint = { time_tag: string; speed: number | null; density: number | null; };

Parser: locate header indices (time_tag, bz_gsm, bt, speed, density). Convert to numbers; filter nulls; sort by time.

OVATION Aurora
	•	JSON includes a set of grid cells with lat, lon, probability (0–100).
Types:

export type OvationCell = { lat: number; lon: number; prob: number };
export type OvationPayload = { updated: string; cells: OvationCell[] };

Parser: read payload; normalize to {lat,lon,prob} array. (If shape differs, map accordingly—validate with zod.)

Alerts

export type SwpcAlert = { issue_datetime: string; message: string; };

Filter for messages that include G1, G2, G3, G4, G5.

5) Fetchers (lib/api/swpc.ts)
	•	getKpNow(): Promise<{kp: number; at: string}>
	•	getSolarWindRecent(): Promise<{ points: Array<{at:string; bz:number|null; speed:number|null; density:number|null}> }>
	•	getOvation(): Promise<{ updated:string; cells: OvationCell[] }>
	•	getAlerts(): Promise<SwpcAlert[]>
	•	Implement caching:
	•	AsyncStorage keys: kp:latest, sw:recent, ovation:latest, alerts:latest
	•	Cache TTLs: Kp 5 min, SW 5 min, OVATION 10 min, Alerts 15 min
	•	Wrap fetchJson with 10s timeout and basic retry (2 attempts).

6) State (lib/state/useStore.ts with zustand + persist)
	•	kp: number|null, kpUpdatedAt: string|null
	•	bz: number|null, speed: number|null, density: number|null, swUpdatedAt: string|null
	•	ovationUpdatedAt: string|null
	•	alerts: SwpcAlert[]
	•	Settings:
	•	kpThreshold: 5 | 6 | 4 | 0 (0 = off)
	•	requireBzGate: boolean (default true)
	•	lastAlertAt: string|null
	•	Actions:
	•	refreshAll(), refreshKP(), refreshSW(), refreshOvation(), refreshAlerts()
	•	setKpThreshold(), toggleBzGate(), setLastAlertAt()
	•	resetCache() (clear storage + state)

7) Background Task & Notifications
	•	Register background fetch task (e.g., SOLARSTORM_FETCH) with expo-background-fetch + expo-task-manager.
	•	In task:
	•	Fetch KP & SW (mag/plasma), merge into latest snapshot.
	•	Maintain a 10–20 min ring buffer in AsyncStorage (timestamps & Bz values) to check “Bz ≤ −5 for ≥10 min”.
	•	If criteria met and now - lastAlertAt > 90 min (or band increased vs last alerted Kp), send local notification:
	•	Title: Kp {kp}  • Bz {bz} nT
	•	Body: Strong southward IMF; increased aurora chances.
	•	Update lastAlertAt.
	•	Implement ensureNotificationPermission() and settings toggle to request.

8) UI Components (complete implementations)

KpTile.tsx
	•	Big numeric Kp, NOAA color band background using LinearGradient.
	•	Subtext: “Updated X min ago”.
	•	If bz < 0 && speed > 500, apply subtle animated shimmer (looping opacity/translate).

KpiCard.tsx
	•	Generic card with label + large value + unit + tiny delta (if you compute short-term change).

Sparkline.tsx
	•	Use Skia path drawing for last 6 hours of Kp (downsample to ~60 points).
	•	Provide a faded gradient fill under the line.

AuroraHeatmap.tsx
	•	Accept {cells: OvationCell[]}.
	•	Render a flat equirectangular projection canvas: map lon [-180..180] → x, lat [-90..90] → y.
	•	For each cell, draw a semi-transparent circle or rect whose alpha scales with prob/100; composite to a heatmap (use Skia image filters for blur/soften).
	•	Legend: 0–100% gradient bar.

AlertChip.tsx
	•	If there’s a G1+ alert in last 24h, show a pill “Geomagnetic storm watch” with tap → bottom sheet with last alert text.

index.tsx (Home)
	•	SafeAreaView
	•	Header: Title “SolarStorm” + gear icon (open settings).
	•	KpTile, 3x KpiCards, Sparkline, “Aurora chance” banner, AuroraHeatmap thumbnail (tap → modal-map).
	•	Pull-to-refresh → refreshAll().

modal-map.tsx
	•	Fullscreen Skia canvas heatmap, legend, close button.
	•	Subtitle: “OVATION aurora, updated HH:mm UTC”.

modal-settings.tsx
	•	KP alert segmented control (4/5/6/Off).
	•	Bz gate toggle.
	•	Notification permission button.
	•	Source attribution.
	•	Reset cache button.

9) Styles & Design Tokens
	•	Colors (lib/util/colors.ts):

export const COLORS = {
  bg: '#0B1020',
  text: '#E6ECFF',
  muted: '#9AA4C2',
  emerald: '#00D084',
  card: '#111833',
  kpBands: [ // NOAA-like
    '#2DC937', '#99C140', '#E7B416', '#DB7B2B', '#CC3232' // 0-1, 2-3, 4-5, 6-7, 8-9
  ],
};

	•	Spacing scale: 4,8,12,16,24
	•	Radius: 16 on cards, 24 on big tiles
	•	Shadows: subtle, opacity 0.2 on dark

10) Error Handling & Empty States
	•	If any fetch fails, show cached values with a tiny “offline” badge.
	•	If no OVATION yet, render a placeholder gradient with “Fetching aurora map…”.
	•	Timeouts after 10s → retry once.

11) Performance
	•	Avoid re-render storms: memoize parsed datasets.
	•	Keep OVATION rasterization under ~16ms per frame; precompute once per fetch.
	•	Sparkline downsampled.

12) Testing
	•	Unit: parsers for Kp, mag, plasma, alerts (with snapshot JSON).
	•	Integration: store actions refreshAll, alert logic with mocked time.
	•	MSW: mock endpoints with realistic payloads.

13) README
	•	Quick start, feature list, screenshots (placeholders), privacy (no accounts, no tracking), data attribution (NOAA/SWPC), support info.

14) Acceptance Criteria (must-haves)
	1.	App builds & runs on Expo Go (iOS/Android).
	2.	Home shows Kp Now, Speed, Bz, Density, Sparkline, Aurora Heatmap thumbnail, and optional Alert chip.
	3.	Settings to set Kp threshold and Bz gate; request notifications; reset cache.
	4.	Background fetch registers and fires (in dev simulate with foreground call); notifications trigger per rules.
	5.	All parsing functions covered by unit tests with at least one real sample payload each.
	6.	Clean, dark, minimal UI; no TODOs or placeholders in production code.

15) Provide Full Files

Output complete code for:
	•	app/_layout.tsx, app/index.tsx, app/modal-map.tsx, app/modal-settings.tsx
	•	components/KpTile.tsx, components/KpiCard.tsx, components/Sparkline.tsx, components/AuroraHeatmap.tsx, components/AlertChip.tsx, components/Section.tsx
	•	lib/api/fetchJson.ts, lib/api/swpc.ts, lib/api/parsers/{kp.ts,mag.ts,plasma.ts,ovation.ts,alerts.ts}
	•	lib/state/useStore.ts, lib/state/persist.ts
	•	lib/util/{time.ts,colors.ts,math.ts,notifications.ts,background.ts}
	•	Testing setup & sample tests under tests/
	•	README.md

Important build notes for you (the coding bot):
	•	Implement Skia-based heatmap (not a static image).
	•	Implement CSV-like JSON parsing for plasma/mag 2-hour feeds.
	•	Make the background fetch logic idempotent and resilient to missing points.
	•	Include a minimal permissions flow for notifications and (optionally) location, but do not hard-block the app if denied.
	•	UI should feel polished and premium: consistent spacing, rounded cards, subtle gradients, and calm motion.

When you’re done, return all files as code blocks with paths and the full file contents so I can copy/paste into my Expo project, plus a short section in README with screenshots placeholders and App Store description copy.

⸻

That’s the full spec—build it exactly like this.