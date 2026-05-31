# Space Weather-Affected Professionals: In-Depth Persona Research

**Document Type:** User Research Synthesis
**Date:** 2026-01-26
**Methodology:** Industry research, job analysis, and domain expert synthesis

---

## Executive Summary

This document profiles three professional roles whose work is significantly impacted by space weather events. These personas represent high-value users who make critical decisions based on solar activity data, with financial stakes ranging from tens of thousands to hundreds of millions of dollars per incident.

---

## Persona 1: Satellite Operations Manager

### The Person

**Name archetype:** Marcus Chen
**Age range:** 35-50
**Education:** Aerospace Engineering, Electrical Engineering, or Physics (BS/MS). Many have military backgrounds (Air Force Space Command, Navy satellite communications).
**Career path:** Started as a satellite engineer or mission controller, progressed through systems engineering, then into operations management.
**Salary range:** $120,000 - $200,000+ depending on organization size and location.

### The Organization

Satellite Operations Managers work at:
- **Commercial satellite operators** (SES, Intelsat, Eutelsat, Viasat)
- **NewSpace companies** (SpaceX Starlink, OneWeb, Amazon Kuiper, Planet Labs)
- **Government agencies** (NOAA, NASA, NRO, Space Force)
- **Defense contractors** (Lockheed Martin, Northrop Grumman, Boeing)

Team size varies dramatically:
- Traditional GEO operator: 5-15 person ops team managing 20-50 satellites
- Mega-constellation: 50-200 person ops team managing 1,000-5,000+ satellites

### Daily Responsibilities

**Morning routine (0600-0800):**
- Review overnight telemetry anomalies flagged by automated systems
- Check space weather conditions (Kp index, solar wind, any CME alerts)
- Brief with night shift on any issues requiring day-shift attention
- Review upcoming conjunction alerts from 18th Space Control Squadron

**Core operations (0800-1700):**
- **Health monitoring:** Continuous review of satellite telemetry (power levels, thermal status, attitude control, payload performance)
- **Anomaly investigation:** When something looks wrong, determine if it's a satellite issue, ground issue, or space environment issue
- **Maneuver planning:** Coordinate station-keeping burns, collision avoidance maneuvers, orbit adjustments
- **Coordination:** Interface with customers, frequency coordinators, launch providers, regulatory bodies

**Decision-making frequency:**
- Routine decisions: Dozens per day (maneuver approvals, configuration changes)
- Significant decisions: Several per week (anomaly responses, procedure changes)
- Critical decisions: Several per year (safe mode entries, end-of-life decisions, emergency maneuvers)

### The Fleet They Manage

**GEO satellites (traditional operators):**
- Altitude: 35,786 km
- Cost per satellite: $150M - $400M
- Lifespan: 15-20 years
- Revenue per satellite: $50M - $150M annually
- Primary concerns: Surface charging from electron flux, single-event upsets from cosmic rays

**LEO constellations (NewSpace):**
- Altitude: 300-600 km (Starlink), 1,200 km (OneWeb)
- Cost per satellite: $250K - $1M (mass production)
- Lifespan: 5-7 years
- Fleet size: 1,000 - 40,000+ satellites
- Primary concerns: Atmospheric drag during geomagnetic storms, conjunction management

**MEO satellites (navigation, communications):**
- Altitude: 2,000-35,786 km
- Must transit Van Allen radiation belts
- Primary concerns: Cumulative radiation damage, single-event effects

### Space Weather Impact on Their Work

**Geomagnetic storms (elevated Kp):**

When a geomagnetic storm hits, the thermosphere heats up and expands. At 400 km altitude, atmospheric density can increase 2-10x during a severe storm. This causes:

1. **Increased drag on LEO satellites**
   - Satellites lose altitude faster than planned
   - Orbit predictions become unreliable (conjunction screening fails)
   - Fuel budget consumed faster (shorter mission life)
   - Starlink lost 40 satellites in February 2022 from a Kp 5 storm during orbit-raising

