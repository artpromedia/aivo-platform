# Flutter Common

Shared Flutter models, theming, and grade-band design system.

## Grade themes

- Enum: `AivoGradeBand` (`k5`, `g6_8`, `g9_12`).
- Themes: `themeForBand(...)` plus `aivoThemeK5`, `aivoThemeG6_8`, `aivoThemeG9_12` (Material 3).
- Riverpod: `gradeThemeControllerProvider` + `gradeThemeProvider` to switch themes at runtime.

### Mapping new bands / tokens

- Tokens come from `libs/design-tokens/aivo-tokens.json` (K–5, 6–8, 9–12).
- To add a band: extend `AivoGradeBand`, add colors/typography in `aivo_theme.dart`, and map it in `themeForBand` + controller.
- For codegen: a build step can read the JSON and emit Dart constants to avoid manual sync.
