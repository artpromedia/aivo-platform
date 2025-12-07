# Aivo Design Tokens

Source of truth for cross-platform UI tokens (web + Flutter). Grade bands: `K5`, `G6_8`, `G9_12`.

## Token map (top-level)
- `meta`: name, version, grade band labels
- `base` (platform-neutral primitives)
  - `color.neutral.*` (grays)
  - `font.family` (`default`, `dyslexia_friendly`)
  - `space.*`, `radius.*`, `shadow.*`, `elevation.*`, `motion.*`
- `gradeThemes.<band>` (per grade band palettes + type sizes)
  - `scale.font`, `scale.space`
  - `color`: background, surface, surfaceMuted, primary, secondary, accent, info, success, warning, error, border, focus, backdrop, textPrimary, textSecondary, textOnAccent
  - `fontSize.*`, `lineHeight.*`

## How to extend tokens
- Keep grade keys **exactly** `K5`, `G6_8`, `G9_12`.
- Add new roles under `base.color` or `gradeThemes.<band>.color`; keep roles in sync across all bands (no band-only one-offs).
- Typography: add sizes under `fontSize`/`lineHeight` for **all** bands when introducing new text styles.
- Spacing/radius/shadow/motion: add to `base`, then consume via CSS vars (web) or mapping in Dart (mobile). Avoid platform-only names.
- Accessibility: when adding contrast or motion variants, prefer data-attribute-driven overrides (e.g., `data-a11y-high-contrast`, `data-a11y-reduced-motion`).

## Integration notes (sketch)
- Web (Tailwind): flatten tokens to CSS vars, emit `:root` base vars, and per-band selectors like `[data-grade-theme="K5"] { --color-primary: ... }`. Extend Tailwind `colors` to point at the vars.
- Flutter: load JSON or generated Dart constants; build `ThemeData` for each band using the palette and typography sizes.

## Rationale (palette & scale)
- K–5: brighter primaries, warmer accents, larger type/space scale for younger learners.
- 6–8: balanced, approachable; slightly toned down; moderate scale.
- 9–12: calmer, more neutral; smallest scale; clearer hierarchy for older readers.
