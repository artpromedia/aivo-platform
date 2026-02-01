# AIVO Design Token Parity Report

**Last Updated:** January 31, 2026  
**Sprint:** Design Token Synchronization

## Overview

This document details the synchronization status between web design tokens (`libs/ui-web/src/tokens.json`) and Flutter design tokens (`libs/flutter-common/lib/theme/aivo_brand.dart`).

## Token Categories

### ✅ Colors - Full Parity

#### Primary Color Palettes

| Palette                   | Flutter                     | Web                  | Status         |
| ------------------------- | --------------------------- | -------------------- | -------------- |
| Purple (Explorer Primary) | `AivoBrand.primary[50-900]` | `base.color.purple`  | ✅ Exact match |
| Teal (Navigator Primary)  | `AivoBrand.teal[50-900]`    | `base.color.teal`    | ✅ Exact match |
| Navy (Scholar Primary)    | `AivoBrand.navy[50-900]`    | `base.color.navy`    | ✅ Exact match |
| Neutral/Gray              | `AivoBrand.gray[50-950]`    | `base.color.neutral` | ✅ Exact match |

#### Semantic Colors

| Color            | Flutter   | Web       | Status   |
| ---------------- | --------- | --------- | -------- |
| Success          | `#10B981` | `#10B981` | ✅ Match |
| Warning/Progress | `#F59E0B` | `#F59E0B` | ✅ Match |
| Error            | `#EF4444` | `#EF4444` | ✅ Match |
| Info/Focus       | `#3B82F6` | `#3B82F6` | ✅ Match |

#### Grade Theme Colors

| Theme              | Flutter             | Web                           | Status         |
| ------------------ | ------------------- | ----------------------------- | -------------- |
| Explorer (Pre-K–5) | All 22 color tokens | `gradeThemes.explorer.color`  | ✅ Exact match |
| Navigator (6-8)    | All 22 color tokens | `gradeThemes.navigator.color` | ✅ Exact match |
| Scholar (9-12)     | All 22 color tokens | `gradeThemes.scholar.color`   | ✅ Exact match |

### ✅ Spacing - Full Parity

| Token    | Flutter             | Web             | Value |
| -------- | ------------------- | --------------- | ----- |
| space-0  | `AivoBrand.space0`  | `base.space.0`  | 0px   |
| space-1  | `AivoBrand.space1`  | `base.space.1`  | 4px   |
| space-2  | `AivoBrand.space2`  | `base.space.2`  | 8px   |
| space-3  | `AivoBrand.space3`  | `base.space.3`  | 12px  |
| space-4  | `AivoBrand.space4`  | `base.space.4`  | 16px  |
| space-5  | `AivoBrand.space5`  | `base.space.5`  | 20px  |
| space-6  | `AivoBrand.space6`  | `base.space.6`  | 24px  |
| space-7  | `AivoBrand.space7`  | `base.space.7`  | 32px  |
| space-8  | `AivoBrand.space8`  | `base.space.8`  | 40px  |
| space-9  | `AivoBrand.space9`  | `base.space.9`  | 48px  |
| space-10 | `AivoBrand.space10` | `base.space.10` | 56px  |

### ✅ Border Radius - Full Parity

#### Base Radius Scale

| Token       | Flutter                | Web                | Value |
| ----------- | ---------------------- | ------------------ | ----- |
| radius-xs   | `AivoBrand.radiusXs`   | `base.radius.xs`   | 4px   |
| radius-sm   | `AivoBrand.radiusSm`   | `base.radius.sm`   | 8px   |
| radius-md   | `AivoBrand.radiusMd`   | `base.radius.md`   | 12px  |
| radius-lg   | `AivoBrand.radiusLg`   | `base.radius.lg`   | 16px  |
| radius-xl   | `AivoBrand.radiusXl`   | `base.radius.xl`   | 20px  |
| radius-pill | `AivoBrand.radiusPill` | `base.radius.pill` | 999px |

