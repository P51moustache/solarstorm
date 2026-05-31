# Persona Gap Analysis: Current App vs. User Needs

**Date:** 2026-01-26
**Purpose:** Identify missing features by comparing in-depth persona requirements to current implementation

---

## Summary

| Persona | Features Needed | Implemented | Partial | Missing | Coverage |
|---------|-----------------|-------------|---------|---------|----------|
| Satellite Ops Manager | 18 | 5 | 4 | 9 | 39% |
| Power Grid Engineer | 12 | 1 | 2 | 9 | 17% |
| GNSS Engineer | 12 | 6 | 2 | 4 | 58% |

**Overall Assessment:** The app serves GNSS engineers reasonably well, provides foundational satellite ops features, but has almost no power grid functionality.

---

## Persona 1: Satellite Operations Manager

### Implemented (5)

| Need | Feature | Location |
|------|---------|----------|
| Real-time Kp monitoring | Kp gauge + 24h trend | Dashboard |
| CME arrival countdown | CME countdown widget | Dashboard |
| Drag risk by altitude | Drag Risk Index calculation | Satellite Dashboard |
| Orbit-raising tracking | Orbit-raising satellite list | Satellite Dashboard |
| Basic fleet management | Add/view/remove satellites | Satellite Dashboard |

### Partially Implemented (4)

| Need | Current State | Gap |
|------|---------------|-----|
| **Anomaly logging** | Can log anomalies with type/severity | No automatic correlation with space weather at time of anomaly |
| **Bulk fleet operations** | CSV import exists | No batch status updates, fleet-wide risk overview, or export |
| **Safe mode recommendation** | Drag risk shows "critical" level | No explicit "recommend safe mode now" trigger or notification |
| **3-day Kp forecast** | Shows current + 24h history | No 3-day forecast view for maneuver planning |

### Missing (9)

| Need | Why It Matters | Priority |
|------|----------------|----------|
| **SEP/Proton event monitoring** | High-energy protons cause single-event upsets, damage electronics. Critical for GEO and polar-orbit satellites. | HIGH |
| **Surface charging risk (GEO)** | Electron flux spikes cause differential charging and arcing on GEO satellites. Major cause of anomalies. | HIGH |
| **Particle flux display** | Shows proton/electron flux levels - the actual threat to satellites beyond drag | HIGH |
| **NORAD ID / TLE import** | Operators identify satellites by NORAD catalog number. Manual entry is tedious. | MEDIUM |
| **Launch window assessment** | "Should we delay launch?" based on storm forecast | MEDIUM |
| **MEO radiation belt risk** | Van Allen belt transit is dangerous for MEO satellites | MEDIUM |
| **Early burn recommendation** | "Accelerate orbit-raising before storm" - time-critical advice | MEDIUM |
| **Tracking reliability status** | Post-storm, tracking catalog becomes stale. Operators need to know when to trust conjunction data. | LOW |
| **Storm replay correlation** | View historical storms overlaid with fleet anomalies to identify patterns | LOW |

### Key Quotes from Persona Document (Unaddressed)

> "My biggest fear isn't the storm itself—it's making decisions with incomplete information."

**Gap:** No indication of data confidence/staleness, no tracking reliability status.

> "I need forecasts specific to my altitudes and my satellites."

**Gap:** Drag risk exists but no altitude-specific density forecast visualization.

> "When Starlink lost those 40 satellites, it was a wake-up call."

**Gap:** No explicit "orbit-raising danger" alert or early burn recommendation.

---

## Persona 2: Power Grid Reliability Engineer

### Implemented (1)

| Need | Feature | Location |
|------|---------|----------|
| Basic storm awareness | Kp index, G-scale in alerts | Dashboard |

### Partially Implemented (2)

| Need | Current State | Gap |
|------|---------------|-----|
| **G-scale classification** | Alert feed shows G1-G5 when SWPC issues them | No dedicated G-scale widget, no mapping of current conditions to G-scale |
| **Lead time alerts** | CME countdown exists | Not framed for grid operators (no "12-48h warning" emphasis) |

### Missing (9)

