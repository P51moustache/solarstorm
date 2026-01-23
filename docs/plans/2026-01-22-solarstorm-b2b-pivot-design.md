# SolarStorm B2B Pivot Design

**Date:** 2026-01-22
**Status:** Approved
**Author:** Collaborative design session

---

## Executive Summary

SolarStorm pivots from a $1.99 consumer aurora app to a unified space weather intelligence platform serving hobbyists through enterprise satellite operators. Single product, four pricing tiers, web-first with iOS to follow.

**Target Revenue:** $1M+ ARR via tiered subscriptions ($0 - $199+/month)

---

## Product Vision

**Product:** SolarStorm - Space Weather Intelligence

**Tagline:** "Know before the storm hits. Protect million-dollar assets."

**Core Value:** Translate raw solar physics into decision-ready, role-specific intelligence.

---

## Target Personas (Prioritized)

| Priority | Persona | Pain Point | Target Tier |
|----------|---------|------------|-------------|
| 1 | Satellite Operations Manager | Lost 40 satellites in one storm ($5-10M each) | Pro/Enterprise |
| 2 | Power Grid Reliability Engineer | Transformer damage, blackouts ($5-10M each) | Pro/Enterprise |
| 3 | GNSS/Navigation Engineer | 10-30m positioning errors, loss of lock | Pro |
| 4 | Airline Flight Ops Manager | $50-100K per polar reroute, crew radiation | Pro/Enterprise |
| 5 | Amateur Radio Operator | HF blackouts, propagation planning | Plus |
| 6 | Aurora Photographer/Enthusiast | Missed aurora events | Plus/Free |

---

## Pricing Model

| Tier | Price | Target User |
|------|-------|-------------|
| **Free** | $0 | Curious hobbyists, students |
| **Plus** | $9.99/month | Aurora chasers, ham radio, preppers |
| **Pro** | $49/month | Serious operators, small sat companies, researchers |
| **Enterprise** | $199+/month | Satellite fleets, airlines, power utilities |

Annual pricing: 2 months free (e.g., Plus = $99.99/year)

---

## Feature Matrix

### Core Features (All Tiers)

| Feature | Free | Plus | Pro | Enterprise |
|---------|------|------|-----|------------|
| Real-time Kp index | Yes | Yes | Yes | Yes |
| Solar wind (Bz, speed, density) | Yes | Yes | Yes | Yes |
| Aurora probability map (2D) | Yes | Yes | Yes | Yes |
| NOAA alert feed | Yes | Yes | Yes | Yes |
| Basic alerts (1/day) | Yes | - | - | - |

### Plus Tier ($9.99/month)

| Feature | Description |
|---------|-------------|
| 3D Interactive Globe | Photorealistic aurora oval, pinch/rotate/zoom |
| Location-Based Predictions | "73% chance at your location in 2.5 hours" |
| Unlimited Smart Alerts | Kp + Bz thresholds, no daily limit |
| Multi-Location Monitoring | Track up to 5 favorite locations |
| HF Propagation Map | Band-by-band visualization for ham operators |
| **Solar Flux Index (SFI) Trends** | F10.7 chart for propagation planning |
| **CME Countdown Widget** | Visual countdown to predicted storm arrival |
| **R-Scale Radio Blackout Status** | Real-time HF blackout severity (R1-R5) |
| Photo Planning Mode | Best times based on aurora + weather + darkness |
| Cloud Cover Overlay | Weather integration for aurora viewing |
| Historical Data (90 days) | Browse and analyze past activity |
| Quiet Hours | Configurable alert blackout periods |

### Pro Tier ($49/month)

Everything in Plus, plus:

