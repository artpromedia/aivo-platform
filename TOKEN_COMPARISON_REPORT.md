# Token Comparison Report (Web vs Flutter)

Date: 2026-01-31

## Scope

Compared web tokens in libs/ui-web/src/tokens.json to Flutter tokens in libs/flutter-common/lib/theme/aivo_brand.dart for:

- Primary colors for Explorer, Navigator, Scholar
- Semantic colors (success, warning/progress, info/focus, error)
- Neutral grayscale 50–950
- Background and surface colors
- Spacing scale space-0 to space-10
- Base and grade-specific border radius
- Touch target minimums

## Outcome

All scoped values are now aligned.

## Intentional Platform-Specific Differences

The following tokens exist on one platform only and are intentionally retained:

- Flutter-only tokens: coral/salmon palettes, gradient definitions, shadow presets, avatar/subject/session/anxiety color sets, convenience extensions.
- Web-only tokens not yet modeled in Flutter: gradeThemes.colorHighContrast, scholarDark theme, motion/elevation metadata, shadow definitions in base tokens.

If these should be synchronized as well, add equivalents in aivo_brand.dart and extend the validation test.