#### Grade-Specific Radius

| Grade Band    | Component | Flutter                 | Web                                   | Value |
| ------------- | --------- | ----------------------- | ------------------------------------- | ----- |
| **Explorer**  | Button    | `radiusExplorerButton`  | `gradeThemes.explorer.radius.button`  | 20px  |
|               | Card      | `radiusExplorerCard`    | `gradeThemes.explorer.radius.card`    | 20px  |
|               | Input     | `radiusExplorerInput`   | `gradeThemes.explorer.radius.input`   | 12px  |
|               | Modal     | `radiusExplorerModal`   | `gradeThemes.explorer.radius.modal`   | 24px  |
| **Navigator** | Button    | `radiusNavigatorButton` | `gradeThemes.navigator.radius.button` | 12px  |
|               | Card      | `radiusNavigatorCard`   | `gradeThemes.navigator.radius.card`   | 12px  |
|               | Input     | `radiusNavigatorInput`  | `gradeThemes.navigator.radius.input`  | 8px   |
|               | Modal     | `radiusNavigatorModal`  | `gradeThemes.navigator.radius.modal`  | 16px  |
| **Scholar**   | Button    | `radiusScholarButton`   | `gradeThemes.scholar.radius.button`   | 8px   |
|               | Card      | `radiusScholarCard`     | `gradeThemes.scholar.radius.card`     | 8px   |
|               | Input     | `radiusScholarInput`    | `gradeThemes.scholar.radius.input`    | 6px   |
|               | Modal     | `radiusScholarModal`    | `gradeThemes.scholar.radius.modal`    | 12px  |

### ✅ Touch Targets - Full Parity

| Grade Band         | Flutter                | Web                                     | Value |
| ------------------ | ---------------------- | --------------------------------------- | ----- |
| Explorer (Pre-K–5) | `touchTargetExplorer`  | `gradeThemes.explorer.touchTarget.min`  | 56px  |
| Navigator (6-8)    | `touchTargetNavigator` | `gradeThemes.navigator.touchTarget.min` | 48px  |
| Scholar (9-12)     | `touchTargetScholar`   | `gradeThemes.scholar.touchTarget.min`   | 44px  |

### ✅ Shadows - Full Parity

| Shadow Level | Flutter          | Web                    | Properties                                  |
| ------------ | ---------------- | ---------------------- | ------------------------------------------- |
| Soft         | `shadowSoft`     | `base.shadow.soft`     | color: rgba(26,26,46,0.08), y: 4, blur: 16  |
| Raised       | `shadowRaised`   | `base.shadow.raised`   | color: rgba(26,26,46,0.12), y: 8, blur: 24  |
| Elevated     | `shadowElevated` | `base.shadow.elevated` | color: rgba(26,26,46,0.16), y: 12, blur: 32 |

### ✅ Motion/Animation - Full Parity

| Duration     | Flutter               | Web                                | Value |
| ------------ | --------------------- | ---------------------------------- | ----- |
| Fast         | `durationFast`        | `base.motion.duration.fast`        | 150ms |
| Base         | `durationBase`        | `base.motion.duration.base`        | 250ms |
| Slow         | `durationSlow`        | `base.motion.duration.slow`        | 400ms |
| Reduced Fast | `durationReducedFast` | `base.motion.durationReduced.fast` | 0ms   |
| Reduced Base | `durationReducedBase` | `base.motion.durationReduced.base` | 0ms   |
| Reduced Slow | `durationReducedSlow` | `base.motion.durationReduced.slow` | 150ms |

### ✅ Typography - Full Parity

#### Font Configuration

