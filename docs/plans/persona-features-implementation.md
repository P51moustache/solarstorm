# Persona Features Implementation Plan

**Date:** 2026-01-26
**Purpose:** Technical implementation plan for closing persona gaps

---

## Executive Summary

**Good news:** Much of the backend logic already exists but isn't exposed in the UI.

| Category | Count |
|----------|-------|
| Features with backend + UI | 8 |
| Features with backend, needs UI | 7 |
| Features needing new backend + UI | 4 |
| **Total gaps to close** | **11** |

---

## Part 1: Features That Just Need UI (Backend Exists)

These can be shipped quickly - the calculation logic is already written.

### 1.1 Position Error Display (GNSS Dashboard)

**Backend:** `lib/api/parsers/tec.ts` → `estimatePositionError(tec, isDualFrequency)`

**Current state:** Function exists, returns `{ horizontalM, verticalM, description }`

**UI needed:** Add to GNSS Dashboard TEC section

```tsx
// In GNSS Dashboard, after TEC display
<div className="p-4 bg-[#0a0f1a] rounded-lg">
  <p className="text-xs text-solar-muted mb-1">Estimated Position Error</p>
  <div className="flex gap-4">
    <div>
      <p className="text-lg font-bold text-solar-text font-mono">
        {positionError.horizontalM.toFixed(2)}m
      </p>
      <p className="text-xs text-solar-muted">Horizontal</p>
    </div>
    <div>
      <p className="text-lg font-bold text-solar-text font-mono">
        {positionError.verticalM.toFixed(2)}m
      </p>
      <p className="text-xs text-solar-muted">Vertical</p>
    </div>
  </div>
  <p className="text-xs text-solar-muted mt-2">{positionError.description}</p>
</div>
```

**Effort:** 1 hour

---

### 1.2 Launch Window Assessment (Satellite Dashboard)

**Backend:** `lib/services/launchAssessment.ts` → `assessLaunchWindow()`

**Current state:** Full implementation with go/caution/no-go logic, factor analysis, recommendations

**UI needed:** New widget on Satellite Dashboard

```tsx
// components/satellite/LaunchAssessmentWidget.tsx
export function LaunchAssessmentWidget({
  targetAltitude,
  kp,
  protonFlux,
  electronFlux,
  solarWindSpeed
}) {
  const assessment = assessLaunchWindow(
    targetAltitude, kp, protonFlux, electronFlux, solarWindSpeed
  );

  return (
    <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-4">Launch Window Assessment</h3>

      {/* GO/CAUTION/NO-GO badge */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl font-bold" style={{ color: assessment.color }}>
          {assessment.overall.toUpperCase()}
        </span>
      </div>

      {/* Factor table */}
      <table className="w-full text-sm">
        {assessment.factors.map(factor => (
          <tr key={factor.name}>
            <td className="py-1 text-solar-muted">{factor.name}</td>
            <td className="py-1 text-right font-mono">{factor.value}</td>
            <td className="py-1 w-3">
              <span className={`w-2 h-2 rounded-full inline-block bg-${factor.status}-500`} />
            </td>
          </tr>
        ))}
      </table>

      {/* Recommendations */}
      <div className="mt-4 pt-4 border-t border-solar-border">
        {assessment.recommendations.map((rec, i) => (
          <p key={i} className="text-xs text-solar-muted">{rec}</p>
        ))}
      </div>
    </div>
  );
}
```

**Effort:** 2 hours

---

### 1.3 Maneuver Window Assessment (Satellite Dashboard)

**Backend:** `lib/services/maneuverPlanner.ts` → `assessManeuverConditions()`

**Current state:** Full implementation with orbit-type-specific constraints

**UI needed:** Add to satellite detail panel when satellite is selected

```tsx
// When a satellite is selected, show maneuver conditions
const maneuverAssessment = assessManeuverConditions(
  satellite.orbit_type,
  satellite.is_orbit_raising,
  kp,
  protonFlux,
  electronFlux
);

// Display quality badge + risks + recommendations
```

**Effort:** 2 hours

---

### 1.4 Radiation Belt Risk (Satellite Dashboard - MEO Satellites)

**Backend:** `lib/services/radiationBelt.ts` → `assessRadiationBeltRisk()`, `isInRadiationBelt()`