2. **Tracking loss**
   - 18th Space Control Squadron temporarily loses track of objects
   - Catalog positions become stale
   - Collision avoidance calculations unreliable
   - Must fly "blind" until tracking catches up (12-48 hours post-storm)

**Solar energetic particle (SEP) events:**

High-energy protons from solar flares can:
- Cause single-event upsets (bit flips in memory, processor glitches)
- Degrade solar panels over time
- Damage sensitive electronics permanently
- Require autonomous safe mode entry to protect systems

**Surface charging (GEO satellites):**

During substorms, electrons at GEO can spike dramatically:
- Differential charging builds up on satellite surfaces
- Electrostatic discharge can damage electronics
- Anomalies often occur during eclipse season when thermal/electrical conditions align

### Their Tools and Data Sources

**Primary operations tools:**
- Satellite control software (EPOCH, STK, custom mission systems)
- Telemetry databases and trending tools
- Conjunction assessment systems (CARA, commercial providers)
- Frequency coordination systems

**Space weather sources they currently use:**
- NOAA Space Weather Prediction Center (swpc.noaa.gov)
- NASA DONKI (CME database)
- SpaceWeatherLive.com
- Solar Dynamics Observatory imagery
- Internal spreadsheets tracking Kp vs. anomalies

**Pain points with current tools:**
- "SWPC is great for data, but I need it translated into operational decisions"
- "We track Kp in a spreadsheet and manually correlate with our anomalies"
- "No single tool connects solar activity to what I should do with MY satellites"
- "The 3-day Kp forecast is too coarse for maneuver planning"

### Critical Questions They Need Answered

1. **"Should I delay this maneuver?"** - Is a storm coming that would make the maneuver risky or waste fuel?

2. **"Is this anomaly space weather related?"** - Or do I need to troubleshoot my satellite?

3. **"Should I put this satellite in safe mode?"** - Is the particle environment dangerous enough to warrant it?

4. **"When will tracking be reliable again?"** - When can I trust conjunction data post-storm?

5. **"Should we delay launch?"** - Is the environment safe for orbit-raising?

### A Day When Space Weather Matters

**Scenario: CME impact predicted in 36 hours**

Hour 0 (CME detected on SOHO):
- Marcus gets alert from SWPC: CME launched, Earth-directed
- Estimated arrival: 36-48 hours
- Estimated strength: Kp 6-7 possible

Hour 12:
- Convenes operations team
- Reviews all satellites in vulnerable positions
- Three Starlink batches currently in orbit-raising phase (most vulnerable)
- Two GEO satellites approaching eclipse season

Hour 24:
- Decision point: Accelerate orbit-raising burns to get above 400 km before storm?
- Trade-off: Uses extra fuel but reduces storm exposure
- Decision: Yes, execute early burns for the lowest batch

Hour 36 (CME arrives):
- DSCOVR detects solar wind jump at L1
- 30-60 minutes until Earth impact
- Commands sent to switch vulnerable GEO satellites to charging-safe configuration
- Ground stations alerted to expect tracking disruptions

Hour 48-72 (storm in progress):
- Monitoring telemetry for anomalies
- Cross-referencing any glitches with particle/charging data
- Tracking catalog becoming unreliable
- Conjunction alerts paused (false alarm rate too high)

Hour 96 (storm recovery):
- Tracking accuracy restored
- Assessing any damage or anomalies
- Documenting lessons learned
- Updating procedures if needed

### Quotes (Synthesized from Industry Knowledge)

> "When Starlink lost those 40 satellites, it was a wake-up call for the whole industry. We thought we understood atmospheric drag, but we were caught off guard by how fast conditions changed."

> "My biggest fear isn't the storm itself—it's making decisions with incomplete information. When tracking goes stale, I'm flying partially blind."

> "I need forecasts specific to my altitudes and my satellites. A generic Kp forecast doesn't tell me if my 350 km orbit-raisers are in danger."

> "We've been manually correlating our anomaly database with space weather for years. It's tedious, but it's the only way to understand our fleet's sensitivity."

---

## Persona 2: Power Grid Reliability Engineer

### The Person