| Property        | Flutter                 | Web                     | Status   |
| --------------- | ----------------------- | ----------------------- | -------- |
| Primary Font    | `Nunito`                | `Nunito`                | ✅ Match |
| Dyslexia Font   | `Atkinson Hyperlegible` | `Atkinson Hyperlegible` | ✅ Match |
| Weight Regular  | `w400`                  | `400`                   | ✅ Match |
| Weight Medium   | `w500`                  | `500`                   | ✅ Match |
| Weight Semibold | `w600`                  | `600`                   | ✅ Match |
| Weight Bold     | `w700`                  | `700`                   | ✅ Match |
| Weight Heading  | `w800`                  | `800`                   | ✅ Match |

#### Explorer (Pre-K–5) Typography

| Style    | Flutter                           | Web                                      | FontSize | LineHeight |
| -------- | --------------------------------- | ---------------------------------------- | -------- | ---------- |
| Display  | `explorerDisplaySize/LineHeight`  | `gradeThemes.explorer.fontSize.display`  | 42px     | 52px       |
| Headline | `explorerHeadlineSize/LineHeight` | `gradeThemes.explorer.fontSize.headline` | 34px     | 42px       |
| Title    | `explorerTitleSize/LineHeight`    | `gradeThemes.explorer.fontSize.title`    | 26px     | 34px       |
| Body     | `explorerBodySize/LineHeight`     | `gradeThemes.explorer.fontSize.body`     | 18px     | 28px       |
| Label    | `explorerLabelSize/LineHeight`    | `gradeThemes.explorer.fontSize.label`    | 16px     | 24px       |
| Caption  | `explorerCaptionSize/LineHeight`  | `gradeThemes.explorer.fontSize.caption`  | 14px     | 20px       |

#### Navigator (6-8) Typography

| Style    | Flutter                            | Web                                       | FontSize | LineHeight |
| -------- | ---------------------------------- | ----------------------------------------- | -------- | ---------- |
| Display  | `navigatorDisplaySize/LineHeight`  | `gradeThemes.navigator.fontSize.display`  | 36px     | 44px       |
| Headline | `navigatorHeadlineSize/LineHeight` | `gradeThemes.navigator.fontSize.headline` | 28px     | 36px       |
| Title    | `navigatorTitleSize/LineHeight`    | `gradeThemes.navigator.fontSize.title`    | 22px     | 30px       |
| Body     | `navigatorBodySize/LineHeight`     | `gradeThemes.navigator.fontSize.body`     | 16px     | 24px       |
| Label    | `navigatorLabelSize/LineHeight`    | `gradeThemes.navigator.fontSize.label`    | 14px     | 20px       |
| Caption  | `navigatorCaptionSize/LineHeight`  | `gradeThemes.navigator.fontSize.caption`  | 12px     | 18px       |

#### Scholar (9-12) Typography

| Style    | Flutter                          | Web                                     | FontSize | LineHeight |
| -------- | -------------------------------- | --------------------------------------- | -------- | ---------- |
| Display  | `scholarDisplaySize/LineHeight`  | `gradeThemes.scholar.fontSize.display`  | 32px     | 40px       |
| Headline | `scholarHeadlineSize/LineHeight` | `gradeThemes.scholar.fontSize.headline` | 24px     | 32px       |
| Title    | `scholarTitleSize/LineHeight`    | `gradeThemes.scholar.fontSize.title`    | 20px     | 28px       |
| Body     | `scholarBodySize/LineHeight`     | `gradeThemes.scholar.fontSize.body`     | 15px     | 24px       |
| Label    | `scholarLabelSize/LineHeight`    | `gradeThemes.scholar.fontSize.label`    | 13px     | 18px       |
| Caption  | `scholarCaptionSize/LineHeight`  | `gradeThemes.scholar.fontSize.caption`  | 11px     | 16px       |

#### Accessibility Typography Features

| Feature                 | Flutter Implementation       | Notes                                                        |
| ----------------------- | ---------------------------- | ------------------------------------------------------------ |
| Large Text Mode         | `largeTextScaleFactor = 1.2` | 1.2x scale multiplier                                        |
| Dyslexia Letter Spacing | `0.05em`                     | Calculated per font size                                     |
| Dyslexia Word Spacing   | `0.1em`                      | Calculated per font size                                     |
| Typography Mode Enum    | `AivoTypographyMode`         | standard, dyslexiaFriendly, largeText, dyslexiaFriendlyLarge |

