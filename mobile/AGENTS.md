# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Design core (read before touching UI)

- **Look:** `src/theme/` is the only place colors, spacing, radii, type, shadows, durations, easing and haptics are decided.
  Import from `@/theme` (`colors`, `space`, `layout`, `radii`, `iconSize`, `textStyles`, `shadows`, `motion`). Plain `.ts`
  modules that run under `npm test` import `@/theme/colors` directly. `palette.ts` is private to `colors.ts`.
- **Controls:** build screens from `@/components/ui` (`Button`, `Field`, `Toggle`, `Tappable`, `SectionLabel`, `Card`,
  `ScreenTitle`, `Metric`, `Pill`). Never raw `Pressable`/`Switch`/`TextInput` in a screen.
- **New need:** add a role, step or text style to `src/theme/` (named for its job), or a component to `src/components/ui/`,
  then use it. Motion: add a preset to `src/theme/motion.ts` and a row to its interaction table.
- **Guardrails:** `npm test` runs `npm run lint:theme` (raw style values must stay at 0); `npm run lint` blocks raw
  controls, `expo-haptics`, palette imports and literal durations/easing outside the core.