**Name archetype:** Sarah Mitchell
**Age range:** 40-55
**Education:** Electrical Engineering (BS required, PE license typical). Many have MS degrees in power systems.
**Certifications:** Professional Engineer (PE), NERC certifications (various), Six Sigma
**Career path:** Started as a relay technician or system operator, progressed through engineering roles, now manages grid reliability and compliance.
**Salary range:** $100,000 - $180,000

### The Organization

Power Grid Reliability Engineers work at:
- **Transmission operators** (grid operators managing high-voltage lines)
- **Independent System Operators (ISOs)** (ERCOT, CAISO, PJM, MISO, NYISO)
- **Utilities** (Duke Energy, Southern Company, Xcel Energy, National Grid)
- **Regional reliability coordinators**
- **Government agencies** (NERC, FERC, DOE)

**Coverage area:** A single reliability engineer may be responsible for:
- 10,000-50,000 miles of transmission lines
- 100-500 substations
- 50-200 large power transformers (each worth $5-15M)
- Serving 1-10 million customers

### Daily Responsibilities

**Core functions:**

1. **Real-time monitoring**
   - Grid frequency (must stay within 59.95-60.05 Hz)
   - Line loadings and thermal limits
   - Transformer temperatures and dissolved gas analysis
   - Reactive power flow and voltage profiles

2. **Contingency analysis**
   - "What if this line trips?" analysis runs continuously
   - N-1 and N-2 contingency planning
   - Ensuring the grid can survive any single failure

3. **Maintenance coordination**
   - Scheduling outages for maintenance without risking reliability
   - Managing seasonal peak preparation
   - Transformer oil testing and replacement scheduling

4. **Compliance and reporting**
   - NERC reliability standards compliance (mandatory)
   - Incident reporting and root cause analysis
   - Emergency procedure maintenance

### The Infrastructure They Protect

**Transformers (the critical assets):**

Large power transformers (LPTs) are the grid's most vulnerable and irreplaceable components:

- **Cost:** $5-15 million each
- **Lead time:** 12-18 months to manufacture and install
- **Lifespan:** 40-60 years (but vulnerable to damage)
- **Spares:** Utilities typically have 1-3 spares for dozens of units

A transformer damaged by geomagnetically induced currents (GICs) may:
- Fail catastrophically (fire, explosion)
- Degrade silently over years (insulation damage)
- Require immediate removal from service

**The March 1989 Quebec blackout:**
- Kp 9 geomagnetic storm
- GICs caused harmonics that tripped protective relays
- Cascading failures blacked out entire province in 92 seconds
- 6 million people without power for 9+ hours
- Several transformers permanently damaged

**The 2003 Halloween storms:**
- Kp 9 storm damaged transformers in South Africa
- One transformer failed 2 weeks later (delayed damage from insulation breakdown)
- $100+ million in damages globally

### Understanding GICs (Geomagnetically Induced Currents)

**The physics:**
- During geomagnetic storms, Earth's magnetic field fluctuates rapidly
- These fluctuations induce electric fields at Earth's surface
- Long transmission lines act as antennas, picking up these induced voltages
- Quasi-DC currents (GICs) flow through transformer windings

**Why GICs are dangerous:**
- Transformers are designed for 60 Hz AC, not DC
- DC currents cause the transformer core to saturate
- Saturated cores draw massive reactive power (VARs)
- Saturation causes hot spots, overheating, and vibration
- Harmonics from saturated transformers can trip protective systems

**The key metric: dB/dt**
- "dB/dt" = rate of change of the magnetic field
- This is what actually drives GICs—not the field strength itself
- A rapidly changing field induces stronger currents than a steady strong field
- Peak dB/dt of 1,000-2,000 nT/min recorded in extreme storms

### Geographic Vulnerability

**High risk areas:**
- **High latitudes** (Canada, northern US, Scandinavia)
- **Igneous rock geology** (poor ground conductivity concentrates GICs)
- **Coastal regions** (ocean-land conductivity contrasts)
- **Long transmission lines** (more voltage pickup)

**The Quebec factor:**
- Built on Canadian Shield (igneous rock, poor conductivity)
- Long transmission lines from James Bay hydro projects
- High latitude (closer to auroral zone)
- "Perfect storm" geography for GIC vulnerability