**Current state:** Full implementation with Van Allen belt boundaries, risk levels

**UI needed:** Show for MEO satellites and orbit-raising through belts

```tsx
// For MEO satellites or satellites transiting belts
const beltLocation = isInRadiationBelt(satellite.altitude_km);
const beltRisk = assessRadiationBeltRisk(
  satellite.altitude_km, protonFlux, electronFlux, kp
);

// Show: "Inner Van Allen Belt - HIGH RISK" with recommendations
```

**Effort:** 2 hours

---

### 1.5 Storm-Anomaly Correlation View (Satellite Dashboard)

**Backend:** `lib/services/stormCorrelation.ts` → `correlateAnomaliesWithStorm()`, `analyzeAnomalyPatterns()`

**Current state:** Can correlate anomalies with storms, analyze patterns

**UI needed:** New section in Anomaly Log showing correlations

```tsx
// components/satellite/AnomalyCorrelationView.tsx
// Shows:
// - Timeline of anomalies overlaid with Kp/storm events
// - Pattern analysis (which anomaly types correlate with storms)
// - Correlation strength indicators
```

**Effort:** 4 hours

---

### 1.6 Scintillation Prediction by Location (GNSS Dashboard)

**Backend:** `lib/api/parsers/scintillation.ts` → `predictScintillationRisk()`

**Current state:** Can predict equatorial and auroral scintillation risk based on location, time, Kp

**UI needed:** Add prediction to GNSS dashboard for monitored regions

```tsx
// For each monitored region, calculate prediction
const prediction = predictScintillationRisk(
  kp,
  region.center_lat,
  new Date().getHours(),
  new Date().getMonth() + 1
);

// Show: "Scintillation Forecast: Moderate risk post-sunset"
```

**Effort:** 2 hours

---

### 1.7 G-Scale Prominent Display (Dashboard)

**Backend:** `lib/services/stormCorrelation.ts` → `classifyGeomagneticStorm()`

**Current state:** Function exists, but G-scale only shown in alert text

**UI needed:** Add G-scale badge next to Kp on main dashboard

```tsx
// In dashboard, next to Kp gauge
const gScale = classifyGeomagneticStorm(kp);
// Show: "G2" badge with color coding
```

**Effort:** 30 minutes

---

## Part 2: Features Needing New Backend + UI

### 2.1 3-Day Kp Forecast

**Data source:** `https://services.swpc.noaa.gov/text/3-day-geomag-forecast.txt`

**Format:** Text file with 3-hourly Kp predictions for 3 days

**Implementation:**

1. **Parser** (`lib/api/parsers/kpForecast.ts`):
```typescript
export interface KpForecastPoint {
  timestamp: string;
  kp: number;
  day: 1 | 2 | 3;
}

export interface KpForecast {
  issuedAt: string;
  points: KpForecastPoint[]; // 24 points (8 per day × 3 days)
  stormProbabilities: {
    minor: number;  // G1-G2
    moderate: number; // G3
    strong: number;  // G4-G5
  };
}

export function parseKpForecast(text: string): KpForecast {
  // Parse the text format
  // Extract 3-hourly Kp values
  // Extract storm probabilities
}
```

2. **API function** (`lib/api/swpc.ts`):
```typescript
const KP_FORECAST_URL = 'https://services.swpc.noaa.gov/text/3-day-geomag-forecast.txt';

export async function getKpForecast(): Promise<KpForecast> {
  const text = await fetch(KP_FORECAST_URL).then(r => r.text());
  return parseKpForecast(text);
}
```

3. **UI Component** (`components/charts/KpForecastChart.tsx`):
```tsx
// 3-day chart showing:
// - Historical 24h (existing data)
// - Forecast 72h (new data)
// - Storm probability bands
// - Current time marker
```

4. **Dashboard integration:**
- Add "3-Day Forecast" tab/toggle to Kp section
- Show storm probabilities as badges

**Effort:** 6 hours

---

### 2.2 dB/dt Monitoring (Power Grid)

**Data source:** `https://services.swpc.noaa.gov/json/goes/primary/magnetometers-1-day.json`

**Current state:** Magnetometer data available but dB/dt not calculated

**Implementation:**