**Satellite Operations:**
| Feature | Description |
|---------|-------------|
| **Satellite Fleet Manager** | Add satellites by name, altitude, inclination, **ballistic coefficient**, orbit type (LEO/MEO/GEO) |
| **Drag Risk Index** | Real-time risk assessment per satellite (LEO focus) |
| **Surface Charging Risk** | Electron flux monitoring for GEO satellite charging/arcing risk |
| **Thermospheric Density Forecast** | Density increase predictions |
| **Safe Mode Recommendation** | Automated safe mode timing suggestions |
| **Maneuver Window Planner** | Low-risk windows for orbit adjustments |
| **Orbit-Raising Mode** | Special monitoring for newly-launched satellites in vulnerable orbit-raising phase |
| **SEP/Proton Event Alerts** | Solar energetic particle monitoring for electronics protection |
| **Launch Window Assessment** | Delay recommendations based on storm forecasts |
| **Storm Replay + Correlation** | Historical storm analysis vs. your assets |
| **Anomaly Logging** | Record satellite anomalies to correlate with space weather events |

**Power Grid:**
| Feature | Description |
|---------|-------------|
| **GIC Risk Maps** | Geomagnetically induced current visualization |
| **dB/dt Monitoring** | Rate of magnetic field change - the actual GIC driver |
| **G-Scale Classification** | Map storms to NERC G1-G5 scale |
| **Reference Event Benchmarking** | "This storm = 60% of 1989 Québec event" |
| **Transformer Risk Assessment** | Risk level per asset class |
| **Action Recommendations** | Explicit "recommend load shedding" / "recommend transformer isolation" |
| **Grid Topology Input** | Define your transformer locations and line lengths (basic) |
| **Post-Event Reports** | Inspection scheduling, incident logging, damage assessment |

**Aviation:**
| Feature | Description |
|---------|-------------|
| **Polar Route HF Forecast** | Blackout probability by named route (NAT Tracks, Pacific, etc.) |
| **Radiation Dose Calculator** | Crew/passenger exposure at multiple flight levels (FL350, FL390, etc.) |
| **Cumulative Dose Estimator** | Total dose over flight duration, not just instantaneous rate |
| **Route-Specific Alerts** | "North Atlantic Track B at risk in 3 hours" |
| **Alternative Route Suggestions** | "Consider Track D as lower-risk alternative" |
| **Compliance Report Export** | FAA/ICAO advisory format reports |

**GNSS/Navigation:**
| Feature | Description |
|---------|-------------|
| **Ionospheric TEC Maps** | Total electron content visualization (global + regional) |
| **Scintillation Forecasts** | Rapid fluctuations that cause receiver loss of lock |
| **GNSS Error Probability** | Positioning accuracy degradation forecast |
| **RTK/PPP Degradation Alerts** | Notify when precision ops should pause |
| **Regional Focus Mode** | Set your operating region for localized TEC/scintillation data |

**General Pro:**
| Feature | Description |
|---------|-------------|
| **API Access** | REST API, 1000 requests/day |
| **Data Export (CSV)** | Download historical data |
| **Historical Data (2 years)** | Extended analysis period |

### Enterprise Tier ($199+/month)

Everything in Pro, plus:

| Feature | Description |
|---------|-------------|
| Webhook Integrations | Push data to your systems |
| SSO / Team Management | SAML, multiple users, roles |
| Custom Alert Rules Engine | Complex conditional logic |
| Unlimited API (10,000+ req/day) | Higher rate limits or custom |
| SLA Guarantee | 99.9% uptime commitment |
| Dedicated Support | Priority response, onboarding |
| Custom Integrations | Tailored to your workflow |

---

## Persona Feature Coverage Matrix

This matrix validates that each persona's critical needs are addressed:

### Persona 1: Satellite Operations Manager (Pro/Enterprise)

| Persona Requirement | Feature | Tier | Phase |
|---------------------|---------|------|-------|
| Forecasted Kp + storm arrival | 3-day Kp forecast, CME alerts | All | 1 |
| Risk windows by altitude/ballistic coeff | Drag Risk Index, Maneuver Window | Pro | 3 |
| Safe-mode triggers | Safe Mode Recommendation | Pro | 3 |
| Historical storm correlation | Storm Replay + Correlation | Pro | 3 |
| **SEP/High-energy particle events** | **SEP/Proton Event Alerts** | Pro | 3 |
| **Surface charging (GEO)** | **Surface Charging Risk** | Pro | 3 |
| **Launch delay recommendations** | **Launch Window Assessment** | Pro | 3 |
| **Orbit-raising vulnerability** | **Orbit-Raising Mode** | Pro | 3 |
| **Anomaly correlation** | **Anomaly Logging** | Pro | 3 |

