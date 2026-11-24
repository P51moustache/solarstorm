# Style guardrail

Copied from the `theme-audit` skill (`~/.claude/skills/theme-audit/scripts/scan_styles.py` + `themelib/`).
`npm run lint:theme` runs it (and `npm test` calls that), failing when a raw color, size, font, radius or
shadow appears outside `src/theme/`. Fix a failure by naming a token from `@/theme` or a shared component
from `@/components/ui`; mark a real exception with a `theme-audit-ignore` comment and the reason.