## Intentional Platform-Specific Differences

### 1. Additional Flutter-Only Tokens

The following tokens exist in Flutter but not in web, providing platform-specific functionality:

| Token                | Purpose                                   | Rationale                                                       |
| -------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `avatarColors`       | List of colors for user avatar assignment | Flutter needs deterministic color assignment for cached avatars |
| `subjectColors`      | Map of academic subject to color          | Used for subject badges and progress indicators in mobile       |
| `sessionPhaseColors` | Map of session phases to colors           | Mobile-specific predictability feature                          |
| `anxietyColors`      | Gradient for anxiety level indicators     | SEL feature specific to mobile apps                             |

### 2. Legacy Aliases (Backwards Compatibility)

The following aliases are maintained in Flutter for backwards compatibility:

| Legacy Token     | Maps To          | Notes                                          |
| ---------------- | ---------------- | ---------------------------------------------- |
| `shadow`         | `shadowSoft`     | Legacy default shadow                          |
| `shadowMd`       | `shadowRaised`   | Legacy medium shadow                           |
| `shadowXl`       | `shadowElevated` | Legacy extra-large shadow                      |
| `durationNormal` | `durationBase`   | Legacy duration name                           |
| `coral`          | N/A              | Legacy CTA color, kept for existing components |
| `salmon`         | N/A              | Legacy accent color                            |

### 3. Typography System

Flutter uses `TextTheme` which maps to Material 3 text styles. The mapping to web tokens is:

| Material 3 Style | Web Token           | Notes                    |
| ---------------- | ------------------- | ------------------------ |
| `displayLarge`   | `fontSize.display`  | Used for hero text       |
| `headlineLarge`  | `fontSize.headline` | Used for section headers |
| `titleLarge`     | `fontSize.title`    | Used for card headers    |
| `bodyLarge`      | `fontSize.body`     | Used for paragraphs      |
| `labelLarge`     | `fontSize.label`    | Used for buttons/chips   |
| `labelSmall`     | `fontSize.caption`  | Used for captions        |

The `AivoTypographyMode` enum provides accessibility variants:

- `standard` - Nunito font with normal spacing
- `dyslexiaFriendly` - Atkinson Hyperlegible with 0.05em letter spacing
- `largeText` - 1.2x scale multiplier
- `dyslexiaFriendlyLarge` - Both accessibility features combined

### 4. Easing Curves

| Web Easing                     | Flutter Curve         | Notes            |
| ------------------------------ | --------------------- | ---------------- |
| `cubic-bezier(0.2, 0, 0, 1)`   | `Curves.easeInOut`    | Standard curve   |
| `cubic-bezier(0.3, 0, 0.2, 1)` | `Curves.easeOutCubic` | Emphasized curve |

## Validation

Token parity is continuously validated by the test suite:

```bash
cd libs/flutter-common
flutter test test/token_parity_test.dart
```

The test file validates:

- All color values (semantic, grade themes, palettes)
- All spacing values (space-0 through space-10)
- All radius values (base scale and grade-specific)
- All touch target minimums
- All shadow properties (color, offset, blur)
- All motion durations (standard and reduced)
- All typography values per grade band (fontSize, lineHeight)
- All font weights
- Accessibility settings (large text scale, dyslexia spacing)
- Button component variants and sizes
- Button grade-band touch targets
- Card component variants
- Card grade-band border radius
- Card shadow system

## Component Parity

### ✅ Button Component - Full Parity

The `AivoButton` component (`lib/ui/aivo_button.dart`) matches the web Button component (`libs/ui-web/src/components/ui/button.tsx`).

#### Variants