### Persona 2: Power Grid Engineer (Pro/Enterprise)

| Persona Requirement | Feature | Tier | Phase |
|---------------------|---------|------|-------|
| Regional GIC risk maps | GIC Risk Maps | Pro | 4 |
| **dB/dt rate of change** | **dB/dt Monitoring** | Pro | 3 |
| Lead time alerts (12-48h) | Alert system | All | 1 |
| **NERC severity classification** | **G-Scale (G1-G5) mapping** | Pro | 3 |
| **Historical benchmarking** | **Reference Event Benchmarking** | Pro | 3 |
| **Grid topology input** | **Grid Topology Config** | Pro/Ent | 3/4 |
| **Load shedding recommendation** | **Action Recommendations** | Pro | 3 |
| **Transformer isolation recommendation** | **Action Recommendations** | Pro | 3 |
| **Post-event inspections** | **Post-Event Reports** | Pro | 3 |

### Persona 3: GNSS Engineer (Pro) - Priority 3

| Persona Requirement | Feature | Tier | Phase |
|---------------------|---------|------|-------|
| Ionospheric TEC forecasts | TEC Maps (global + regional) | Pro | 3 |
| **Scintillation / loss of lock** | **Scintillation Forecasts** | Pro | 3 |
| **GNSS error probability** | **Error Probability Overlay** | Pro | 3 |
| **RTK/PPP degradation alerts** | **Degradation Threshold Alerts** | Pro | 3 |
| **Regional focus** | **Regional Focus Mode** | Pro | 3 |
| API for autonomous systems | REST API | Pro | 3 |

### Persona 4: Airline Ops Manager (Pro/Enterprise) - Priority 4

| Persona Requirement | Feature | Tier | Phase |
|---------------------|---------|------|-------|
| **Radiation dose forecasts** | **Radiation Dose Calculator** (multi-altitude) | Pro | 3 |
| **Cumulative dose over flight** | **Cumulative Dose Estimator** | Pro | 3 |
| HF blackout by latitude | Polar Route HF Forecast | Pro | 3 |
| **Route-specific alerts** | **Named Route Alerts (NAT Tracks)** | Pro | 3 |
| **Alternative routing** | **Alternative Route Suggestions** | Pro | 3 |
| **Compliance reporting** | **FAA/ICAO Report Export** | Pro | 3 |

### Persona 5: Amateur Radio Operator (Plus)

| Persona Requirement | Feature | Tier | Phase |
|---------------------|---------|------|-------|
| **Solar Flux Index trends** | **SFI/F10.7 Chart** | Plus | 2 |
| HF band usability | HF Propagation Map | Plus | 2 |
| **CME arrival countdown** | **CME Countdown Widget** | Plus | 2 |
| Propagation maps by band | HF Propagation Map | Plus | 2 |
| **R-scale blackout status** | **R1-R5 Indicator** | Plus | 2 |

### Persona 6: Aurora Photographer (Plus/Free)

| Persona Requirement | Feature | Tier | Phase |
|---------------------|---------|------|-------|
| Aurora probability | 2D/3D Maps | Free/Plus | 1/2 |
| Location predictions | Location-Based Forecast | Plus | 2 |
| Weather overlay | Cloud Cover | Plus | 2 |
| Photo timing | Photo Planning Mode | Plus | 2 |

---

## Technical Architecture

### Stack Overview

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Frontend | Expo (web export) | Reuse existing code, future iOS |
| 3D Graphics | React Three Fiber | Beautiful globe, performant |
| Charts | Recharts / Victory | Professional data visualization |
| State | Zustand | Already implemented |
| Backend | Supabase | Auth, DB, Edge Functions, Storage |
| Database | PostgreSQL (via Supabase) | Row-level security, realtime |
| Payments | Stripe | Subscriptions, usage billing |
| Auth | Supabase Auth | Email, magic link, SSO (Enterprise) |