| Need | Why It Matters | Priority |
|------|----------------|----------|
| **dB/dt monitoring** | Rate of magnetic field change is what actually drives GICs - not Kp. This is THE critical metric for grid operators. | CRITICAL |
| **GIC risk visualization** | Regional maps showing where GICs are most severe based on geology and line configuration | HIGH |
| **Reference event benchmarking** | "This storm is 60% as severe as 1989 Quebec" provides context for decision-making | HIGH |
| **Action recommendations** | Explicit "recommend load shedding" or "recommend transformer isolation" based on thresholds | HIGH |
| **Transformer risk assessment** | Which transformers are most vulnerable based on age, location, line length | MEDIUM |
| **Grid topology input** | Let users define their infrastructure for personalized risk assessment | MEDIUM |
| **Post-event reports** | Generate inspection checklists, incident documentation for NERC compliance | MEDIUM |
| **Magnetometer data display** | Raw magnetic field measurements from ground stations | LOW |
| **NERC compliance reporting** | Format reports for regulatory submission | LOW |

### Key Quotes from Persona Document (Unaddressed)

> "We're over-indexed on Kp and G-scale when what really matters is dB/dt."

**Gap:** App shows Kp but not dB/dt. This is a fundamental miss for this persona.

> "A storm that ramps up slowly gives us time to react. A sudden impulse is what kills us."

**Gap:** No rate-of-change metrics, no impulse detection.

> "Our biggest transformers are 40 years old and irreplaceable."

**Gap:** No transformer tracking, no asset-specific risk assessment.

> "NERC compliance has forced us to model GIC vulnerability."

**Gap:** No compliance reporting features.

### Assessment

**The app essentially does not serve power grid engineers.** The only relevant feature is basic Kp/alert monitoring, which they can get from SWPC directly. Without dB/dt and GIC-specific features, there's no value proposition for this persona.

**Recommendation:** Either build out power grid features significantly (Phase 4+ work) or de-prioritize this persona until core satellite/GNSS features are complete.

---

## Persona 3: GNSS/Navigation Engineer

### Implemented (6)

| Need | Feature | Location |
|------|---------|----------|
| Ionospheric TEC monitoring | Global mean, max, regional TEC | GNSS Dashboard |
| Scintillation severity | S4 index, severity classification | GNSS Dashboard |
| Loss of lock risk | Risk level indicator | GNSS Dashboard |
| RTK/PPP advisory | Warning when conditions degraded | GNSS Dashboard |
| Regional focus mode | Add monitoring regions by lat/lng/radius | GNSS Dashboard |
| Multi-constellation status | GPS, GLONASS, Galileo, BeiDou health | GNSS Dashboard |

### Partially Implemented (2)

| Need | Current State | Gap |
|------|---------------|-----|
| **GNSS error probability** | TEC-based error estimation exists in code | Not prominently displayed, no "expected position error: X meters" |
| **Scintillation forecast** | Shows current conditions | No forecast of when scintillation will improve/worsen |

### Missing (4)

| Need | Why It Matters | Priority |
|------|----------------|----------|
| **"Will I get RTK fix today?"** | Predictive assessment before dispatching crews. The #1 question GNSS engineers ask. | HIGH |
| **Recovery time estimate** | "When will conditions improve?" - critical for deciding whether to wait or reschedule | HIGH |
| **GNSS correction data export** | Download historical TEC data for post-processing position corrections | MEDIUM |
| **API access** | Autonomous vehicles and machine control need programmatic access | MEDIUM |

### Key Quotes from Persona Document (Unaddressed)

> "We just see that we can't get a fix—we don't know why or when it will clear."

**Gap:** No explanation of WHY conditions are bad, no recovery time estimate.

> "There's no warning system. We drive to a job site and find out conditions are bad."

**Gap:** No predictive "will conditions be good at X location at Y time?" tool.

> "We waste hours waiting for conditions to improve with no idea when that will be."

**Gap:** No recovery forecast.

> "Post-processing can fix a lot of ionospheric errors, but only if we have good TEC data."

**Gap:** No TEC data export for post-processing.

### Assessment

**The app provides good foundational GNSS monitoring** but lacks the predictive and planning features that would make it indispensable. The real value-add would be answering "Should I dispatch crews today?" and "When will this clear up?"

