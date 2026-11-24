# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Design core (read before touching UI)

- **Look:** `src/theme/` is the only place colors, spacing, radii, type, shadows, durations, easing and haptics are decided.
  Import from `@/theme` (`colors`, `space`, `layout`, `radii`, `iconSize`, `textStyles`, `shadows`, `motion`). Plain `.ts`
  modules that run under `npm test` import `@/theme/colors` directly. `palette.ts` is private to `colors.ts`.
- **Controls:** build screens from `@/components/ui` (`Button`, `Field`, `Toggle`, `Tappable`, `SectionLabel`, `Card`,
  `ScreenTitle`, `Metric`, `Pill`, `ListRow`, `ScoreRing`). Never raw `Pressable`/`Switch`/`TextInput` in a screen.
- **New need:** add a role, step or text style to `src/theme/` (named for its job), or a component to `src/components/ui/`,
  then use it. Motion: add a preset to `src/theme/motion.ts` and a row to its interaction table.
- **Guardrails:** `npm test` runs `npm run lint:theme` (raw style values must stay at 0); `npm run lint` blocks raw
  controls, `expo-haptics`, palette imports and literal durations/easing outside the core.

# Night-sky engine

- `src/lib/sky/` answers "when is the sky good tonight": `darkness` (Sun, Moon, twilight bounds; astronomy-engine),
  `weather` (Open-Meteo cloud layers, hourly), `skyScore` (0-100 per moment, factors and `limitedBy`), `bestWindow`,
  and `night` (`planNight`, `planNights`), which screens and alerts read. All pure except `getSkyWeather`; tests in
  `src/lib/sky/__tests__/`. Tune scoring only in `ScoreWeights`, not at call sites.

# Tonight (main tab)

- `src/app/(tabs)/index.tsx` renders `planTonight()` (`src/lib/sky/tonight.ts`: headline, hour strip, Moon, what's up,
  aurora glow) through `useTonight` and `useTonightPlaces`. Copy rules live in `headline.ts`; sky events are a
  registry in `src/lib/sky/events/` (add a kind = a new source file listed in `index.ts`, plus its tile in
  `components/tonight/WhatsUp.tsx`). Times use the place's clock (`offsetClock`), never `Date#getHours`.
- Horizon art is `components/tonight/HorizonScene.tsx`; its colors are `colors.night.*`. Spec:
  `research/concepts/tonight-spec.md`. The old Now dashboard is `(tabs)/aurora.tsx`, which opens Activity and Trends.

# Preview (where Zach looks at work)

- **http://localhost:8095**: Expo web dev server on branch `preview`, worktree `.claude/worktrees/preview/mobile`.
  Show work by merging your branch into `preview` there (never push it, never commit original work on it).
- Down? From that folder: `EXPO_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co EXPO_PUBLIC_SUPABASE_ANON_KEY=placeholder CI=1 BROWSER=none nohup npx expo start --web --port 8095 > /tmp/solarstorm-preview.log 2>&1 &`
- Native-only behaviour (haptics, blur, notifications) still needs the iOS simulator.