### Database Schema

```sql
-- Core tables
users (id, email, tier, org_id, created_at)
organizations (id, name, tier, stripe_customer_id, created_at)
org_members (org_id, user_id, role)

-- User configuration
alert_configs (user_id, kp_threshold, bz_threshold, channels, quiet_start, quiet_end)
locations (user_id, lat, lng, label, is_primary)

-- Space weather data (retained)
kp_history (timestamp, value, source)
solar_wind_history (timestamp, bz, speed, density)
ovation_history (timestamp, grid_data)
alerts_noaa (timestamp, type, message, severity)

-- Pro/Enterprise features
satellites (org_id, name, norad_id, altitude_km, inclination, ballistic_coeff)
satellite_risk_log (satellite_id, timestamp, risk_level, density_estimate)

-- System
alert_log (user_id, type, sent_at, payload, delivered)
api_keys (user_id, key_hash, name, last_used, rate_limit)
webhook_configs (org_id, url, events, secret_hash)
```

### API Endpoints (Pro/Enterprise)

```
Authentication:
POST /api/v1/auth/token          # Get API token

Space Weather:
GET  /api/v1/kp/current          # Current Kp index
GET  /api/v1/kp/forecast         # 3-day forecast
GET  /api/v1/kp/history          # Historical data (?from=&to=)
GET  /api/v1/solar-wind/current  # Bz, speed, density
GET  /api/v1/solar-wind/history  # Historical solar wind

Aurora:
GET  /api/v1/aurora/probability  # Global probability grid
GET  /api/v1/aurora/forecast     # Location-specific (?lat=&lng=)

Satellite Risk (Pro+):
GET  /api/v1/risk/satellite      # Risk for altitude (?altitude_km=&inclination=&orbit_type=)
GET  /api/v1/risk/drag           # Drag risk (LEO)
GET  /api/v1/risk/charging       # Surface charging risk (GEO) - electron flux
GET  /api/v1/density/forecast    # Thermospheric density forecast
POST /api/v1/satellites          # Add satellite to fleet
GET  /api/v1/satellites/:id/risk # Risk for specific satellite
GET  /api/v1/satellites/:id/orbit-raising  # Orbit-raising mode status
GET  /api/v1/sep/current         # Solar energetic particle status
GET  /api/v1/launch-window       # Launch window assessment
POST /api/v1/anomalies           # Log satellite anomaly
GET  /api/v1/anomalies/correlate # Correlate anomalies with space weather

Power Grid (Pro+):
GET  /api/v1/gic/risk            # GIC risk by region
GET  /api/v1/gic/dbdt            # dB/dt rate of change (GIC driver)
GET  /api/v1/g-scale/current     # Current G-scale classification
GET  /api/v1/benchmark/:event    # Compare to reference events (quebec-1989, etc.)
GET  /api/v1/grid/recommendations # Action recommendations (load shed, isolate)
POST /api/v1/grid/topology       # Define grid assets
GET  /api/v1/reports/post-event  # Post-event inspection report

GNSS (Pro+):
GET  /api/v1/tec/current         # Ionospheric TEC (global)
GET  /api/v1/tec/regional        # Regional TEC (?lat=&lng=&radius=)
GET  /api/v1/scintillation       # Scintillation index (loss of lock risk)
GET  /api/v1/gnss/error          # GNSS error probability
GET  /api/v1/rtk/status          # RTK/PPP degradation status

Aviation (Pro+):
GET  /api/v1/radiation/dose      # Dose rate at altitude (?alt_ft=&lat=&lng=)
GET  /api/v1/radiation/cumulative # Cumulative dose over route (?route=&duration_hrs=)
GET  /api/v1/routes/risk         # Named route risk (NAT, Pacific)
GET  /api/v1/routes/alternatives # Alternative route suggestions
GET  /api/v1/hf-blackout/polar   # Polar HF blackout forecast
GET  /api/v1/reports/compliance  # Generate FAA/ICAO advisory format report

Integrations (Enterprise):
POST /api/v1/webhooks            # Configure webhook
GET  /api/v1/webhooks            # List webhooks
DELETE /api/v1/webhooks/:id      # Remove webhook
```

