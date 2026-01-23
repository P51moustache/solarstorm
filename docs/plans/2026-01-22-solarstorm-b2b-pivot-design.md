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
| 3 | Airline Flight Ops Manager | $50-100K per polar reroute | Pro/Enterprise |
| 4 | GNSS/Navigation Engineer | 10-30m positioning errors | Pro |
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
| Photo Planning Mode | Best times based on aurora + weather + darkness |
| Cloud Cover Overlay | Weather integration for aurora viewing |
| Historical Data (90 days) | Browse and analyze past activity |
| Quiet Hours | Configurable alert blackout periods |

### Pro Tier ($49/month)

Everything in Plus, plus:

| Feature | Description |
|---------|-------------|
| **Satellite Fleet Manager** | Add satellites by name, altitude, inclination |
| **Drag Risk Index** | Real-time risk assessment per satellite |
| **Thermospheric Density Forecast** | Density increase predictions |
| **Safe Mode Recommendation** | Automated safe mode timing suggestions |
| **Maneuver Window Planner** | Low-risk windows for orbit adjustments |
| **Storm Replay + Correlation** | Historical storm analysis vs. your assets |
| **GIC Risk Maps** | Geomagnetically induced current visualization |
| **Polar Route HF Forecast** | Blackout probability by flight route |
| **Ionospheric TEC Maps** | GPS error probability |
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
GET  /api/v1/risk/satellite      # Risk for altitude (?altitude_km=&inclination=)
GET  /api/v1/density/forecast    # Thermospheric density forecast
POST /api/v1/satellites          # Add satellite to fleet
GET  /api/v1/satellites/:id/risk # Risk for specific satellite

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

| Alert | Trigger | Lead Time |
|-------|---------|-----------|
| CME Launched | SOHO/LASCO coronagraph detection | 1-3 days |
| CME Arrival Imminent | DSCOVR L1 solar wind jump | 30-60 min |
| Kp Threshold Exceeded | Real-time measurement | Immediate |
| Drag Risk Elevated | Forecast model | 4-24 hours |
| Safe Mode Recommended | Rules engine | User-configurable |
| Maneuver Window Opening | Forecast clears | 6-24 hours |

---

## Data Sources (All Free/Public)

| Data | Source | Update Frequency |
|------|--------|------------------|
| Kp Index | NOAA SWPC | 1 minute |
| Solar Wind (Bz, speed, density) | NOAA SWPC (DSCOVR) | 1 minute |
| Aurora Probability (OVATION) | NOAA SWPC | 5 minutes |
| NOAA Alerts | NOAA SWPC | As issued |
| 3-Day Kp Forecast | NOAA SWPC | 3x daily |
| F10.7 Solar Flux | NOAA SWPC | Daily |
| CME Detection | DONKI API (NASA) | As detected |
| Cloud Cover | OpenWeather API | Hourly |
| Ionospheric TEC | NOAA SWPC | 15 minutes |

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
- [ ] Photo planning mode
- [ ] Cloud cover integration (OpenWeather)
- [ ] 90-day historical data explorer
- [ ] Quiet hours for alerts
- [ ] Browser push notifications

### Phase 3: Pro Tier - Satellite Ops

**Goal:** Enterprise value, justify $49/month

- [ ] Satellite fleet manager (CRUD)
- [ ] Drag risk index calculator
- [ ] Thermospheric density model integration
- [ ] Safe mode recommendation engine
- [ ] Maneuver window planner
- [ ] Storm replay with asset correlation
- [ ] REST API with authentication
- [ ] API documentation (interactive)
- [ ] Rate limiting infrastructure
- [ ] CSV data export
- [ ] 2-year historical data retention

### Phase 4: Enterprise + Expansion

**Goal:** Large customer value, justify $199+/month

- [ ] Team/organization management
- [ ] Role-based access control
- [ ] SSO integration (SAML)
- [ ] Webhook system
- [ ] Custom alert rules engine
- [ ] GIC risk maps (power grid persona)
- [ ] Polar route HF forecasts (airline persona)
- [ ] Ionospheric TEC maps (GNSS persona)
- [ ] SLA monitoring dashboard
- [ ] Usage analytics
- [ ] Dedicated support ticketing

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
