# Which niche should SolarStorm serve? (23 Nov 2026)

Zach chose to re-aim SolarStorm at a group that checks space weather and might pay, instead of aurora chasers.
This page compares the candidates before any code is written.

## Candidates

| | Ham radio (HF operators) | Drone pilots | Precision farming (RTK GPS) |
| --- | --- | --- | --- |
| Why they care | Flares, Kp and solar flux decide which HF bands are open today | High Kp can make GPS drift; pilots check it before flying | Ionospheric scintillation throws RTK guidance off by up to ~25 cm |
| What they use now | DX Toolbox ($3.99), HAMSignal ($3.99, band alerts), PhosphorHertz ($0.99), HamBand (free) | UAV Forecast (subscription; Kp is one tile among wind, GPS and no-fly zones) | Nothing for farmers; ESA and NOAA work is still at the research or prototype stage |
| How they pay | One-time purchases of $1-4 are normal and expected | Subscriptions, and reviews complain about them | Through equipment dealers (B2B); not an App Store buyer |
| Fit with today's app | High: R/S/G scales, flares, Kp and alerts already cover most of a propagation read; it adds per-band open/closed ratings and MUF | Low: a Kp tile is a commodity feature inside a bigger fly-or-not app SolarStorm doesn't have | Low: needs scintillation data the app doesn't have, plus a sales channel |
| Work to get there | Band ratings from solar flux, Kp, X-ray flux and D-region absorption (all free NOAA data); a band-open alert; new store listing and screenshots | Wind, GPS satellite count and airspace data, competing head-on with an established app | A B2B product, not an app change |

## Recommendation

**Ham radio.** It is the only group that already pays one-time prices for this kind of app, which fits Zach's
"no subscription" view; the existing data covers most of what they need; and the gap is clear: the
current apps are either dated (DX Toolbox, from 2012, laid out for the iPad) or thin (HamBand). The pitch:
"Which HF bands are open right now, and why", with a plain-language read like SolarStorm's headline.

Risks: the market is small (roughly 750k US licensees, older and loyal to existing tools), and per-band ratings
from global indices are approximate, so the app has to say so plainly.

## What it means for the board items

- **ovation-odds**: drop for now (aurora odds stop being the main read; the current formula stays).
- **server-alerts**: drop. A band-open alert can start on the phone; a server only if people pay for it.
- **commercial-branch**: tag it and delete the branch (RevenueCat and the aurora alert engine don't fit).
- **New**: band ratings, a band-open alert, and a new store listing.

## Sources

- [UAV Forecast on the App Store](https://apps.apple.com/us/app/id1050023752)
- [DX Toolbox](https://apps.apple.com/us/app/dx-toolbox/id492113368), [HamBand](https://apps.apple.com/app/id6772585467)
- [Ionospheric scintillation in precision agriculture (GPS World)](https://www.gpsworld.com/the-challenge-of-ionospheric-scintillation-in-precision-agriculture/)
- [Farmers and space weather (STCE)](https://www.stce.be/news/612/welcome.html)