### Rate Limits

| Tier | Requests/Day |
|------|--------------|
| Free | No API access |
| Plus | No API access |
| Pro | 1,000 |
| Enterprise | 10,000+ (custom) |

---

## Frontend Architecture

### App Structure

```
/                         → Marketing landing page (public)
/pricing                  → Pricing page with tier comparison
/login                    → Supabase Auth UI
/signup                   → Registration flow
/dashboard                → Main app (authenticated)
/dashboard/globe          → 3D aurora view (Plus+)
/dashboard/alerts         → Alert configuration
/dashboard/history        → Historical data explorer
/dashboard/satellites     → Fleet manager (Pro+)
/dashboard/grid           → GIC risk maps (Pro+)
/dashboard/aviation       → Polar route forecasts (Pro+)
/dashboard/api            → API keys & documentation (Pro+)
/dashboard/team           → Team management (Enterprise)
/settings                 → Account, billing, preferences
/docs/api                 → Public API documentation
```

### Dashboard Layout

Responsive grid that adapts based on tier and user interests:

**Free User:**
- Hero: Current Kp (large)
- Cards: Bz, Speed, Density
- 2D Aurora map (with upgrade CTAs)
- Limited alert status
- Blurred globe preview ("Unlock with Plus")

**Plus User:**
- Hero: Current Kp + personal aurora forecast
- 3D Globe (interactive)
- Multi-location forecasts
- HF propagation panel
- Photo planning widget
- Full alert management

**Pro User:**
- All Plus features
- Satellite fleet panel
- Drag risk indicators
- Maneuver window timeline
- API usage stats
- Data export options

**Enterprise User:**
- All Pro features
- Team activity feed
- Webhook status
- SLA dashboard
- Custom alert rules

---

## Satellite Operator Features (Detail)

### Drag Risk Calculation

```
Inputs:
- Satellite altitude (km)
- Current Kp index
- Forecasted Kp (3-day)
- F10.7 solar flux index

Model (empirical):
- Baseline density at altitude (NRLMSISE-00 approximation)
- Kp multiplier:
  - Kp 0-3: 1.0x (quiet)
  - Kp 4: 1.2x
  - Kp 5: 1.5x
  - Kp 6: 2.0x
  - Kp 7: 2.5x
  - Kp 8: 3.5x
  - Kp 9: 5.0x+

Output:
- Risk level: LOW / MODERATE / HIGH / CRITICAL
- Estimated drag increase percentage
- Recommended action (continue / monitor / safe mode)
```

### Alert Types

| Alert | Trigger | Lead Time | Personas |
|-------|---------|-----------|----------|
| CME Launched | SOHO/LASCO coronagraph detection | 1-3 days | All |
| CME Arrival Imminent | DSCOVR L1 solar wind jump | 30-60 min | All |
| Kp Threshold Exceeded | Real-time measurement | Immediate | All |
| **Drag Risk Elevated** | Density forecast model | 4-24 hours | Satellites (LEO) |
| **Surface Charging Risk** | Electron flux spike | 15-60 min | Satellites (GEO) |
| **Safe Mode Recommended** | Rules engine | User-configurable | Satellites |
| **Maneuver Window Opening** | Forecast clears | 6-24 hours | Satellites |
| **Orbit-Raising Alert** | Storm during vulnerable phase | Immediate | Satellites |
| **SEP Event Detected** | GOES proton flux spike | Minutes | Satellites, Airlines |
| **G-Scale Storm Warning** | NOAA G1-G5 | 15-45 min | Power Grid |
| **dB/dt Spike** | Magnetic field rate of change | Minutes | Power Grid |
| **Load Shedding Recommended** | GIC threshold + grid config | 15-60 min | Power Grid |
| **Scintillation Alert** | Scintillation index spike | 15 min | GNSS |
| **RTK/PPP Degradation** | TEC/scintillation threshold | 15 min | GNSS |
| **R-Scale Blackout** | X-ray flux spike | Minutes | Airlines, Ham Radio |
| **Polar Route Risk** | HF blackout + radiation | 1-6 hours | Airlines |
| **Radiation Dose Warning** | Proton flux at altitude | 30 min | Airlines |