### Their Tools and Data Sources

**Primary operations tools:**
- SCADA systems (Supervisory Control and Data Acquisition)
- Energy Management Systems (EMS)
- State estimators and power flow analysis
- Transformer monitoring systems (dissolved gas, temperature)
- GIC monitoring devices (where installed)

**Space weather sources they currently use:**
- NOAA SWPC G-scale alerts (G1-G5)
- NERC GMD alerts
- Some utilities subscribe to commercial space weather services
- Internal procedures tied to G-scale thresholds

**Pain points with current tools:**
- "G-scale alerts are too coarse—a G2 can be worse than a G3 depending on where you are"
- "We need dB/dt data, not just Kp. That's what actually drives GICs."
- "Our procedures say 'monitor transformers during G2+' but we don't have real-time GIC measurements on most units"
- "We can't easily compare current conditions to historical events that caused damage"

### NERC Requirements and Compliance

**TPL-007-4 (Transmission System Planned Performance for Geomagnetic Disturbance Events):**
- Requires utilities to model GIC vulnerability
- Must demonstrate grid can survive a benchmark GMD event
- Requires transformer thermal impact assessments
- Mandates mitigation plans for vulnerable transformers

**EOP-010-1 (Geomagnetic Disturbance Operations):**
- Requires operating procedures for GMD events
- Must have plans to reduce GIC impacts during storms
- Coordination with Reliability Coordinator required

**Compliance burden:**
- Utilities spend significant resources on GMD compliance
- Models are complex and require specialized expertise
- Real-time data often doesn't match the compliance models

### Critical Questions They Need Answered

1. **"What's the dB/dt right now, and what's it forecasted to be?"** - The actual driver of GICs.

2. **"How does this compare to 1989 Quebec or 2003 Halloween?"** - Context for severity.

3. **"Which of my transformers are at highest risk right now?"** - Based on location, geology, line configuration.

4. **"Should I shed load or isolate transformers?"** - Concrete operational recommendations.

5. **"Is the worst over, or is there more coming?"** - Storm phases can have multiple peaks.

6. **"What do I document for NERC?"** - Compliance reporting requirements.

### A Day When Space Weather Matters

**Scenario: G4 (Severe) geomagnetic storm warning**

Hour -24 (CME heading to Earth):
- Sarah receives SWPC watch for potential G3-G4 storm
- Reviews vulnerable asset list (transformers in high-GIC areas)
- Alerts operations team and management
- Confirms emergency procedures are accessible

Hour -6:
- Storm upgraded to G4 warning based on L1 data
- Activates GMD operating procedure
- Operators begin monitoring transformer temperatures more frequently
- Considers pre-positioning crews for rapid response

Hour 0 (storm arrives):
- SWPC issues G4 warning
- dB/dt spikes detected at magnetometer stations
- GIC monitoring systems (where installed) show elevated readings
- SCADA shows transformer VAR consumption increasing (saturation signature)

Hour +1:
- Decision point: One transformer showing elevated temperature
- Options: Continue monitoring vs. reduce load vs. isolate
- Factors: Customer impact, transformer age/value, forecast duration
- Decision: Reduce load through the affected transformer, continue monitoring

Hour +3:
- Storm intensifies—dB/dt hits 500 nT/min
- Second transformer showing heating
- Protective relay trips on harmonics (unexpected)
- Grid automatically reconfigures but now running N-1 contingency

Hour +6:
- Storm subsiding but not over
- Dissolved gas analysis ordered for stressed transformers
- Crews standing by for visual inspections
- Documenting timeline for NERC reporting

Hour +24 (storm ended):
- Post-event analysis begins
- Transformer oil samples sent to lab
- Reviewing all relay trips and their causes
- Preparing incident report for reliability coordinator

### Quotes (Synthesized from Industry Knowledge)

> "The 1989 Quebec blackout is our nightmare scenario. We plan and drill for it, but a real Carrington-class event would challenge every assumption we've made."

