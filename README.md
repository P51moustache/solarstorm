# SolarStorm

A $1.99 premium iOS/Android app for real-time space weather monitoring and aurora forecasting.

![SolarStorm App Screenshots](./assets/screenshots-placeholder.png)

## Features

- **Real-time Kp Index**: Live geomagnetic activity monitoring with NOAA color coding
- **Solar Wind Data**: Track magnetic field (Bz), speed, and plasma density
- **Aurora Forecasting**: Interactive heatmap showing aurora probability by location
- **Smart Alerts**: Background notifications with customizable thresholds and Bz confirmation
- **Sparkline Charts**: Historical Kp trends over the last 6 hours
- **Dark UI**: Beautiful, astronomy-friendly interface with smooth animations

## App Store Description

**SolarStorm - Real-Time Space Weather & Aurora Forecasting**

Transform your device into a professional space weather monitoring station. SolarStorm delivers real-time geomagnetic activity data, aurora probability forecasts, and intelligent alerts to help you never miss an aurora opportunity.

**Key Features:**
• **Real-Time Kp Index**: Live geomagnetic activity with official NOAA color coding
• **Aurora Probability Map**: Interactive heatmap showing aurora visibility by location
• **Solar Wind Monitoring**: Track magnetic field strength (Bz), speed, and plasma density
• **Smart Notifications**: Customizable alerts with advanced Bz confirmation logic
• **Professional Charts**: 6-hour Kp trend sparklines with intelligent downsampling
• **Dark Theme**: Astronomy-friendly interface perfect for field use

**Premium Features:**
• Background monitoring with 15-minute updates
• Advanced alert logic combining Kp levels and solar wind conditions  
• Offline data caching for reliable access anywhere
• No ads, no tracking, no subscriptions

**Data Sources:**
All data sourced from NOAA's Space Weather Prediction Center - the gold standard for space weather monitoring used by aurora photographers and researchers worldwide.

Perfect for aurora photographers, astronomy enthusiasts, and anyone fascinated by space weather phenomena.

*Requires iOS 13.0+ or Android 7.0+*

---

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (Xcode) or Android Studio for development

### Installation

```bash
# Install dependencies
npm install

# Install Expo dependencies
npx expo install expo-linear-gradient expo-notifications expo-task-manager expo-background-task expo-location @react-native-async-storage/async-storage

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Data Sources

All data is sourced from the **NOAA Space Weather Prediction Center** (services.swpc.noaa.gov):

- **Planetary K-index** (1-minute): Real-time geomagnetic activity
- **Solar Wind Magnetic Field**: Bz component crucial for aurora forecasting
- **Solar Wind Plasma**: Speed and density measurements
- **OVATION Aurora Model**: Probabilistic aurora forecasts
- **Geomagnetic Alerts**: G1-G5 storm warnings

## Architecture

### Tech Stack

- **Framework**: React Native with Expo (managed workflow)
- **Language**: TypeScript
- **State Management**: Zustand with persistence
- **Validation**: Zod schemas for API data
- **HTTP**: Native fetch with retry logic
- **Storage**: AsyncStorage for caching and settings
- **Time**: Day.js for date/time handling
- **Graphics**: React Native Skia for aurora heatmaps and sparklines
- **Background**: Expo Background Task + Task Manager for alerts
- **Notifications**: Expo Notifications

### Project Structure

```
app/
  _layout.tsx           # Root navigation and theme
  index.tsx             # Main home screen
  modal-map.tsx         # Full-screen aurora map
  modal-settings.tsx    # Settings and preferences

components/
  KpTile.tsx           # Main Kp display with shimmer animation
  KpiCard.tsx          # Generic metric cards
  Sparkline.tsx        # Skia-based time series charts
  AuroraHeatmap.tsx    # Interactive aurora probability map
  AlertChip.tsx        # Geomagnetic storm notifications
  Section.tsx          # Layout component

lib/
  api/
    fetchJson.ts       # HTTP client with timeout/retry
    swpc.ts           # SWPC API integration
    parsers/          # Data parsing and validation
  state/
    useStore.ts       # Zustand store with selectors
    persist.ts        # AsyncStorage adapter
  util/
    colors.ts         # Design system and theme
    time.ts           # Date/time utilities
    math.ts           # Calculations and projections
    notifications.ts  # Push notification helpers
    background.ts     # Background fetch implementation
  viz/
    heatmap.ts        # Aurora visualization with Skia
    sparkline.ts      # Time series chart generation

tests/
  unit/               # Parser and utility tests
  integration/        # API and store tests
```

## Alert Logic

Background notifications trigger when:

1. **Kp Threshold**: Current Kp ≥ user setting (4, 5, or 6)
2. **Bz Confirmation** (optional): Sustained Bz ≤ -5 nT for ≥10 minutes
3. **Debounce**: No alert in past 90 minutes unless Kp increased

## Aurora Chance Algorithm

The app provides real-time aurora likelihood based on:

- **High chance** (mid-latitudes): Kp ≥ 5 AND Bz ≤ -5 AND speed ≥ 500 km/s
- **Possible** (higher latitudes): Kp ≥ 4 AND Bz ≤ -3
- **Low likelihood**: Other conditions

## Privacy & Data

- **No accounts required**: All data stored locally
- **No tracking**: No analytics or user behavior monitoring
- **Minimal permissions**: Only notifications and optional location
- **Open source data**: All space weather data from public NOAA APIs
- **Local caching**: Reduces API calls and improves performance

## Performance

- **Efficient rendering**: Skia-based graphics for smooth 60fps animations
- **Smart caching**: 5-15 minute TTLs based on data volatility
- **Background optimization**: Minimal battery impact with system-managed intervals
- **Responsive design**: Adapts to all screen sizes and orientations

## App Store Description

**Track space weather and aurora activity in real-time**

SolarStorm brings professional space weather monitoring to your pocket. Get instant access to live geomagnetic data, solar wind conditions, and aurora forecasts powered by NOAA's Space Weather Prediction Center.

**Key Features:**
• Real-time Kp index with official NOAA color coding
• Interactive aurora probability heatmap
• Smart notifications for geomagnetic storms
• Solar wind magnetic field and plasma monitoring
• Beautiful dark interface designed for stargazers
• Historical trends and sparkline charts
• Background alerts with customizable thresholds

**Perfect for:**
• Aurora photographers and chasers
• Amateur radio operators monitoring HF conditions
• Astronomy enthusiasts tracking space weather
• Anyone interested in Earth's magnetic field activity

**Data Sources:**
All information comes directly from NOAA's Space Weather Prediction Center, the same source used by professional forecasters worldwide.

No ads, no tracking, no accounts required. Your space weather data stays private and secure on your device.

*Requires iOS 13+ or Android 7+*

## License

Proprietary - All rights reserved

## Support

For questions, feedback, or support, contact: [support email to be added]

---

**Built with ❤️ for the space weather community**
