# Aivo Design System Overview

## Foundations

- **Tokens**: Shared JSON in `libs/design-tokens/aivo-tokens.json` for color, spacing, typography, motion, and accessibility flags (high contrast palettes, dyslexia-friendly font, reduced-motion durations).
- **Grade bands**: K–5, 6–8, 9–12 variants control palette, type scale, and spacing. Grade themes are consumed on web via CSS variables and on Flutter via `AivoGradeBand`.
- **Accessibility toggles**: High contrast swaps palette tokens; dyslexia toggles the font family; reduced motion picks shorter durations and gentler easing.

## Web implementation (`libs/ui-web`)

- **Theme plumbing**: `GradeThemeProvider` sets `data-grade-theme` on `<html>`; `AccessibilityProvider` sets `data-a11y-*` attributes (high contrast, dyslexia, reduced motion). Tailwind plugin reads these to emit CSS variables.
- **Components**: Buttons, Cards, Headings, Badges, etc., read CSS variables so grade/a11y changes live-update.
- **How to use**: Wrap app in providers, import components from `@aivo/ui-web`, and use `useGradeTheme`/`useAccessibility` hooks for controls. See `/design-system` page in `apps/web-district` for a live gallery.

## Flutter implementation

- **Theme**: `AivoGradeBand` + `themeForBand` in `flutter_common` produce per-band `ThemeData`.
- **Controller**: `gradeThemeControllerProvider` (Riverpod) drives the active band; use `setGradeBand` to switch.
- **A11y**: Dyslexia font toggle can wrap `ThemeData` with `GoogleFonts.atkinsonHyperlegibleTextTheme`; reduced motion should gate animations; high-contrast palettes to be added in future token sync.
- **Gallery**: `DesignSystemGalleryScreen` (apps/mobile-learner) demonstrates buttons/cards/chips per band, with a dyslexia toggle.

## Requesting changes

- **New tokens**: open a PR editing `libs/design-tokens/aivo-tokens.json` plus regeneration tasks if applicable; add rationale and accessibility impact.
- **New components**: file an issue with API proposal, states, responsive needs, and grade/a11y considerations; include Figma link if available.
- **Review checklist**: ensure contrast (including high contrast), motion respects reduced-motion flag, typography responds to dyslexia toggle, grade theme applied via providers.

## Building with the system

- **Web**: Use Tailwind tokens (`bg-background`, `text-text`, etc.) and components. Set grade/a11y data attributes via providers; for static docs, wrap pages in the same providers.
- **Mobile**: Use `gradeThemeControllerProvider` and `gradeThemeProvider`; prefer `Theme.of(context)` values. For animations, consult reduced-motion preference before playing.
- **Testing**: Add stories or gallery entries for new components; add goldens (Flutter) or Playwright/Chromatic captures (web) for critical states.