> "We're over-indexed on Kp and G-scale when what really matters is dB/dt. A storm that ramps up slowly gives us time to react. A sudden impulse is what kills us."

> "Our biggest transformers are 40 years old and irreplaceable. There's no Amazon Prime for a 500 MW transformer. Damage one and you're looking at 12-18 months without it."

> "NERC compliance has forced us to model GIC vulnerability, which is good. But the models assume a benchmark event. Real storms don't follow the benchmark."

---

## Persona 3: GNSS/Navigation Engineer

### The Person

**Name archetype:** Dr. James Okonkwo
**Age range:** 30-50
**Education:** Electrical Engineering, Geodesy, or Geomatics (MS often required, PhD common in research roles)
**Specialization:** Signal processing, geodesy, ionospheric modeling, or systems integration
**Career path:** Academic research → industry applications, or direct to surveying/construction tech
**Salary range:** $90,000 - $160,000

### The Organization

GNSS/Navigation Engineers work at:
- **Survey and geospatial companies** (Trimble, Hexagon/Leica, Topcon)
- **Autonomous vehicle companies** (Waymo, Cruise, TuSimple, John Deere autonomy)
- **Precision agriculture** (precision planting, auto-steer systems)
- **Aerospace and defense** (guided munitions, aircraft navigation)
- **Construction technology** (machine control, site positioning)
- **Government/research** (NOAA, universities, national geodetic surveys)

### The Technology They Work With

**GNSS constellations:**
- **GPS** (USA): 31 satellites, first and most mature
- **GLONASS** (Russia): 24 satellites, different signal structure
- **Galileo** (EU): 28 satellites, highest accuracy signals
- **BeiDou** (China): 35 satellites, regional and global coverage

**Positioning techniques:**

1. **Standard positioning (SPS):** 3-5 meter accuracy
   - Consumer phones, basic car navigation
   - Not affected significantly by space weather

2. **Differential GPS (DGPS):** 1-3 meter accuracy
   - Marine navigation, GIS mapping
   - Somewhat sensitive to ionospheric conditions

3. **RTK (Real-Time Kinematic):** 1-2 centimeter accuracy
   - Surveying, precision agriculture, construction
   - Highly sensitive to ionospheric conditions

4. **PPP (Precise Point Positioning):** 2-10 centimeter accuracy
   - Post-processing and real-time
   - Requires accurate ionospheric models

### How GNSS Works (Simplified)

**The basic principle:**
- Satellites broadcast signals with precise timing information
- Receiver measures time delay from multiple satellites
- Trilateration calculates position from distances
- Clock errors resolved with 4+ satellite measurements

**The ionosphere problem:**
- Signals must pass through Earth's ionosphere
- Ionosphere contains free electrons that slow radio signals
- Delay varies with Total Electron Content (TEC)
- Different frequencies delayed different amounts (basis for correction)

**Dual-frequency correction:**
- L1 (1575.42 MHz) and L2 (1227.60 MHz) delayed differently
- Difference reveals ionospheric delay
- Most survey-grade receivers use dual-frequency

### Space Weather Impact on Their Work

**Total Electron Content (TEC) variations:**

During geomagnetic storms, TEC can vary dramatically:
- Normal quiet conditions: 10-30 TECU (TEC Units)
- Storm conditions: 50-100+ TECU
- Gradual variations can be modeled and corrected
- Rapid variations cannot be corrected in real-time

**Scintillation:**

The most disruptive phenomenon for GNSS:

- **Definition:** Rapid fluctuations in signal amplitude and phase
- **Cause:** Small-scale ionospheric irregularities (1-10 km)
- **Effect:** Signal fading, cycle slips, complete loss of lock
- **S4 index:** Standard measure (S4 > 0.6 = severe)

**Where scintillation occurs:**
- **Equatorial regions:** Post-sunset (1900-2400 local time), worst during equinoxes
- **Polar regions:** During geomagnetic storms, any time
- **Mid-latitudes:** Rare, but during severe storms the auroral oval expands

**Impact by application:**