1. **Parser** (`lib/api/parsers/dbdt.ts`):
```typescript
export interface DbdtReading {
  timestamp: string;
  dbdt: number; // nT/min
  bTotal: number; // nT
}

export interface DbdtStatus {
  current: number;
  peak1h: number;
  peak24h: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  gicRisk: 'low' | 'moderate' | 'high' | 'extreme';
}

export function calculateDbdt(magReadings: MagReading[]): DbdtReading[] {
  // Calculate derivative: (B[t] - B[t-1]) / dt
  // dt is typically 1 minute
  // Return array of dB/dt values
}

export function assessGicRisk(dbdt: number): DbdtStatus['gicRisk'] {
  // Thresholds based on literature:
  // < 50 nT/min: low
  // 50-300 nT/min: moderate
  // 300-500 nT/min: high
  // > 500 nT/min: extreme
}
```

2. **API function** (`lib/api/magnetometer.ts`):
```typescript
export async function getDbdtStatus(): Promise<DbdtStatus> {
  const magData = await fetchJson(MAG_1DAY_URL);
  const readings = calculateDbdt(parseMagData(magData));
  // Return current, peak, trend, risk level
}
```

3. **UI Component** (`components/grid/DbdtWidget.tsx`):
```tsx
// Show:
// - Current dB/dt value with large number
// - 24h trend chart
// - GIC risk level badge
// - "60% of 1989 Quebec peak" benchmark comparison
```

4. **New page or section:** Could add to main dashboard for all users, or create Power Grid dashboard

**Effort:** 8 hours

---

### 2.3 GNSS Recovery Time Estimate

**Data source:** Derived from TEC/scintillation trends + Kp forecast

**Implementation:**

1. **Service** (`lib/services/gnssRecovery.ts`):
```typescript
export interface RecoveryEstimate {
  estimatedHours: number | null;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
  recommendation: string;
}

export function estimateGnssRecovery(
  currentTec: number,
  currentS4: number,
  kpForecast: KpForecastPoint[],
  localHour: number,
  latitude: number
): RecoveryEstimate {
  // Factors:
  // 1. Is Kp forecast to decrease?
  // 2. Is it approaching daytime (TEC peaks midday)?
  // 3. Is scintillation time-dependent (post-sunset)?

  // Logic:
  // - If Kp dropping and approaching dawn: "~2-4 hours"
  // - If storm ongoing: "Unable to estimate - monitor conditions"
  // - If equatorial scintillation: "Should clear by ~01:00 local"
}
```

2. **UI Integration** (GNSS Dashboard):
```tsx
// Add to scintillation/TEC section
<div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
  <p className="text-sm font-medium text-amber-400">
    Conditions Expected to Improve
  </p>
  <p className="text-2xl font-bold text-solar-text">
    ~{recoveryEstimate.estimatedHours} hours
  </p>
  <p className="text-xs text-solar-muted">
    {recoveryEstimate.recommendation}
  </p>
</div>
```

**Effort:** 4 hours (requires 3-day Kp forecast first)

---

### 2.4 "Will I Get RTK Fix?" Predictor

**Data source:** Combines TEC, scintillation, Kp forecast, location

**Implementation:**

1. **Service** (`lib/services/rtkPredictor.ts`):
```typescript
export interface RtkPrediction {
  willGetFix: 'likely' | 'uncertain' | 'unlikely';
  confidence: number; // 0-100
  factors: {
    name: string;
    status: 'good' | 'caution' | 'bad';
    detail: string;
  }[];
  bestWindow: {
    startHour: number;
    endHour: number;
  } | null;
  recommendation: string;
}

export function predictRtkAvailability(
  lat: number,
  lng: number,
  targetTime: Date,
  currentTec: number,
  currentS4: number,
  kpForecast: KpForecastPoint[]
): RtkPrediction {
  // Evaluate:
  // 1. TEC at target time (based on diurnal pattern)
  // 2. Scintillation risk at target time
  // 3. Kp forecast for target time
  // 4. Location (equatorial vs auroral vs mid-latitude)

  // Return prediction with confidence level
}
```

2. **UI Component** (`components/gnss/RtkPredictor.tsx`):
```tsx
// Interactive widget:
// - Location selector (use monitored regions)
// - Time selector (next 24 hours in 1-hour increments)
// - Shows prediction with color coding
// - Suggests best time windows
```

