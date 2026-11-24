# Shipping SolarStorm to the App Store (via Expo EAS)

This is the end-to-end checklist. Steps marked **[you]** need your accounts/credentials —
I can't do them for you. Steps marked **[code]** are already done in this repo.

## 0. Prerequisites **[you]**
- An **Expo account** — https://expo.dev (free).
- An **Apple Developer Program** membership — https://developer.apple.com ($99/year). Required to ship to the App Store.
- Install the CLI: `npm i -g eas-cli` then `eas login`.

## 1. One-time project setup
```bash
cd mobile
eas init            # links this project to your Expo account (writes extra.eas.projectId)
```
- `eas.json` is already committed with `development`, `preview`, and `production` profiles. **[code]**
- `app.json` uses `ios.bundleIdentifier = com.zlceapps.solarstorm`, matching the existing App Store Connect record (app ID `6752530275`).

## 2. App icon & splash **[you]**
- Replace `assets/images/icon.png` with a 1024×1024 PNG (no transparency for iOS).
- Splash background is already set to the app's dark navy. A simple icon is the one real
  design asset still needed before submission.

## 3. Test push & in-app purchases on a real device (dev build)
Push notifications and RevenueCat **do not run in Expo Go** — you need a dev build:
```bash
eas build --profile development --platform ios   # [you] builds in the cloud, ~15 min
# install the resulting build on your iPhone, then:
npx expo start --dev-client
```

## 4. Production build + submit
```bash
eas build --profile production --platform ios     # [you]
eas submit --profile production --platform ios     # [you] uploads to App Store Connect
```
Then in **App Store Connect** **[you]**: app name, subtitle, description, keywords,
screenshots, age rating, and a **privacy policy URL** (required — the app uses location and
accounts), plus the App Privacy "data types" form (Location, Identifiers). Ship to TestFlight
first, then submit for review.

## 5. Point the app at your deployed backend **[you]**
Today the app reads NOAA directly. For production, deploy the Next.js app and set
`EXPO_PUBLIC_API_BASE_URL` (in `.env.local` / EAS env) to its URL so API keys stay server-side.
The data layer already supports this (`src/lib/spaceWeather.ts`).

## 6. Push notifications (after step 3 dev build) — remaining work
- Client: add `expo-notifications`, request permission, get the Expo push token. **[code: TODO]**
- Store the token per user (e.g. a Supabase `push_tokens` table). **[you: schema]**
- Backend job (cron) on the Next.js app: poll NOAA, and when a user's threshold is crossed,
  send via `expo-server-sdk`. EAS can manage the APNs key for you during build. **[code+you]**

## 7. Subscriptions / RevenueCat (after step 3 dev build)
- Create the subscription products in **App Store Connect**. **[you]**
- Create a RevenueCat app, add those products, copy the **public iOS API key** into
  `EXPO_PUBLIC_REVENUECAT_IOS_KEY`. **[you]**
- Map package identifiers to `plus_monthly` / `pro_monthly` (used in `src/app/paywall.tsx`). **[code done]**
- Add a RevenueCat → Supabase webhook to write `profiles.tier`. **[you: backend]**

The purchase/restore/entitlement client flow is already wired and guarded
(`src/lib/purchases.ts`); it activates automatically once a key is set in a dev/production build.

## 8. Analytics and crash reports (PostHog)
The code is in `src/lib/analytics.ts` (the only file that imports PostHog) and
`src/lib/analyticsConfig.ts` (event names and the privacy contract, tested). It sends nothing until
`EXPO_PUBLIC_POSTHOG_KEY` is set, and never from development builds.
- Create a PostHog project "SolarStorm" and turn on Error tracking → exception autocapture. **[you]**
- Put its project key (`phc_…`, public) in `eas.json` `production.env.EXPO_PUBLIC_POSTHOG_KEY`; add
  `EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com` only if the project is on the EU cloud. **[code once the key exists]**
- Native crash capture needs a new native build (`@posthog/react-native-plugin`); an OTA update cannot add it.

### App Store Connect → App Privacy (set before the first build with a key ships)
Add these data types, each **not linked to the user** and **not used for tracking** (no ATT prompt needed):

| Data type | Purposes |
| --- | --- |
| Usage Data → Product Interaction | Analytics |
| Diagnostics → Crash Data | App Functionality, Analytics |
| Diagnostics → Other Diagnostic Data | App Functionality, Analytics |
| Identifiers → Device ID (random install ID, not the IDFA) | Analytics |

Leave the existing Location answers as they are. The privacy page (`docs/privacy.html`) already describes this.