| Application | TEC Impact | Scintillation Impact |
|------------|------------|---------------------|
| Consumer GPS | Minimal | Minimal |
| Fleet tracking | Minimal | Minimal |
| Aircraft navigation | Low | Moderate (approach issues) |
| Surveying | Moderate | High (stops work) |
| Precision ag | Moderate | High (auto-steer fails) |
| Autonomous vehicles | Moderate | Very high (safety-critical) |
| Machine control | High | Very high (excavator digs wrong) |

### RTK and Why It's Vulnerable

**How RTK works:**
- Base station at known location
- Base broadcasts correction data to rover
- Corrections valid only for nearby rovers (10-50 km)
- Achieves 1-2 cm accuracy by eliminating common errors

**RTK during space weather events:**

1. **Integer ambiguity resolution fails**
   - RTK must resolve carrier phase "integers"
   - Ionospheric gradients cause ambiguity resolution to fail
   - "Float" solution (10-50 cm) instead of "fixed" (1-2 cm)

2. **Convergence time increases**
   - Normal: 10-30 seconds to first fix
   - During storms: Minutes to never

3. **Position jumps**
   - Sudden ionospheric changes cause position to jump
   - Dangerous for machine control (excavator suddenly thinks it's 20 cm off)

**Network RTK (VRS, MAX, etc.):**
- Uses multiple base stations to model ionosphere
- More robust than single-base RTK
- Still fails during severe scintillation
- Can actually give false confidence (reports "fixed" but position is wrong)

### Their Tools and Data Sources

**Hardware:**
- Multi-frequency, multi-constellation receivers (Trimble R12, Leica GS18)
- Base stations and reference networks
- Correction service subscriptions (Trimble RTX, Hexagon SmartNet)

**Software:**
- Post-processing software (Trimble Business Center, Leica Infinity)
- Real-time network software
- Quality control and analysis tools

**Current space weather sources:**
- Most rely on receiver-reported quality metrics (PDOP, fix status)
- Some check SWPC manually when having issues
- Research community uses IGS TEC maps

**Pain points:**
- "We just see that we can't get a fix—we don't know why or when it will clear"
- "There's no warning system. We drive to a job site and find out conditions are bad"
- "We waste hours waiting for conditions to improve with no idea when that will be"
- "Our customers think our equipment is broken when it's actually space weather"

### Critical Questions They Need Answered

1. **"Will I get RTK fix today at this location?"** - Before dispatching crews.

2. **"What's causing my poor fix rate right now?"** - Satellite issues vs. ionosphere vs. equipment.

3. **"When will conditions improve?"** - Do I wait 30 minutes or go home?

4. **"How do I explain this to my customer?"** - Documentation that it's not equipment failure.

5. **"Should I use Network RTK or single-base today?"** - Different techniques for different conditions.

6. **"What corrections do I need for post-processing?"** - Historical TEC data for precise results.

### A Day When Space Weather Matters

**Scenario: Survey crew doing construction staking during storm recovery**

0600 - Crew dispatch:
- James checks SWPC: Kp 5, recovering from yesterday's storm
- Equatorial spread-F risk low (mid-latitude site)
- Decides to dispatch crew with caution

0800 - Crew arrives at site:
- Sets up base station, rover initializes
- Getting float solution, not fixed
- "Give it a few minutes"

0830:
- Still float after 30 minutes
- Crew calls James: "What's going on?"
- James checks: TEC elevated but not extreme, some scintillation reported
- Advises: "Try a different reference station"

0900:
- Still struggling with ambiguity resolution
- Customer (contractor) getting impatient
- Grade stakes were due today

0930:
- Brief period of fixed solution, crew stakes 5 points
- Solution drops to float again
- Crew uncertain if those 5 points are reliable

1100:
- Conditions improving as ionosphere settles
- Getting consistent fixed solutions
- But only 3 hours of the work day left

1600:
- Job completed, but took full day instead of half day
- Extra labor cost: $800
- Customer relationship strained
- James documents: "Storm recovery day - recommend scheduling buffer after G3+ events"

### Specialized Concerns by Industry

**Precision Agriculture:**
- Auto-steer requires 2-10 cm accuracy continuously
- Pass-to-pass accuracy critical (overlap wastes inputs, gaps miss coverage)
- Planting season timing is inflexible—can't delay for space weather
- A scintillation event during planting can misalign entire rows

**Autonomous Vehicles:**
- Safety-critical application requiring high integrity
- Must detect and flag degraded solutions
- Fusion with IMU and cameras can help, but GNSS outage is still problematic
- Regulatory frameworks requiring integrity monitoring

**Construction Machine Control:**
- Excavators, graders, dozers guided by GNSS
- Wrong position = dig in wrong place = expensive fix
- Operators often don't understand position quality indicators
- Machine control systems don't always fail gracefully

### Quotes (Synthesized from Industry Knowledge)

> "Scintillation is our nemesis. The receiver just loses lock and there's nothing you can do but wait. We've had entire work days wiped out by ionospheric storms."

> "The frustrating thing is there's no warning. We show up, set up, and then spend an hour troubleshooting before realizing it's space weather, not our equipment."

> "Precision agriculture has very narrow planting windows. You can't tell a farmer 'sorry, the ionosphere is acting up, we'll plant tomorrow.' The corn has to go in the ground."

> "For autonomous vehicles, we need to not just know when positioning is bad—we need to know that we know. Integrity is as important as accuracy."

> "Post-processing can fix a lot of ionospheric errors, but only if we have good TEC data. And that data isn't always easy to find or in a usable format."

---

## Cross-Persona Patterns

### Common Themes

1. **Data exists but isn't actionable**
   - All three personas can access raw space weather data
   - None have tools that translate it to their specific operational context
   - Manual correlation between events and impacts is common

2. **Warning systems are too generic**
   - Kp and G-scale don't capture what actually matters
   - Satellite ops needs altitude-specific density
   - Power grid needs dB/dt
   - GNSS needs regional scintillation

3. **Historical correlation is valuable but tedious**
   - All three manually correlate past anomalies with space weather
   - Pattern recognition helps predict future vulnerability
   - Current process is spreadsheets and institutional memory

4. **Decision support is the gap**
   - Raw data abundant, decision support absent
   - "Should I do X?" is the question they need answered
   - Current tools show conditions but don't recommend actions

### Decision Time Horizons

| Persona | Immediate (min) | Short-term (hours) | Planning (days) |
|---------|-----------------|--------------------|--------------------|
| Satellite Ops | Safe mode entry | Maneuver planning | Launch windows |
| Power Grid | Load shedding | Crew positioning | Maintenance scheduling |
| GNSS Engineer | Job dispatch | Crew reallocation | Contract scheduling |

### Stakeholder Communication

All three personas must explain space weather impacts to non-technical stakeholders:

- **Satellite Ops:** Board members, customers, insurance
- **Power Grid:** Regulators (NERC), management, public affairs
- **GNSS:** Customers, contractors, project managers

This creates demand for:
- Clear visualizations
- Benchmark comparisons ("60% as severe as 1989 Quebec")
- Documentation for compliance and incident reports

---

## Appendix: Glossary of Technical Terms

| Term | Definition |
|------|------------|
| Kp index | 3-hour planetary geomagnetic activity index (0-9 scale) |
| G-scale | NOAA geomagnetic storm scale (G1-G5) |
| dB/dt | Rate of change of magnetic field (nT/min) |
| GIC | Geomagnetically Induced Current |
| TEC | Total Electron Content (electrons/m² in ionosphere) |
| TECU | TEC Unit = 10^16 electrons/m² |
| S4 index | Scintillation intensity index |
| RTK | Real-Time Kinematic positioning |
| PPP | Precise Point Positioning |
| SEP | Solar Energetic Particle event |
| CME | Coronal Mass Ejection |
| Thermosphere | Upper atmosphere (80-600 km) where LEO satellites orbit |
| Ballistic coefficient | Satellite property: mass/(drag coefficient × area) |
| Safe mode | Satellite protective configuration during hazardous conditions |
| N-1 contingency | Grid can survive any single component failure |
| SCADA | Supervisory Control and Data Acquisition |