---

## Data Sources (All Free/Public)

| Data | Source | Update Frequency | Used By |
|------|--------|------------------|---------|
| Kp Index | NOAA SWPC | 1 minute | All |
| Solar Wind (Bz, speed, density) | NOAA SWPC (DSCOVR) | 1 minute | All |
| Aurora Probability (OVATION) | NOAA SWPC | 5 minutes | Hobbyists, Plus |
| NOAA Alerts | NOAA SWPC | As issued | All |
| 3-Day Kp Forecast | NOAA SWPC | 3x daily | All |
| F10.7 Solar Flux | NOAA SWPC | Daily | Satellites, Ham Radio |
| CME Detection | DONKI API (NASA) | As detected | All |
| Cloud Cover | OpenWeather API | Hourly | Aurora photographers |
| Ionospheric TEC | NOAA SWPC | 15 minutes | GNSS engineers |
| **Solar Proton Events (EPAM)** | NOAA SWPC | 5 minutes | **Satellites, Airlines** |
| **GOES X-ray Flux** | NOAA SWPC | 1 minute | **R-scale blackouts, Ham Radio** |
| **GOES Proton Flux** | NOAA SWPC | 5 minutes | **Radiation dose (Airlines)** |
| **GOES Electron Flux** | NOAA SWPC | 5 minutes | **Surface charging (GEO satellites)** |
| **G-Scale (Geomagnetic)** | NOAA SWPC | As issued | **Power Grid (NERC)** |
| **Magnetometer dB/dt** | NOAA SWPC / USGS | 1 minute | **GIC driver (Power Grid)** |
| **Scintillation Index** | NOAA SWPC | 15 minutes | **GNSS loss of lock** |

---

## Implementation Roadmap

### Phase 1: Foundation (Web MVP)

**Goal:** Core platform with auth, payments, basic dashboard

- [ ] Supabase project setup (auth, database, edge functions)
- [ ] Stripe integration (4 subscription tiers)
- [ ] Data pipeline (NOAA fetch every 5 min, store to Postgres)
- [ ] Landing page with pricing
- [ ] Auth flow (signup, login, magic link)
- [ ] Core dashboard (Kp, solar wind, 2D aurora map)
- [ ] Basic email alerts
- [ ] Free tier limitations (1 alert/day, 7-day history)

### Phase 2: Plus Tier Features

**Goal:** Consumer wow factor, justify $9.99/month

- [ ] 3D interactive globe (React Three Fiber)
- [ ] Location-based aurora predictions
- [ ] Unlimited smart alerts with custom thresholds
- [ ] Multi-location monitoring (5 locations)
- [ ] HF propagation map
- [ ] **Solar Flux Index (SFI/F10.7) trends chart**
- [ ] **CME countdown widget with predicted arrival time**
- [ ] **R-scale (R1-R5) radio blackout status indicator**
- [ ] Photo planning mode
- [ ] Cloud cover integration (OpenWeather)
- [ ] 90-day historical data explorer
- [ ] Quiet hours for alerts
- [ ] Browser push notifications

### Phase 3: Pro Tier - Satellite Ops + Professional Features

**Goal:** Enterprise value, justify $49/month

**Satellite Operations:**
- [ ] Satellite fleet manager (CRUD with ballistic coefficient, orbit type)
- [ ] Drag risk index calculator (LEO focus)
- [ ] **Surface charging risk monitor (GEO focus - electron flux)**
- [ ] Thermospheric density model integration
- [ ] Safe mode recommendation engine
- [ ] Maneuver window planner
- [ ] **Orbit-raising mode (special monitoring for newly-launched satellites)**
- [ ] **SEP/Solar proton event monitoring and alerts**
- [ ] **Launch window assessment tool**
- [ ] Storm replay with asset correlation
- [ ] **Anomaly logging (correlate your events with space weather)**