| Web Variant   | Flutter Variant | Style                                   |
| ------------- | --------------- | --------------------------------------- |
| `default`     | `primary`       | Filled, primary color                   |
| `secondary`   | `secondary`     | Filled tonal                            |
| `ghost`       | `ghost`         | Transparent bg, hover effect            |
| `outline`     | `outline`       | Border, transparent bg                  |
| `destructive` | `destructive`   | Red/error color                         |
| `link`        | N/A             | Flutter uses TextButton styling         |
| N/A           | `success`       | Green/success color (Flutter extension) |

Legacy aliases maintained for backwards compatibility:

- `outlined` → `outline`
- `text` → `ghost`
- `danger` → `destructive`

#### Sizes

| Web Size  | Flutter Size | Padding   | Min Height           |
| --------- | ------------ | --------- | -------------------- |
| `default` | `md`         | 10px 20px | touchTarget          |
| `sm`      | `sm`         | 8px 16px  | touchTarget          |
| `lg`      | `lg`         | 12px 24px | touchTarget + 4      |
| `icon`    | `icon`       | 0         | touchTarget (square) |

Legacy aliases:

- `small` → `sm`
- `medium` → `md`
- `large` → `lg`

#### Grade-Band Animations

| Grade Band         | Hover Scale | Press Scale | Duration |
| ------------------ | ----------- | ----------- | -------- |
| Explorer (Pre-K–5) | 1.05x       | 0.95x       | 250ms    |
| Navigator (6-8)    | 1.02x       | 0.98x       | 200ms    |
| Scholar (9-12)     | 1.01x       | 0.99x       | 150ms    |

#### States

| State    | Implementation                          |
| -------- | --------------------------------------- |
| Loading  | Circular spinner, color matches variant |
| Disabled | 50% opacity, no interactions            |
| Hover    | Scale animation per grade band          |
| Press    | Scale animation per grade band          |

#### Icon Button Factory

```dart
AivoButton.iconButton(
  icon: Icons.add,
  onPressed: () {},
  variant: AivoButtonVariant.ghost,
  gradeBand: AivoGradeBand.k5,
  tooltip: 'Add item',
)
```

### ✅ Card Component - Full Parity

The `AivoCard` component (`lib/ui/aivo_card.dart`) matches the web Card component (`libs/ui-web/src/components/ui/card.tsx`).

#### Variants

| Variant    | Background              | Shadow | Border             |
| ---------- | ----------------------- | ------ | ------------------ |
| `standard` | Surface                 | Soft   | None               |
| `elevated` | Surface                 | Raised | None               |
| `outlined` | Surface                 | None   | 1px outlineVariant |
| `filled`   | SurfaceContainerHighest | None   | None               |

#### Shadow System

| Level    | Y Offset | Blur | Color               |
| -------- | -------- | ---- | ------------------- |
| Soft     | 4px      | 16px | rgba(26,26,46,0.08) |
| Raised   | 8px      | 24px | rgba(26,26,46,0.12) |
| Elevated | 12px     | 32px | rgba(26,26,46,0.16) |

#### Grade-Band Border Radius

| Grade Band         | Card Radius |
| ------------------ | ----------- |
| Explorer (Pre-K–5) | 20px        |
| Navigator (6-8)    | 12px        |
| Scholar (9-12)     | 8px         |

#### Grade-Band Animations (Interactive Cards)

| Grade Band         | Hover Scale | Press Scale | Duration |
| ------------------ | ----------- | ----------- | -------- |
| Explorer (Pre-K–5) | 1.02x       | 0.98x       | 250ms    |
| Navigator (6-8)    | 1.01x       | 0.99x       | 200ms    |
| Scholar (9-12)     | 1.005x      | 0.995x      | 150ms    |

#### Sub-Components

| Component         | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `CardHeader`      | Header with leading, title, subtitle, trailing slots |
| `CardTitle`       | Title text widget                                    |
| `CardDescription` | Subtitle/description text widget                     |
| `CardContent`     | Main content area                                    |
| `CardFooter`      | Footer with action buttons                           |