---

## Cross-Persona Gaps

### 1. Predictive vs. Reactive

**Current state:** App is mostly reactive - shows current conditions.

**Gap:** All three personas need predictions:
- Satellite ops: "What will conditions be during tomorrow's maneuver window?"
- Power grid: "How severe will this storm get?"
- GNSS: "Will I get RTK fix at 9 AM tomorrow?"

**Missing features:**
- 3-day Kp forecast display
- Storm intensity predictions
- Condition recovery estimates
- Location-specific forecasts by time

### 2. Decision Support

**Current state:** App shows data but doesn't make recommendations.

**Gap:** All three personas want explicit recommendations:
- "Recommend delaying maneuver"
- "Recommend load shedding"
- "Recommend rescheduling survey"

**Missing features:**
- Action recommendation engine
- Threshold-based decision triggers
- "What should I do?" guidance

### 3. Historical Correlation

**Current state:** 30-day history exists but no correlation tools.

**Gap:** All three personas manually correlate their incidents with space weather.

**Missing features:**
- Overlay user events (anomalies, outages) on space weather timeline
- Pattern detection across historical events
- "Your fleet is 2x more sensitive than average to Kp 6+ events"

### 4. Export and Integration

**Current state:** Data is displayed but not exportable.

**Gap:** Professional users need to:
- Export data for compliance reports
- Feed data to other systems
- Generate documentation for stakeholders

**Missing features:**
- CSV/PDF export for all data types
- API access (Pro tier)
- Compliance report templates

### 5. Particle Environment

**Current state:** Not displayed at all.

**Gap:** Proton and electron flux are critical for:
- Single-event upsets (satellites)
- Surface charging (GEO satellites)
- Radiation dose (aviation - not a top-3 persona but related)

**Missing features:**
- Proton flux display (GOES data)
- Electron flux display (GOES data)
- S-scale (Solar Radiation Storm) indicator
- Particle event alerts

---

## Recommended Priority for Gaps

### Immediate (Next Sprint)

| Feature | Persona | Effort | Impact |
|---------|---------|--------|--------|
| Particle flux display (proton/electron) | Satellite Ops | Medium | High |
| 3-day Kp forecast | All | Low | Medium |
| Recovery time estimate for GNSS | GNSS | Medium | High |
| Position error estimate display | GNSS | Low | Medium |

### Short-term (Next Month)

| Feature | Persona | Effort | Impact |
|---------|---------|--------|--------|
| SEP/proton event alerts | Satellite Ops | Medium | High |
| Surface charging risk (GEO) | Satellite Ops | Medium | High |
| "Will I get RTK fix?" predictor | GNSS | High | High |
| Safe mode recommendation | Satellite Ops | Medium | Medium |
| Action recommendations | All | Medium | High |

### Medium-term (Quarter)

| Feature | Persona | Effort | Impact |
|---------|---------|--------|--------|
| dB/dt monitoring | Power Grid | High | Critical for persona |
| NORAD/TLE import | Satellite Ops | Medium | Medium |
| Storm replay correlation | Satellite Ops | High | Medium |
| TEC data export | GNSS | Medium | Medium |
| API access | All Pro | High | Medium |

### Longer-term (Deferred)

| Feature | Persona | Notes |
|---------|---------|-------|
| GIC risk maps | Power Grid | Requires significant data/modeling work |
| Grid topology input | Power Grid | Complex feature, low current demand |
| NERC compliance reports | Power Grid | Niche, defer until power grid MVP exists |
| Career dose tracking | Aviation | Not a top-3 persona |

---

## Conclusion

**GNSS Engineer** is the best-served persona at ~58% coverage. Key gaps are predictive features.

**Satellite Ops Manager** has foundational features at ~39% coverage but is missing particle environment data which is critical for their decision-making.

**Power Grid Engineer** is essentially unserved at ~17% coverage. The fundamental metric they need (dB/dt) doesn't exist in the app.

**Recommendation:** Focus on:
1. Adding particle flux (serves Satellite Ops immediately)
2. Adding predictive features (serves all personas)
3. Deciding whether to invest in Power Grid features or defer that persona