**Power Grid:**
- [ ] **dB/dt monitoring (rate of magnetic field change - actual GIC driver)**
- [ ] **G-scale (G1-G5) classification mapping**
- [ ] **Reference event benchmarking (1989 Québec comparisons)**
- [ ] **Transformer risk assessment**
- [ ] **Action recommendations ("recommend load shedding", "recommend isolation")**
- [ ] **Basic grid topology input (transformer locations, line lengths)**
- [ ] **Post-event reports (inspection scheduling, incident logging)**

**GNSS (Priority 3):**
- [ ] **Ionospheric TEC maps (global + regional)**
- [ ] **Scintillation forecasts (loss of lock prediction)**
- [ ] **GNSS error probability visualization**
- [ ] **RTK/PPP degradation threshold alerts**
- [ ] **Regional focus mode (set operating area for localized data)**

**Aviation (Priority 4):**
- [ ] **Radiation dose calculator (multi-altitude: FL350, FL390, etc.)**
- [ ] **Cumulative dose estimator (total dose over flight duration)**
- [ ] **Polar route HF forecast**
- [ ] **Named route support (North Atlantic Tracks, Pacific routes)**
- [ ] **Route-specific alerts ("Track B at risk in 3h")**
- [ ] **Alternative route suggestions ("Consider Track D")**
- [ ] **Compliance report export (FAA/ICAO advisory format)**

**General Pro:**
- [ ] REST API with authentication
- [ ] API documentation (interactive)
- [ ] Rate limiting infrastructure
- [ ] CSV data export
- [ ] 2-year historical data retention

### Phase 4: Enterprise + Expansion

**Goal:** Large customer value, justify $199+/month

**Team & Access:**
- [ ] Team/organization management
- [ ] Role-based access control
- [ ] SSO integration (SAML)

**Integrations:**
- [ ] Webhook system
- [ ] Custom alert rules engine
- [ ] **Grid topology input for power utilities**
- [ ] **Fleet-wide satellite dashboards**

**Infrastructure:**
- [ ] GIC risk maps (power grid persona)
- [ ] Polar route HF forecasts (airline persona)
- [ ] Ionospheric TEC maps (GNSS persona)

**Support & Compliance:**
- [ ] SLA monitoring dashboard
- [ ] Usage analytics
- [ ] Dedicated support ticketing
- [ ] **NERC compliance reporting for power grid**
- [ ] **Audit logs for enterprise compliance**

### Phase 5: iOS App

**Goal:** Mobile presence, App Store revenue

- [ ] Expo iOS build configuration
- [ ] RevenueCat integration (sync with Stripe)
- [ ] Native push notifications (APNs)
- [ ] Home screen widgets (WidgetKit)
- [ ] Lock screen widgets
- [ ] App Store assets and submission
- [ ] TestFlight beta program

---

## Success Metrics

| Metric | Target (Year 1) |
|--------|-----------------|
| Free signups | 10,000 |
| Plus subscribers | 500 |
| Pro subscribers | 50 |
| Enterprise customers | 10 |
| Monthly Recurring Revenue | $15,000+ |
| Annual Recurring Revenue | $180,000+ |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| NOAA API goes down | Cache data aggressively, show "last updated" timestamps |
| Enterprise sales cycle too long | Focus on self-serve Pro tier, enterprise is bonus |
| Too complex for one developer | Strict phasing, ship MVP fast, iterate |
| Satellite operators need more accuracy | Partner with academic models, iterate based on feedback |
| Competition from free tools | Differentiate on UX and decision-ready intelligence |

---

## Open Questions

1. Should we offer a 14-day free trial of Plus/Pro?
2. What's the refund policy?
3. Do we need a privacy policy / terms of service before launch?
4. Should enterprise require a sales call or allow self-serve?

---

## Appendix: Existing Codebase Assets

The current Expo app provides:

- Kp index fetching and display
- Solar wind data (Bz, speed, density)
- OVATION aurora probability parsing
- 2D aurora heatmap (Skia)
- Sparkline charts
- Zustand state management
- Alert threshold logic
- Basic notification infrastructure

These can be reused and extended for Phase 1.