3. **Integration:**
- Add to GNSS Dashboard as expandable section
- "Plan Your Survey" workflow

**Effort:** 6 hours (requires Kp forecast + scintillation prediction)

---

## Part 3: Implementation Phases

### Phase A: Quick Wins (1-2 days)

| Feature | Effort | Impact |
|---------|--------|--------|
| Position error display | 1h | GNSS persona |
| G-scale badge | 30m | All personas |
| Scintillation prediction | 2h | GNSS persona |
| **Total** | **3.5h** | |

### Phase B: Satellite Ops Features (2-3 days)

| Feature | Effort | Impact |
|---------|--------|--------|
| Launch assessment widget | 2h | Satellite ops |
| Maneuver window widget | 2h | Satellite ops |
| Radiation belt risk display | 2h | Satellite ops (MEO) |
| Storm-anomaly correlation | 4h | Satellite ops |
| **Total** | **10h** | |

### Phase C: Predictive Features (3-4 days)

| Feature | Effort | Impact |
|---------|--------|--------|
| 3-day Kp forecast | 6h | All personas |
| GNSS recovery estimate | 4h | GNSS persona |
| RTK availability predictor | 6h | GNSS persona |
| **Total** | **16h** | |

### Phase D: Power Grid Foundation (Optional, 1 week)

| Feature | Effort | Impact |
|---------|--------|--------|
| dB/dt monitoring | 8h | Power grid persona |
| GIC risk assessment | 8h | Power grid persona |
| Benchmark comparisons | 4h | Power grid persona |
| **Total** | **20h** | |

---

## Part 4: Data Source Reference

### Already Connected
| Data | Endpoint | Update |
|------|----------|--------|
| Kp (current) | `planetary_k_index_1m.json` | 1 min |
| Solar wind | `mag-2-hour.json`, `plasma-2-hour.json` | 1 min |
| Aurora | `ovation_aurora_latest.json` | 5 min |
| Alerts | `alerts.json` | As issued |
| Proton flux | `integral-protons-1-day.json` | 5 min |
| Electron flux | `integral-electrons-1-day.json` | 5 min |

### Needs Connection
| Data | Endpoint | Update |
|------|----------|--------|
| Kp forecast | `3-day-geomag-forecast.txt` | 4x daily |
| Magnetometer | `magnetometers-1-day.json` | 1 min |

---

## Part 5: Files to Create/Modify

### New Files
```
lib/api/parsers/kpForecast.ts     # Kp forecast parser
lib/api/parsers/dbdt.ts           # dB/dt calculator
lib/api/magnetometer.ts           # Magnetometer API
lib/services/gnssRecovery.ts      # Recovery time estimation
lib/services/rtkPredictor.ts      # RTK availability prediction

components/satellite/LaunchAssessmentWidget.tsx
components/satellite/ManeuverAssessmentWidget.tsx
components/satellite/RadiationBeltWidget.tsx
components/satellite/AnomalyCorrelationView.tsx
components/gnss/PositionErrorDisplay.tsx
components/gnss/RecoveryEstimate.tsx
components/gnss/RtkPredictor.tsx
components/charts/KpForecastChart.tsx
components/grid/DbdtWidget.tsx
```

### Modified Files
```
app/dashboard/page.tsx            # Add G-scale badge, Kp forecast toggle
app/gnss-dashboard/page.tsx       # Add position error, recovery estimate, RTK predictor
app/satellite-dashboard/page.tsx  # Add launch assessment, maneuver, radiation belt widgets
lib/api/swpc.ts                   # Add getKpForecast(), getDbdt()
lib/state/useGnssStore.ts         # Add recovery estimate state
```

---

## Summary

**Total new features:** 11
**Total effort estimate:** ~50 hours

**Recommended order:**
1. Phase A (Quick Wins) - Immediate value, low effort
2. Phase C (Kp Forecast) - Enables predictive features
3. Phase B (Satellite Ops) - Complete satellite persona
4. Phase C (GNSS Predictive) - Complete GNSS persona
5. Phase D (Power Grid) - If persona is prioritized

After Phases A-C, persona coverage improves to:
- **GNSS Engineer:** 58% → 85%
- **Satellite Ops Manager:** 39% → 70%
- **Power Grid Engineer:** 17% → 17% (unchanged without Phase D)