#### Preset Cards

| Widget           | Purpose                              |
| ---------------- | ------------------------------------ |
| `AivoInfoCard`   | Info card with icon, title, subtitle |
| `AivoStatCard`   | Metric display with trend indicator  |
| `AivoActionCard` | Card with action button              |

#### Example Usage

```dart
AivoCard(
  variant: AivoCardVariant.standard,
  gradeBand: AivoGradeBand.k5,
  onTap: () => print('Tapped'),
  child: Column(
    children: [
      CardHeader(
        leading: Icon(Icons.star),
        title: CardTitle('Title'),
        subtitle: CardDescription('Subtitle'),
      ),
      CardContent(child: Text('Content')),
      CardFooter(child: TextButton(onPressed: () {}, child: Text('Action'))),
    ],
  ),
)
```

### Design Gallery Widgets

- `TypographyPreview` - Typography samples for each grade band
- `TypographyComparisonScreen` - Interactive typography comparison
- `ButtonPreview` - Button samples for each grade band
- `ButtonComparisonScreen` - Interactive button comparison
- `CardPreview` - Card samples for each grade band
- `CardComparisonScreen` - Interactive card comparison

## Maintenance Guidelines

1. **Always update both platforms**: When changing tokens, update both `tokens.json` and `aivo_brand.dart`
2. **Run validation tests**: After any token changes, run the parity tests
3. **Document intentional differences**: If a platform-specific token is needed, add it to this document
4. **Semantic naming**: Use the same token names across platforms where possible

## Change Log

| Date       | Change                                                                                    | Author   |
| ---------- | ----------------------------------------------------------------------------------------- | -------- |
| 2026-01-31 | Initial parity audit and synchronization                                                  | Sprint 1 |
| 2026-01-31 | Updated shadow tokens to use navy-based colors                                            | Sprint 1 |
| 2026-01-31 | Aligned motion duration tokens (base: 300→250ms, slow: 500→400ms)                         | Sprint 1 |
| 2026-01-31 | Added full typography system with grade-band specs                                        | Sprint 2 |
| 2026-01-31 | Implemented dyslexia-friendly typography (Atkinson Hyperlegible, 0.05em/0.1em spacing)    | Sprint 2 |
| 2026-01-31 | Added large text mode (1.2x scale multiplier)                                             | Sprint 2 |
| 2026-01-31 | Created TypographyPreview widget for design system gallery                                | Sprint 2 |
| 2026-01-31 | Implemented AivoButton with grade-band animations                                         | Sprint 3 |
| 2026-01-31 | Added button variants: primary, secondary, ghost, outline, destructive, success           | Sprint 3 |
| 2026-01-31 | Added button sizes: sm, md, lg, icon with grade-band touch targets                        | Sprint 3 |
| 2026-01-31 | Added grade-band specific hover/press scale animations                                    | Sprint 3 |
| 2026-01-31 | Added loading spinner and disabled states                                                 | Sprint 3 |
| 2026-01-31 | Created ButtonPreview widget for design system gallery                                    | Sprint 3 |
| 2026-01-31 | Implemented AivoCard with 4 variants: standard, elevated, outlined, filled                | Sprint 4 |
| 2026-01-31 | Added grade-band specific card border radius (Explorer 20px, Navigator 12px, Scholar 8px) | Sprint 4 |
| 2026-01-31 | Implemented interactive card mode with hover/press animations                             | Sprint 4 |
| 2026-01-31 | Added CardHeader, CardContent, CardFooter sub-components                                  | Sprint 4 |
| 2026-01-31 | Added CardTitle, CardDescription helper widgets                                           | Sprint 4 |
| 2026-01-31 | Created AivoActionCard preset with action slot                                            | Sprint 4 |
| 2026-01-31 | Created CardPreview widget for design system gallery                                      | Sprint 4 |
