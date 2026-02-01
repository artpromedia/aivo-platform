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

#### Scholar Dark Mode Colors (Sprint 10)

Dark mode is only available for the Scholar (G9-12) theme, matching web behavior exactly.

| Color Token     | Flutter                          | Web (scholarDark)           | Value                     |
| --------------- | -------------------------------- | --------------------------- | ------------------------- |
| Primary         | `_g9_12DarkColors.primary`       | `scholarDark.primary`       | `#A78BFA`                 |
| Secondary       | `_g9_12DarkColors.secondary`     | `scholarDark.secondary`     | `#757593`                 |
| Accent          | `_g9_12DarkColors.accent`        | `scholarDark.accent`        | `#7C3AED`                 |
| Background      | `_g9_12DarkColors.background`    | `scholarDark.background`    | `#09090B`                 |
| Surface         | `_g9_12DarkColors.surface`       | `scholarDark.surface`       | `#18181B`                 |
| Surface Muted   | `_g9_12DarkColors.surfaceMuted`  | `scholarDark.surfaceMuted`  | `#27272A`                 |
| Text Primary    | `_g9_12DarkColors.textPrimary`   | `scholarDark.textPrimary`   | `#FAFAFA`                 |
| Text Secondary  | `_g9_12DarkColors.textSecondary` | `scholarDark.textSecondary` | `#A1A1AA`                 |
| Text Muted      | `_g9_12DarkColors.textMuted`     | `scholarDark.textMuted`     | `#71717A`                 |
| Border          | `_g9_12DarkColors.border`        | `scholarDark.border`        | `#3F3F46`                 |
| Border Muted    | `_g9_12DarkColors.borderMuted`   | `scholarDark.borderMuted`   | `#27272A`                 |
| Error           | `_g9_12DarkColors.error`         | `scholarDark.error`         | `#F87171`                 |
| Success         | `_g9_12DarkColors.success`       | `scholarDark.success`       | `#34D399`                 |
| Warning         | `_g9_12DarkColors.warning`       | `scholarDark.warning`       | `#FBBF24`                 |
| Info            | `_g9_12DarkColors.info`          | `scholarDark.info`          | `#60A5FA`                 |
| Focus           | `_g9_12DarkColors.focus`         | `scholarDark.focus`         | `#60A5FA`                 |
| Focus Ring      | `_g9_12DarkColors.focusRing`     | `scholarDark.focusRing`     | `rgba(96, 165, 250, 0.5)` |
| Backdrop        | `_g9_12DarkColors.backdrop`      | `scholarDark.backdrop`      | `rgba(0, 0, 0, 0.6)`      |
| Text On Primary | `_g9_12DarkColors.textOnPrimary` | `scholarDark.textOnPrimary` | `#09090B`                 |
| Text On Accent  | `_g9_12DarkColors.textOnAccent`  | `scholarDark.textOnAccent`  | `#FFFFFF`                 |

##### Dark Mode Behavior

| Feature           | Flutter Implementation                        | Web Implementation                       |
| ----------------- | --------------------------------------------- | ---------------------------------------- |
| Availability      | Scholar (G9-12) only                          | Scholar (HS) only                        |
| System Preference | `platformDispatcher.platformBrightness`       | `matchMedia('prefers-color-scheme')`     |
| Persistence       | `SharedPreferences` with key `aivo:dark-mode` | `localStorage` with key `aivo:dark-mode` |
| Theme Transition  | `AnimatedTheme` with grade-band duration      | CSS transitions                          |

##### Dark Mode Theme Widgets

| Widget                     | Purpose                                               |
| -------------------------- | ----------------------------------------------------- |
| `AivoThemeTransition`      | AnimatedTheme wrapper with grade-band duration        |
| `AivoDarkModeToggle`       | Switch widget for dark mode (hidden when not Scholar) |
| `AivoDarkModeIconButton`   | Icon button variant of dark mode toggle               |
| `AivoThemeSelector`        | Dropdown for grade band selection                     |
| `AivoThemeSegmentedButton` | Segmented button for grade band selection             |
| `AivoThemePreviewCard`     | Theme preview card with color swatches                |
| `AivoBrightnessBuilder`    | Builder widget for light/dark variants                |
| `AivoSystemThemeListener`  | WidgetsBindingObserver for system brightness changes  |

##### Dark Mode Component Styling

| Component    | Light Mode               | Dark Mode                            |
| ------------ | ------------------------ | ------------------------------------ |
| Cards        | Shadows for elevation    | Subtle borders (`border: #3F3F46`)   |
| Buttons      | Standard colors          | Proper contrast with `textOnPrimary` |
| Input Fields | Light borders            | Visible borders (`border: #3F3F46`)  |
| Text         | Dark on light background | Light on dark background             |

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

The Flutter shadow system is implemented in `AivoShadows` utility class (`libs/flutter-common/lib/theme/aivo_shadows.dart`), providing centralized shadow management with exact parity to web tokens.

#### Base Shadow Levels

| Shadow Level | Flutter                | Web                    | Properties                                  |
| ------------ | ---------------------- | ---------------------- | ------------------------------------------- |
| Soft         | `AivoShadows.soft`     | `base.shadow.soft`     | color: rgba(26,26,46,0.08), y: 4, blur: 16  |
| Raised       | `AivoShadows.raised`   | `base.shadow.raised`   | color: rgba(26,26,46,0.12), y: 8, blur: 24  |
| Elevated     | `AivoShadows.elevated` | `base.shadow.elevated` | color: rgba(26,26,46,0.16), y: 12, blur: 32 |

#### Hover Shadow States

| Hover Level    | Flutter                     | Properties                                  |
| -------------- | --------------------------- | ------------------------------------------- |
| Soft Hover     | `AivoShadows.softHover`     | color: rgba(26,26,46,0.12), y: 6, blur: 20  |
| Raised Hover   | `AivoShadows.raisedHover`   | color: rgba(26,26,46,0.16), y: 12, blur: 28 |
| Elevated Hover | `AivoShadows.elevatedHover` | color: rgba(26,26,46,0.20), y: 16, blur: 36 |

#### Dark Mode Shadows

| Shadow Level  | Flutter                    | Properties                               |
| ------------- | -------------------------- | ---------------------------------------- |
| Soft Dark     | `AivoShadows.softDark`     | color: rgba(0,0,0,0.20), y: 4, blur: 16  |
| Raised Dark   | `AivoShadows.raisedDark`   | color: rgba(0,0,0,0.30), y: 8, blur: 24  |
| Elevated Dark | `AivoShadows.elevatedDark` | color: rgba(0,0,0,0.40), y: 12, blur: 32 |

#### Grade-Band Card Shadows

| Grade Band    | Shadow          | Flutter                            | Web Reference                              | Properties                                     |
| ------------- | --------------- | ---------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| **Explorer**  | Card            | `AivoShadows.cardExplorer`         | `gradeThemes.explorer.cardShadow`          | color: rgba(255,107,107,0.20), y: 8, blur: 32  |
|               | Card Hover      | `AivoShadows.cardExplorerHover`    | `gradeThemes.explorer.cardShadowHover`     | color: rgba(255,107,107,0.30), y: 12, blur: 40 |
| **Navigator** | Card            | `AivoShadows.cardNavigator`        | `gradeThemes.navigator.cardShadow`         | color: rgba(8,145,178,0.12), y: 4, blur: 16    |
|               | Card Hover      | `AivoShadows.cardNavigatorHover`   | `gradeThemes.navigator.cardShadowHover`    | color: rgba(8,145,178,0.18), y: 8, blur: 24    |
| **Scholar**   | Card            | `AivoShadows.cardScholar`          | `gradeThemes.scholar.cardShadow`           | color: rgba(26,26,46,0.08), y: 2, blur: 8      |
|               | Card Hover      | `AivoShadows.cardScholarHover`     | `gradeThemes.scholar.cardShadowHover`      | color: rgba(26,26,46,0.12), y: 4, blur: 12     |
|               | Card Dark       | `AivoShadows.cardScholarDark`      | `gradeThemes.scholar.dark.cardShadow`      | color: rgba(0,0,0,0.30), y: 2, blur: 8         |
|               | Card Dark Hover | `AivoShadows.cardScholarDarkHover` | `gradeThemes.scholar.dark.cardShadowHover` | color: rgba(0,0,0,0.40), y: 4, blur: 12        |

#### Colored Shadows (Semantic)

| Color   | Flutter               | Properties                                    |
| ------- | --------------------- | --------------------------------------------- |
| Primary | `AivoShadows.primary` | color: rgba(139,92,246,0.30), y: 4, blur: 16  |
| Coral   | `AivoShadows.coral`   | color: rgba(255,107,107,0.30), y: 4, blur: 16 |
| Teal    | `AivoShadows.teal`    | color: rgba(8,145,178,0.30), y: 4, blur: 16   |
| Success | `AivoShadows.success` | color: rgba(16,185,129,0.30), y: 4, blur: 16  |
| Error   | `AivoShadows.error`   | color: rgba(239,68,68,0.30), y: 4, blur: 16   |
| Warning | `AivoShadows.warning` | color: rgba(245,158,11,0.30), y: 4, blur: 16  |
| Info    | `AivoShadows.info`    | color: rgba(59,130,246,0.30), y: 4, blur: 16  |

#### Special Effects

| Effect      | Flutter                        | Usage                                            |
| ----------- | ------------------------------ | ------------------------------------------------ |
| Focus Ring  | `AivoShadows.focusRing(color)` | Accessibility focus indicator (0 spread, 3 blur) |
| Glow        | `AivoShadows.glow(color)`      | Animated glow effect (0 spread, 20 blur)         |
| Inset       | `AivoShadows.inset`            | Inner shadow for pressed/active states           |
| Inset Input | `AivoShadows.insetInput`       | Subtle inner shadow for input fields             |

#### Helper Methods

| Method                          | Description                                                       |
| ------------------------------- | ----------------------------------------------------------------- |
| `cardForGradeBand(band)`        | Returns appropriate card shadow for grade band                    |
| `cardHoverForGradeBand(band)`   | Returns hover card shadow for grade band                          |
| `forElevation(level)`           | Returns shadow for elevation level (1=soft, 2=raised, 3=elevated) |
| `withOpacity(shadows, opacity)` | Adjusts opacity of existing shadows                               |
| `lerp(a, b, t)`                 | Interpolates between two shadow lists for animations              |

#### Usage Examples

```dart
// Basic elevation shadows
Container(
  decoration: BoxDecoration(
    boxShadow: AivoShadows.soft,  // or raised, elevated
  ),
);

// Grade-band aware card shadows
Container(
  decoration: BoxDecoration(
    boxShadow: AivoShadows.cardForGradeBand(gradeBand),
  ),
);

// Animated hover effect
AnimatedContainer(
  decoration: BoxDecoration(
    boxShadow: isHovered
      ? AivoShadows.raisedHover
      : AivoShadows.raised,
  ),
);

// Shadow interpolation for smooth transitions
BoxShadow.lerpList(
  AivoShadows.soft,
  AivoShadows.softHover,
  animationValue,
);
```

### ✅ Motion/Animation System - Full Parity

The Flutter animation system is implemented in `AivoMotion` utility class (`libs/flutter-common/lib/theme/aivo_motion.dart`), providing centralized motion management with exact parity to web tokens.

#### Base Duration Tokens

| Duration     | Flutter               | Web                                | Value |
| ------------ | --------------------- | ---------------------------------- | ----- |
| Fast         | `durationFast`        | `base.motion.duration.fast`        | 150ms |
| Base         | `durationBase`        | `base.motion.duration.base`        | 250ms |
| Slow         | `durationSlow`        | `base.motion.duration.slow`        | 400ms |
| Reduced Fast | `durationReducedFast` | `base.motion.durationReduced.fast` | 0ms   |
| Reduced Base | `durationReducedBase` | `base.motion.durationReduced.base` | 0ms   |
| Reduced Slow | `durationReducedSlow` | `base.motion.durationReduced.slow` | 150ms |

#### Grade-Band Duration Tokens

| Grade Band    | Speed | Flutter                             | Web Reference                                  | Value |
| ------------- | ----- | ----------------------------------- | ---------------------------------------------- | ----- |
| **Explorer**  | Fast  | `AivoDurationConfig.explorer.fast`  | `gradeThemes.explorer.animation.durationFast`  | 150ms |
|               | Base  | `AivoDurationConfig.explorer.base`  | `gradeThemes.explorer.animation.duration`      | 250ms |
|               | Slow  | `AivoDurationConfig.explorer.slow`  | `gradeThemes.explorer.animation.durationSlow`  | 400ms |
| **Navigator** | Fast  | `AivoDurationConfig.navigator.fast` | `gradeThemes.navigator.animation.durationFast` | 120ms |
|               | Base  | `AivoDurationConfig.navigator.base` | `gradeThemes.navigator.animation.duration`     | 200ms |
|               | Slow  | `AivoDurationConfig.navigator.slow` | `gradeThemes.navigator.animation.durationSlow` | 320ms |
| **Scholar**   | Fast  | `AivoDurationConfig.scholar.fast`   | `gradeThemes.scholar.animation.durationFast`   | 100ms |
|               | Base  | `AivoDurationConfig.scholar.base`   | `gradeThemes.scholar.animation.duration`       | 150ms |
|               | Slow  | `AivoDurationConfig.scholar.slow`   | `gradeThemes.scholar.animation.durationSlow`   | 250ms |

#### Easing Curves

| Curve            | Flutter                      | Web Cubic-Bezier                         | Description                            |
| ---------------- | ---------------------------- | ---------------------------------------- | -------------------------------------- |
| Standard         | `AivoCurves.standard`        | `cubic-bezier(0.2, 0, 0, 1)`             | Material decelerate, most transitions  |
| Emphasized       | `AivoCurves.emphasized`      | `cubic-bezier(0.3, 0, 0.2, 1)`           | Emphasized decelerate                  |
| Bounce Explorer  | `AivoCurves.bounceExplorer`  | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Playful overshoot for younger learners |
| Bounce Navigator | `AivoCurves.bounceNavigator` | `cubic-bezier(0.34, 1.2, 0.64, 1)`       | Subtle bounce                          |
| Bounce Scholar   | `AivoCurves.bounceScholar`   | `cubic-bezier(0.34, 1.1, 0.64, 1)`       | Minimal bounce                         |
| Linear           | `AivoCurves.linear`          | `linear`                                 | Reduced motion mode                    |

#### Scale Configurations (Hover/Press)

| Grade Band    | State | Flutter                           | Web Reference                                | Value |
| ------------- | ----- | --------------------------------- | -------------------------------------------- | ----- |
| **Explorer**  | Hover | `AivoScaleConfig.explorer.hover`  | `gradeThemes.explorer.animation.hoverScale`  | 1.05  |
|               | Press | `AivoScaleConfig.explorer.press`  | `gradeThemes.explorer.animation.pressScale`  | 0.95  |
| **Navigator** | Hover | `AivoScaleConfig.navigator.hover` | `gradeThemes.navigator.animation.hoverScale` | 1.02  |
|               | Press | `AivoScaleConfig.navigator.press` | `gradeThemes.navigator.animation.pressScale` | 0.98  |
| **Scholar**   | Hover | `AivoScaleConfig.scholar.hover`   | `gradeThemes.scholar.animation.hoverScale`   | 1.01  |
|               | Press | `AivoScaleConfig.scholar.press`   | `gradeThemes.scholar.animation.pressScale`   | 0.99  |

#### Reduced Motion Support

The motion system respects accessibility settings for reduced motion:

| Utility                                | Description                             |
| -------------------------------------- | --------------------------------------- |
| `AivoReducedMotion.isEnabled(context)` | Checks `MediaQuery.disableAnimations`   |
| `AivoDurationConfig.reduced`           | Zero-duration config for reduced motion |
| `context.aivoReducedMotion`            | Context extension for easy access       |

#### Animation Wrapper Widgets

| Widget                 | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `AivoAnimatedScale`    | Grade-band aware scale animations (hover/press) |
| `AivoAnimatedOpacity`  | Grade-band aware fade animations                |
| `AivoAnimatedSlide`    | Grade-band aware slide/translate animations     |
| `AivoAnimatedPresence` | Combined scale + opacity for enter/exit         |

#### Page Transitions

| Component                    | Purpose                                          |
| ---------------------------- | ------------------------------------------------ |
| `AivoPageTransitionsBuilder` | Grade-band specific page route transitions       |
| `aivoPageTransitionsTheme()` | Factory for PageTransitionsTheme with AIVO style |

#### Helper Methods

| Method                                  | Description                              |
| --------------------------------------- | ---------------------------------------- |
| `AivoDurationConfig.forGradeBand(band)` | Returns duration config for grade band   |
| `AivoScaleConfig.forGradeBand(band)`    | Returns scale config for grade band      |
| `AivoCurves.bounceForGradeBand(band)`   | Returns appropriate bounce curve         |
| `AivoMotion.durationFor(context)`       | Gets duration considering reduced motion |
| `AivoMotion.bounceFor(gradeBand)`       | Gets bounce curve for grade band         |

#### Usage Examples

```dart
// Using centralized duration configs
final config = AivoDurationConfig.forGradeBand(AivoGradeBand.k5);
_animationController = AnimationController(
  vsync: this,
  duration: config.base,  // 250ms for Explorer
);

// Grade-band aware scale animation
AivoAnimatedScale(
  scale: _isPressed ? 0.95 : 1.0,
  gradeBand: AivoGradeBand.k5,  // Uses bouncy Explorer curve
  child: MyWidget(),
)

// Using bounce curves directly
CurvedAnimation(
  parent: _controller,
  curve: AivoCurves.bounceForGradeBand(gradeBand),
)

// Checking reduced motion
if (context.aivoReducedMotion) {
  // Skip or simplify animation
  return child;
}

// Page transitions with grade-band awareness
MaterialApp(
  theme: ThemeData(
    pageTransitionsTheme: aivoPageTransitionsTheme(
      gradeBand: AivoGradeBand.k5,
    ),
  ),
)
```

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
- `FormPreview` - Form component samples for each grade band
- `FormComparisonScreen` - Interactive form components comparison
- `NavigationPreview` - Navigation component samples for each grade band

### ✅ Form Components - Full Parity (Sprint 5)

Form components match the web form styling from `libs/ui-web/src/components/ui/input.tsx`, `select.tsx`, `switch.tsx`, and `apps/web-teacher/src/components/ui/checkbox.tsx`.

#### AivoTextField

Matches web `input.tsx` component styling.

##### Variants

| Variant      | Description                  | Border             | Background   |
| ------------ | ---------------------------- | ------------------ | ------------ |
| `outlined`   | Default with border          | 1px outlineVariant | Surface      |
| `filled`     | Filled background, no border | None               | SurfaceMuted |
| `underlined` | Bottom border only           | Bottom 1px         | Transparent  |

##### Sizes

| Size | Height       | Padding     | Font Size |
| ---- | ------------ | ----------- | --------- |
| `sm` | 36px         | 12px / 8px  | 14px      |
| `md` | Touch target | 16px / 12px | 16px      |
| `lg` | 52px         | 16px / 16px | 16px      |

##### Features

- Leading/trailing icon support
- Helper text with secondary color
- Error text with error color
- Disabled state (50% opacity)
- Focus states with primary color ring
- Multiline via `AivoTextArea` variant

##### Grade-Band Input Radius

| Grade Band         | Input Radius |
| ------------------ | ------------ |
| Explorer (Pre-K–5) | 12px         |
| Navigator (6-8)    | 8px          |
| Scholar (9-12)     | 6px          |

#### AivoSelect

Matches web `select.tsx` context-based dropdown pattern.

##### Features

- Dropdown overlay with grade-band radius
- Search/filter functionality (optional)
- Custom item builder support
- Leading icon support
- Error/helper text support
- Disabled state

##### Dropdown Styling

| Property      | Value                         |
| ------------- | ----------------------------- |
| Max Height    | 300px                         |
| Item Height   | 48px                          |
| Border        | 1px outlineVariant            |
| Shadow        | Soft shadow                   |
| Border Radius | Grade-band input radius + 4px |

#### AivoSwitch

Matches web `switch.tsx` component (h-6 w-11 = 24x44px).

##### Sizes

| Size | Track Size | Thumb Size |
| ---- | ---------- | ---------- |
| `sm` | 36x20      | 16x16      |
| `md` | 44x24      | 20x20      |
| `lg` | 52x28      | 24x24      |

##### Animation Per Grade Band

| Grade Band         | Duration | Curve       |
| ------------------ | -------- | ----------- |
| Explorer (Pre-K–5) | 250ms    | easeOutBack |
| Navigator (6-8)    | 200ms    | easeInOut   |
| Scholar (9-12)     | 150ms    | easeOut     |

##### Features

- Label support (start or end position)
- Subtitle text support
- Disabled state
- `AivoSwitchTile` for list context

#### AivoCheckbox

Matches web `checkbox.tsx` pattern (h-4 w-4 = 16x16px).

##### Sizes

| Size | Box Size | Check Icon |
| ---- | -------- | ---------- |
| `sm` | 16x16    | 12px       |
| `md` | 20x20    | 16px       |
| `lg` | 24x24    | 20px       |

##### States

| State           | Visual                     |
| --------------- | -------------------------- |
| `unchecked`     | Empty box with border      |
| `checked`       | Filled box with checkmark  |
| `indeterminate` | Filled box with minus/dash |

##### Grade-Band Border Radius

| Grade Band         | Checkbox Radius |
| ------------------ | --------------- |
| Explorer (Pre-K–5) | 6px             |
| Navigator (6-8)    | 4px             |
| Scholar (9-12)     | 3px             |

##### Animation Per Grade Band

Same as AivoSwitch - more playful for younger users, subtle for older.

##### Features

- Tristate support (null = indeterminate)
- Label support with tappable area
- Subtitle text support
- Error state styling
- `AivoCheckboxTile` for list context
- `AivoCheckboxGroup` for grouped selections

#### Focus States (All Form Components)

| Property          | Value         |
| ----------------- | ------------- |
| Focus Ring Width  | 2px           |
| Focus Ring Color  | theme.primary |
| Focus Ring Offset | 2px           |
| Transition        | 150ms ease    |

### ✅ Navigation Components - Full Parity (Sprint 6)

Navigation components match the web navigation patterns from `libs/ui-web/src/components/layout/header.tsx`, `sidebar.tsx`, and `libs/ui-web/src/components/ui/tabs.tsx`.

#### AivoAppBar

Matches web `header.tsx` component (h-16 = 64px, px-6 = 24px padding, border-b).

##### Variants

| Variant       | Background  | Shadow | Border |
| ------------- | ----------- | ------ | ------ |
| `standard`    | Surface     | None   | Bottom |
| `primary`     | Primary     | None   | None   |
| `transparent` | Transparent | None   | None   |
| `elevated`    | Surface     | Soft   | None   |

##### Dimensions

| Property       | Value      |
| -------------- | ---------- |
| Height         | 64px       |
| Horizontal pad | 24px       |
| Title font     | titleLarge |
| Action spacing | 8px        |

##### Sub-Components

| Component          | Purpose                                |
| ------------------ | -------------------------------------- |
| `AivoBackButton`   | Standard back navigation button        |
| `AivoAppBarAction` | Action button with grade-band sizing   |
| `AivoSliverAppBar` | Scrolling app bar for CustomScrollView |
| `AivoSearchAppBar` | App bar with integrated search field   |

##### Grade-Band Action Button Size

| Grade Band         | Touch Target | Icon Size |
| ------------------ | ------------ | --------- |
| Explorer (Pre-K–5) | 48px         | 28px      |
| Navigator (6-8)    | 44px         | 24px      |
| Scholar (9-12)     | 40px         | 22px      |

#### AivoBottomNavBar

Matches Material 3 bottom navigation with web-inspired styling.

##### Variants

| Variant    | Background | Shadow | Style          |
| ---------- | ---------- | ------ | -------------- |
| `standard` | Surface    | None   | Standard M3    |
| `elevated` | Surface    | Soft   | Elevated bar   |
| `tinted`   | Primary    | None   | Primary tinted |

##### Grade-Band Heights

| Grade Band         | Bar Height | Icon Size | Label Size |
| ------------------ | ---------- | --------- | ---------- |
| Explorer (Pre-K–5) | 80px       | 28px      | 14px       |
| Navigator (6-8)    | 72px       | 26px      | 13px       |
| Scholar (9-12)     | 64px       | 24px      | 12px       |

##### Features

- Badge support with count display
- Active/inactive state colors
- Label visibility modes (always, selected, never)
- `AivoFloatingBottomNav` variant with rounded corners

#### AivoDrawer

Matches web `sidebar.tsx` component (w-64 = 256px, py-2 px-3 = 8px/12px item padding).

##### Dimensions

| Property        | Value |
| --------------- | ----- |
| Full Width      | 280px |
| Mini Width      | 72px  |
| Logo Height     | 64px  |
| Section Padding | 12px  |
| Item Radius     | 8px   |

##### Grade-Band Item Sizing

| Grade Band         | Item Height | Icon Size | Padding |
| ------------------ | ----------- | --------- | ------- |
| Explorer (Pre-K–5) | 52px        | 24px      | 16px    |
| Navigator (6-8)    | 44px        | 22px      | 12px    |
| Scholar (9-12)     | 40px        | 20px      | 12px    |

##### Sub-Components

| Component           | Purpose                              |
| ------------------- | ------------------------------------ |
| `AivoDrawerItem`    | Navigation item with badge support   |
| `AivoDrawerProfile` | User profile section with avatar     |
| `AivoDrawerSection` | Grouped section with optional header |
| `AivoMiniDrawer`    | Collapsed drawer (72px width)        |

##### Active State Styling

| State    | Background              | Text Color |
| -------- | ----------------------- | ---------- |
| Active   | Primary (0.1 opacity)   | Primary    |
| Inactive | Transparent             | onSurface  |
| Hover    | surfaceContainerHighest | onSurface  |

#### AivoTabBar

Matches web `tabs.tsx` component (TabsList h-10 rounded-md, TabsTrigger px-3 py-1.5).

##### Variants

| Variant     | Style                           | Height |
| ----------- | ------------------------------- | ------ |
| `underline` | Underline indicator             | 48px   |
| `filled`    | Filled/pill style (matches web) | 40px   |
| `segmented` | Segment control style           | 40px   |

##### Web Alignment

| Web Property        | Flutter Equivalent | Value |
| ------------------- | ------------------ | ----- |
| TabsList h-10       | Container height   | 40px  |
| TabsList rounded-md | BorderRadius       | 8px   |
| TabsList bg-muted   | Background color   | muted |
| TabsList p-1        | Padding            | 4px   |
| TabsTrigger px-3    | Horizontal padding | 12px  |
| TabsTrigger py-1.5  | Vertical padding   | 6px   |
| rounded-sm          | Tab item radius    | 6px   |

##### Sub-Components

| Component              | Purpose                              |
| ---------------------- | ------------------------------------ |
| `AivoTabItem`          | Tab item with optional badge         |
| `AivoTabBarView`       | TabBarView with grade-band animation |
| `AivoScrollableTabBar` | Horizontal scrollable tabs           |
| `AivoFilterChips`      | Filter chip row (choice chips)       |

##### Badge Styling

| Property | Value              |
| -------- | ------------------ |
| Size     | 18px (min)         |
| Radius   | 999px (pill)       |
| Color    | Primary (selected) |
| Font     | 10px               |

#### Page Transitions

Grade-band aware page transition system.

##### Transition Types

| Type                   | Animation                       |
| ---------------------- | ------------------------------- |
| `fade`                 | Opacity fade                    |
| `slideRight`           | Slide from right (standard nav) |
| `slideUp`              | Slide from bottom (modals)      |
| `scale`                | Scale with fade                 |
| `sharedAxisHorizontal` | Shared axis horizontal (tabs)   |
| `sharedAxisVertical`   | Shared axis vertical            |
| `none`                 | No animation                    |

##### Grade-Band Duration & Curves

| Grade Band         | Duration | Forward Curve | Reverse Curve |
| ------------------ | -------- | ------------- | ------------- |
| Explorer (Pre-K–5) | 350ms    | easeOutBack   | easeInBack    |
| Navigator (6-8)    | 300ms    | easeOutCubic  | easeInCubic   |
| Scholar (9-12)     | 250ms    | easeOut       | easeIn        |

##### Transition Classes

| Class                  | Purpose                             |
| ---------------------- | ----------------------------------- |
| `AivoPageRoute`        | Custom PageRouteBuilder             |
| `AivoModalRoute`       | Modal/bottom sheet style route      |
| `AivoAnimatedSwitcher` | In-page content transitions         |
| `AivoHero`             | Hero transitions with grade styling |

##### Navigator Extension

```dart
// Easy navigation with Aivo transitions
Navigator.of(context).pushAivo(
  NextPage(),
  transition: AivoTransitionType.slideRight,
  gradeBand: AivoGradeBand.k5,
);

// Modal navigation
Navigator.of(context).pushModalAivo(
  ModalPage(),
  gradeBand: AivoGradeBand.g6_8,
);
```

##### MaterialApp Integration

```dart
MaterialApp(
  theme: ThemeData(
    pageTransitionsTheme: aivoPageTransitionsTheme(
      gradeBand: AivoGradeBand.k5,
    ),
  ),
);
```

### ✅ Feedback Components - Full Parity (Sprint 7)

Feedback components for user notifications, loading states, and empty states.

#### AivoDialog

Matches web `dialog.tsx` component (bg-black/50 backdrop, max-w-lg, p-6, shadow-lg, sm:rounded-lg).

##### Dialog Sizes

| Size         | Width | Usage                    |
| ------------ | ----- | ------------------------ |
| `small`      | 300px | Simple confirmations     |
| `medium`     | 480px | Standard dialogs         |
| `large`      | 640px | Forms, complex content   |
| `fullscreen` | 100%  | Mobile/immersive content |

##### Grade-Band Modal Radius

| Grade Band         | Radius |
| ------------------ | ------ |
| Explorer (Pre-K–5) | 24px   |
| Navigator (6-8)    | 16px   |
| Scholar (9-12)     | 12px   |

##### Animation

| Property | Value                   |
| -------- | ----------------------- |
| Type     | Fade + Scale (from 95%) |
| Duration | Grade-band aware        |
| Backdrop | black @ 50% opacity     |
| Curve    | easeOutCubic            |

##### Sub-Components

| Component           | Purpose                                |
| ------------------- | -------------------------------------- |
| `AivoDialog`        | Base dialog with header/content/footer |
| `AivoConfirmDialog` | Two-button confirmation dialog         |
| `AivoAlertDialog`   | Single-button alert (4 variants)       |
| `AivoBottomSheet`   | Modal bottom sheet with drag handle    |

##### Alert Variants

| Variant   | Icon                   | Color |
| --------- | ---------------------- | ----- |
| `info`    | info_outline           | Blue  |
| `success` | check_circle_outline   | Green |
| `warning` | warning_amber_outlined | Amber |
| `error`   | error_outline          | Red   |

#### AivoSnackbar/Toast

Matches web `toast.tsx` component (4 types, fixed bottom-4 right-4, 5 second auto-remove).

##### Variants

| Variant   | Background     | Icon                   |
| --------- | -------------- | ---------------------- |
| `neutral` | inverseSurface | info_outline           |
| `success` | success (95%)  | check_circle_outline   |
| `warning` | warning (95%)  | warning_amber_outlined |
| `error`   | error (95%)    | error_outline          |
| `info`    | info (95%)     | info_outline           |

##### Positioning

| Position      | Alignment               |
| ------------- | ----------------------- |
| `bottom`      | Bottom center (default) |
| `top`         | Top center              |
| `bottomLeft`  | Bottom left             |
| `bottomRight` | Bottom right            |
| `topLeft`     | Top left                |
| `topRight`    | Top right               |

##### Animation

| Property | Value                      |
| -------- | -------------------------- |
| Type     | Slide (from bottom or top) |
| Duration | 250ms                      |
| Curve    | easeOutCubic               |

##### Features

- Auto-dismiss (default 4 seconds)
- Action button support
- Close button option
- Title + message layout
- ScaffoldMessenger integration (`AivoSnackbar`)
- Overlay toast system (`AivoToastController`)

#### Loading States

Matches web `loading-states.tsx` component (Spinner h-4/h-6/h-10, LoadingOverlay, Skeleton).

##### Spinner Sizes

| Size     | Dimension | Stroke Width | Web Equivalent |
| -------- | --------- | ------------ | -------------- |
| `small`  | 16px      | 2.0          | h-4            |
| `medium` | 24px      | 2.5          | h-6            |
| `large`  | 40px      | 3.0          | h-10           |

##### Loading Overlay

| Property  | Value            |
| --------- | ---------------- |
| Backdrop  | black @ 50%      |
| Container | Surface, rounded |
| Shadow    | 10px blur, 4px y |
| Branding  | Optional icon    |

##### Skeleton Animation

| Property | Value            |
| -------- | ---------------- |
| Type     | Pulse (opacity)  |
| Duration | 1500ms           |
| Curve    | easeInOut        |
| Opacity  | 0.3 ↔ 0.7 × 0.15 |

##### Skeleton Presets

| Preset                 | Description                 |
| ---------------------- | --------------------------- |
| `AivoSkeleton`         | Generic rectangle           |
| `AivoSkeleton.circle`  | Circular avatar placeholder |
| `AivoSkeleton.text`    | Text line placeholder       |
| `AivoCardSkeleton`     | Card with image/title/desc  |
| `AivoListItemSkeleton` | List item with avatar       |

##### Progress Indicators

| Type                   | Features                  |
| ---------------------- | ------------------------- |
| `AivoLinearProgress`   | Determinate/indeterminate |
| `AivoCircularProgress` | With percentage display   |

#### AivoAlertBanner

Matches web `alert.tsx` component (rounded-lg border p-4, variants).

##### Variants

| Variant   | Background    | Border        | Icon Color |
| --------- | ------------- | ------------- | ---------- |
| `info`    | info @ 10%    | info @ 30%    | info       |
| `success` | success @ 10% | success @ 30% | success    |
| `warning` | warning @ 10% | warning @ 30% | warning    |
| `error`   | error @ 10%   | error @ 30%   | error      |

##### Sub-Components

| Component              | Purpose                         |
| ---------------------- | ------------------------------- |
| `AivoAlertBanner`      | Full alert with icon/title/desc |
| `AivoInlineAlert`      | Compact single-line alert       |
| `AivoDismissibleAlert` | Animated dismissible alert      |

##### Features

- Optional description text
- Action widget slot
- Dismissible with animation
- Auto-dismiss option

#### AivoEmptyState

Matches web `EmptyState` component (py-12 text-center, icon 4xl/6xl).

##### Layout

| Property   | Value                 |
| ---------- | --------------------- |
| Max Width  | 400px                 |
| Vertical   | py-48 (py-24 compact) |
| Horizontal | px-24                 |
| Text Align | Center                |

##### Icon Sizes

| Grade Band         | Icon Size |
| ------------------ | --------- |
| Explorer (Pre-K–5) | 64px      |
| Navigator (6-8)    | 56px      |
| Scholar (9-12)     | 48px      |

##### Preset Factories

| Factory      | Icon                  | Default Title          |
| ------------ | --------------------- | ---------------------- |
| `noData`     | inbox_outlined        | "No data"              |
| `noResults`  | search_off_outlined   | "No results found"     |
| `error`      | error_outline         | "Something went wrong" |
| `offline`    | wifi_off_outlined     | "You're offline"       |
| `comingSoon` | construction_outlined | "Coming soon"          |

##### Sub-Components

| Component              | Purpose                 |
| ---------------------- | ----------------------- |
| `AivoEmptyState`       | Full empty state        |
| `AivoInlineEmptyState` | Compact inline message  |
| `AivoPlaceholder`      | Development placeholder |

### ✅ Accessibility Features - Full Parity (Sprint 11)

Comprehensive accessibility system matching web `AccessibilityProvider` with high contrast, dyslexia-friendly, large text, and reduced motion support.

#### Accessibility State Management

| Feature          | Flutter Provider                  | Web Provider            | Storage Key              |
| ---------------- | --------------------------------- | ----------------------- | ------------------------ |
| State Controller | `accessibilityControllerProvider` | `AccessibilityProvider` | `aivo:a11y-preferences`  |
| High Contrast    | `highContrastProvider`            | `highContrast` state    | Persisted in preferences |
| Dyslexia Font    | `dyslexiaFontProvider`            | `dyslexia` state        | Persisted in preferences |
| Reduced Motion   | `reducedMotionProvider`           | `reducedMotion` state   | Persisted in preferences |
| Large Text       | `largeTextProvider`               | (CSS scale)             | Persisted in preferences |
| Text Scale       | `textScaleProvider`               | (CSS scale)             | Persisted in preferences |

#### High Contrast Mode

| Feature            | Flutter Implementation               | Web Implementation       | Value                  |
| ------------------ | ------------------------------------ | ------------------------ | ---------------------- |
| Border Multiplier  | `kHighContrastBorderMultiplier`      | CSS border-width doubled | 2.0x                   |
| Focus Ring Width   | `HighContrastUtils.focusRing()`      | Focus ring width         | 3px (vs 2px normal)    |
| Shadow Enhancement | `HighContrastUtils.enhancedShadow()` | Box-shadow enhancement   | 1.5x blur, 1.2x offset |

##### Grade-Band High Contrast Colors

| Grade Band | Token          | Flutter                               | Web (tokens.json)                            | Value     |
| ---------- | -------------- | ------------------------------------- | -------------------------------------------- | --------- |
| Explorer   | Primary        | `ExplorerHighContrastColors.primary`  | `gradeThemes.explorer.highContrast.primary`  | `#5B21B6` |
|            | Border         | `ExplorerHighContrastColors.border`   | `gradeThemes.explorer.highContrast.border`   | `#5B21B6` |
|            | Focus          | `ExplorerHighContrastColors.focus`    | `gradeThemes.explorer.highContrast.focus`    | `#1D4ED8` |
| Navigator  | Primary        | `NavigatorHighContrastColors.primary` | `gradeThemes.navigator.highContrast.primary` | `#0E7490` |
|            | Border         | `NavigatorHighContrastColors.border`  | `gradeThemes.navigator.highContrast.border`  | `#0E7490` |
|            | Focus          | `NavigatorHighContrastColors.focus`   | `gradeThemes.navigator.highContrast.focus`   | `#1D4ED8` |
| Scholar    | Primary        | `ScholarHighContrastColors.primary`   | `gradeThemes.scholar.highContrast.primary`   | `#09090B` |
|            | Border         | `ScholarHighContrastColors.border`    | `gradeThemes.scholar.highContrast.border`    | `#09090B` |
|            | Focus          | `ScholarHighContrastColors.focus`     | `gradeThemes.scholar.highContrast.focus`     | `#1D4ED8` |
| All        | Background     | `*HighContrastColors.background`      | `*.highContrast.background`                  | `#FFFFFF` |
| All        | Text Primary   | `*HighContrastColors.textPrimary`     | `*.highContrast.textPrimary`                 | `#09090B` |
| All        | Text Secondary | `*HighContrastColors.textSecondary`   | `*.highContrast.textSecondary`               | `#27272A` |

#### Dyslexia-Friendly Mode

| Feature        | Flutter Constant/Method        | Web Token             | Value                 |
| -------------- | ------------------------------ | --------------------- | --------------------- |
| Font Family    | `AivoBrand.fontFamilyDyslexia` | `fontFamilyDyslexia`  | Atkinson Hyperlegible |
| Letter Spacing | `kDyslexiaLetterSpacing`       | `0.05em`              | 0.05em equivalent     |
| Word Spacing   | `kDyslexiaWordSpacing`         | `0.1em`               | 0.1em equivalent      |
| Line Height    | `AivoDyslexiaText`             | Increased line-height | 1.6x (configurable)   |

##### Dyslexia Text Widget

| Property        | Default      | Description                |
| --------------- | ------------ | -------------------------- |
| `text`          | Required     | Text content to display    |
| `style`         | bodyMedium   | Base text style to enhance |
| `letterSpacing` | 0.05em equiv | Character spacing          |
| `wordSpacing`   | 0.1em equiv  | Word spacing               |
| `lineHeight`    | 1.6          | Line height multiplier     |

#### Large Text Mode

| Feature      | Flutter Constant  | Web Implementation  | Value |
| ------------ | ----------------- | ------------------- | ----- |
| Scale Factor | `kLargeTextScale` | CSS transform scale | 1.2x  |
| Min Scale    | `kMinTextScale`   | -                   | 0.8x  |
| Max Scale    | `kMaxTextScale`   | -                   | 2.0x  |

##### Text Scale Adjustment

| Widget                     | Purpose                                   |
| -------------------------- | ----------------------------------------- |
| `AivoTextScaleSlider`      | Slider for adjusting text scale (0.8-2.0) |
| `AivoAccessibilityWrapper` | MediaQuery wrapper applying text scale    |

#### Reduced Motion Mode

| Feature            | Flutter Implementation                                  | Web Implementation                     |
| ------------------ | ------------------------------------------------------- | -------------------------------------- |
| System Detection   | `platformDispatcher.accessibilityFeatures.reduceMotion` | `matchMedia('prefers-reduced-motion')` |
| Persisted Override | `SharedPreferences` toggle                              | `localStorage` toggle                  |
| Animation Disable  | `AivoMotionSafeContainer`                               | CSS `animation: none`                  |

##### Motion-Safe Widgets

| Widget                    | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| `AivoMotionSafeContainer` | Respects reduced motion for container animations |
| `AivoMotionSafeFade`      | Fade animation that respects reduced motion      |
| `AivoMotionSafeScale`     | Scale animation that respects reduced motion     |

#### Accessibility Settings UI

| Widget                           | Purpose                                    |
| -------------------------------- | ------------------------------------------ |
| `AivoAccessibilityToggle`        | Settings tile with icon, title, switch     |
| `AivoAccessibilityChip`          | Compact chip toggle                        |
| `AivoAccessibilityQuickToggles`  | Row of all toggle chips                    |
| `AivoAccessibilitySettingsPanel` | Complete settings panel with sections      |
| `AivoAccessibilityBadge`         | Status badge showing enabled feature count |

#### High Contrast Helpers

| Widget/Method                          | Purpose                                |
| -------------------------------------- | -------------------------------------- |
| `AivoHighContrastBorder`               | Border widget respecting high contrast |
| `HighContrastUtils.getContrastRatio()` | Calculate WCAG contrast ratio          |
| `HighContrastUtils.meetsWCAGAA()`      | Check if colors meet WCAG AA (4.5:1)   |
| `HighContrastUtils.meetsWCAGAAA()`     | Check if colors meet WCAG AAA (7:1)    |
| `buildHighContrastTheme()`             | Build high contrast theme variant      |

#### Semantic Widgets

All accessibility widgets include proper `Semantics` labels:

| Widget                    | Semantics                  |
| ------------------------- | -------------------------- |
| `AivoAccessibilityToggle` | `toggled`, `label`, `hint` |
| `AivoAccessibilityChip`   | `selected`, `label`        |
| `AivoHighContrastBorder`  | Container semantics        |
| All motion-safe widgets   | Child semantics preserved  |

#### System Preference Sync

| Platform Feature   | Flutter Detection                         | Web Detection            |
| ------------------ | ----------------------------------------- | ------------------------ |
| Reduce Motion      | `accessibilityFeatures.reduceMotion`      | `prefers-reduced-motion` |
| Disable Animations | `accessibilityFeatures.disableAnimations` | `prefers-reduced-motion` |
| High Contrast      | `accessibilityFeatures.highContrast`      | `prefers-contrast`       |
| Bold Text          | `accessibilityFeatures.boldText`          | -                        |

##### System Observer

| Component                        | Purpose                                   |
| -------------------------------- | ----------------------------------------- |
| `AivoAccessibilityObserver`      | WidgetsBindingObserver for system changes |
| `_updateFromSystemPreferences()` | Sync system settings with app state       |

#### Files Created

| File                            | Purpose                                |
| ------------------------------- | -------------------------------------- |
| `accessibility_controller.dart` | State management with persistence      |
| `accessibility_widgets.dart`    | UI components for settings             |
| `high_contrast_theme.dart`      | High contrast colors and theme builder |
| `accessibility_preview.dart`    | Interactive preview for design system  |

### ✅ Icon & Illustration System - Full Parity (Sprint 12)

Comprehensive icon and illustration system matching web `lucide-react` with consistent sizing, colors, and grade-band adaptations.

#### Icon Library Alignment

| Feature          | Flutter                    | Web               | Status         |
| ---------------- | -------------------------- | ----------------- | -------------- |
| Icon Package     | `lucide_icons: ^0.257.0`   | `lucide-react`    | ✅ Exact match |
| Icon Names       | `AivoIcons.home`, etc.     | `<Home />`, etc.  | ✅ Mapped      |
| Icon Consistency | All apps use same icon set | All apps use same | ✅ Unified     |

#### Icon Sizing Standards

| Size | Value | Use Case                      |
| ---- | ----- | ----------------------------- |
| xs   | 12px  | Inline indicators             |
| sm   | 16px  | Badges, compact UI            |
| md   | 20px  | Default, buttons (default)    |
| lg   | 24px  | Navigation, prominent actions |
| xl   | 32px  | Feature highlights            |
| xxl  | 40px  | Empty states                  |
| xxxl | 48px  | Hero icons                    |

##### Grade Band Scaling

| Grade Band      | Scale Factor | 24px Base Result |
| --------------- | ------------ | ---------------- |
| K-5 (Explorer)  | 1.15 (+15%)  | 27.6px           |
| 6-8 (Navigator) | 1.05 (+5%)   | 25.2px           |
| 9-12 (Scholar)  | 1.0 (base)   | 24px             |

#### Icon Color Variants

| Variant   | Light Mode                     | Dark Mode                      |
| --------- | ------------------------------ | ------------------------------ |
| primary   | `theme.colorScheme.primary`    | `theme.colorScheme.primary`    |
| secondary | `colorScheme.secondary`        | `colorScheme.secondary`        |
| muted     | `colorScheme.onSurfaceVariant` | `colorScheme.onSurfaceVariant` |
| inverse   | `colorScheme.onPrimary`        | `colorScheme.onPrimary`        |
| success   | `AivoBrand.success`            | `AivoBrand.success`            |
| warning   | `AivoBrand.warning`            | `AivoBrand.warning`            |
| error     | `colorScheme.error`            | `colorScheme.error`            |
| info      | `AivoBrand.info`               | `AivoBrand.info`               |
| accent    | `AivoBrand.accent`             | `AivoBrand.accent`             |
| disabled  | `colorScheme.onSurface.38%`    | `colorScheme.onSurface.38%`    |

#### Icon Button Standards

| Component                | Touch Target | Icon Size | Padding |
| ------------------------ | ------------ | --------- | ------- |
| `AivoIconButton.sm`      | 32x32px      | 16px      | 8px     |
| `AivoIconButton.md`      | 40x40px      | 20px      | 10px    |
| `AivoIconButton.lg`      | 48x48px      | 24px      | 12px    |
| `AivoFilledIconButton`   | 48x48px      | 24px      | 12px    |
| `AivoOutlinedIconButton` | 48x48px      | 24px      | 12px    |

##### Focus States

| Property       | Value                                   |
| -------------- | --------------------------------------- |
| Focus Ring     | 2px width, primary color, 50% opacity   |
| Ring Offset    | 2px from button edge                    |
| Tab Navigation | Full keyboard support with visible ring |

#### Icon Mappings (AivoIcons)

Common icons mapped to Lucide equivalents:

| Category      | Icons                                                    |
| ------------- | -------------------------------------------------------- |
| Navigation    | home, menu, back, forward, chevron*, close, more*        |
| Actions       | search, filter, sort, add, edit, delete, save, share     |
| Status        | check, checkCircle, error, warning, info, help, loading  |
| User          | user, users, userPlus, profile, graduationCap            |
| Communication | bell, bellOff, mail, message, messageSquare, phone       |
| Media         | file, fileText, folder, image, music, play, pause        |
| Education     | book, bookOpen, library, school, award, trophy, star     |
| Progress      | brain, lightbulb, puzzle, trendingUp, barChart, activity |
| Gamification  | coins, gem, flame, zap, rocket, sparkles, crown, medal   |
| Interface     | eye, eyeOff, lock, unlock, bookmark, heart, thumbs\*     |
| Device        | smartphone, tablet, monitor, wifi, wifiOff, globe        |
| AI            | bot, cpu, wand, magic                                    |

#### Illustration System

##### Illustration Sizes

| Size | Value | Use Case                     |
| ---- | ----- | ---------------------------- |
| sm   | 80px  | Inline/compact illustrations |
| md   | 120px | Standard empty states        |
| lg   | 180px | Prominent illustrations      |
| xl   | 240px | Full-page states             |
| hero | 320px | Hero/onboarding              |

##### Preset Illustrations

| Preset        | Icon Used    | Use Case                |
| ------------- | ------------ | ----------------------- |
| `emptyInbox`  | inbox        | Empty message/inbox     |
| `noResults`   | searchX      | Search with no results  |
| `error`       | alertCircle  | Error states            |
| `offline`     | wifiOff      | Offline/connectivity    |
| `success`     | checkCircle2 | Success confirmations   |
| `emptyList`   | list         | Empty lists/tables      |
| `learning`    | bookOpen     | Learning-related states |
| `achievement` | trophy       | Achievement/rewards     |
| `welcome`     | sparkles     | Welcome/onboarding      |

##### Grade Band Illustration Styles

| Grade Band | Style Characteristics                          |
| ---------- | ---------------------------------------------- |
| K-5        | Larger decorations, more playful, extra shapes |
| 6-8        | Medium decorations, balanced style             |
| 9-12       | Subtle decorations, professional look          |

#### Files Created

| File                      | Purpose                                      |
| ------------------------- | -------------------------------------------- |
| `aivo_icons.dart`         | Icon sizes, colors, buttons, common mappings |
| `aivo_illustrations.dart` | SVG and icon-based illustration system       |
| `icon_preview.dart`       | Interactive preview for design system        |

## Maintenance Guidelines

1. **Always update both platforms**: When changing tokens, update both `tokens.json` and `aivo_brand.dart`
2. **Run validation tests**: After any token changes, run the parity tests
3. **Document intentional differences**: If a platform-specific token is needed, add it to this document
4. **Semantic naming**: Use the same token names across platforms where possible

## Change Log

| Date       | Change                                                                                      | Author    |
| ---------- | ------------------------------------------------------------------------------------------- | --------- | --- | ---------- | --------------------------------------------------------------------------------- | -------- |
| 2026-01-31 | Initial parity audit and synchronization                                                    | Sprint 1  |
| 2026-01-31 | Updated shadow tokens to use navy-based colors                                              | Sprint 1  |
| 2026-01-31 | Aligned motion duration tokens (base: 300→250ms, slow: 500→400ms)                           | Sprint 1  |
| 2026-01-31 | Added full typography system with grade-band specs                                          | Sprint 2  |
| 2026-01-31 | Implemented dyslexia-friendly typography (Atkinson Hyperlegible, 0.05em/0.1em spacing)      | Sprint 2  |
| 2026-01-31 | Added large text mode (1.2x scale multiplier)                                               | Sprint 2  |
| 2026-01-31 | Created TypographyPreview widget for design system gallery                                  | Sprint 2  |
| 2026-01-31 | Implemented AivoButton with grade-band animations                                           | Sprint 3  |
| 2026-01-31 | Added button variants: primary, secondary, ghost, outline, destructive, success             | Sprint 3  |
| 2026-01-31 | Added button sizes: sm, md, lg, icon with grade-band touch targets                          | Sprint 3  |
| 2026-01-31 | Added grade-band specific hover/press scale animations                                      | Sprint 3  |
| 2026-01-31 | Added loading spinner and disabled states                                                   | Sprint 3  |
| 2026-01-31 | Created ButtonPreview widget for design system gallery                                      | Sprint 3  |
| 2026-01-31 | Implemented AivoCard with 4 variants: standard, elevated, outlined, filled                  | Sprint 4  |
| 2026-01-31 | Added grade-band specific card border radius (Explorer 20px, Navigator 12px, Scholar 8px)   | Sprint 4  |
| 2026-01-31 | Implemented interactive card mode with hover/press animations                               | Sprint 4  |
| 2026-01-31 | Added CardHeader, CardContent, CardFooter sub-components                                    | Sprint 4  |
| 2026-01-31 | Added CardTitle, CardDescription helper widgets                                             | Sprint 4  |
| 2026-01-31 | Created AivoActionCard preset with action slot                                              | Sprint 4  |
| 2026-01-31 | Created CardPreview widget for design system gallery                                        | Sprint 4  |
| 2026-01-31 | Implemented AivoTextField with 3 variants: outlined, filled, underlined                     | Sprint 5  |
| 2026-01-31 | Added AivoTextArea for multiline text input                                                 | Sprint 5  |
| 2026-01-31 | Implemented AivoSelect dropdown with search/filter, grade-band radius                       | Sprint 5  |
| 2026-01-31 | Implemented AivoSwitch with track/thumb styling, grade-band animations                      | Sprint 5  |
| 2026-01-31 | Added AivoSwitchTile for list context                                                       | Sprint 5  |
| 2026-01-31 | Implemented AivoCheckbox with tristate, grade-band border radius                            | Sprint 5  |
| 2026-01-31 | Added AivoCheckboxTile and AivoCheckboxGroup for list and grouped selections                | Sprint 5  |
| 2026-01-31 | Implemented consistent focus states across all form components (2px ring, 2px offset)       | Sprint 5  |
| 2026-01-31 | Created FormPreview widget for design system gallery                                        | Sprint 5  |
| 2026-01-31 | Implemented AivoAppBar with 4 variants: standard, primary, transparent, elevated            | Sprint 6  |
| 2026-01-31 | Added AivoBackButton, AivoAppBarAction, AivoSliverAppBar, AivoSearchAppBar                  | Sprint 6  |
| 2026-01-31 | Implemented AivoBottomNavBar with 3 variants: standard, elevated, tinted                    | Sprint 6  |
| 2026-01-31 | Added AivoFloatingBottomNav for floating bottom navigation pattern                          | Sprint 6  |
| 2026-01-31 | Implemented AivoDrawer matching web sidebar (280px width, sections, profile)                | Sprint 6  |
| 2026-01-31 | Added AivoMiniDrawer (72px width) for collapsed state                                       | Sprint 6  |
| 2026-01-31 | Implemented AivoTabBar with 3 variants: underline, filled, segmented                        | Sprint 6  |
| 2026-01-31 | Added AivoScrollableTabBar with fade edges, AivoFilterChips for filter patterns             | Sprint 6  |
| 2026-01-31 | Implemented page transitions: AivoPageRoute, AivoModalRoute with grade-band durations       | Sprint 6  |
| 2026-01-31 | Added AivoAnimatedSwitcher, AivoHero for consistent in-page transitions                     | Sprint 6  |
| 2026-01-31 | Created NavigationPreview widget for design system gallery                                  | Sprint 6  |
| 2026-01-31 | Implemented AivoDialog with grade-band modal radius, backdrop, fade+scale animation         | Sprint 7  |
| 2026-01-31 | Added AivoConfirmDialog, AivoAlertDialog (4 variants), AivoBottomSheet                      | Sprint 7  |
| 2026-01-31 | Implemented AivoSnackbar/Toast with 5 variants and slide animations                         | Sprint 7  |
| 2026-01-31 | Added AivoToastController for overlay toasts independent of ScaffoldMessenger               | Sprint 7  |
| 2026-01-31 | Implemented AivoSpinner (3 sizes), AivoLoadingOverlay, AivoFullPageLoading                  | Sprint 7  |
| 2026-01-31 | Added AivoSkeleton, AivoCardSkeleton, AivoListItemSkeleton matching web patterns            | Sprint 7  |
| 2026-01-31 | Implemented AivoLinearProgress, AivoCircularProgress with percentage display                | Sprint 7  |
| 2026-01-31 | Implemented AivoAlertBanner with 4 variants: info, success, warning, error                  | Sprint 7  |
| 2026-01-31 | Added AivoInlineAlert for compact alerts, AivoDismissibleAlert with animation               | Sprint 7  |
| 2026-01-31 | Implemented AivoEmptyState with preset factories (noData, noResults, error, offline)        | Sprint 7  |
| 2026-01-31 | Added AivoInlineEmptyState, AivoPlaceholder for development placeholders                    | Sprint 7  |
| 2026-01-31 | Created FeedbackPreview widget for design system gallery                                    | Sprint 7  |     | 2026-01-31 | Implemented comprehensive animation utilities matching web easing/duration tokens | Sprint 9 |
| 2026-01-31 | Added AivoPageTransition with slide, fade, scale, and modal variants                        | Sprint 9  |
| 2026-01-31 | Implemented micro-interactions: AivoAnimatedIcon, AivoPressEffect, AivoShakeEffect          | Sprint 9  |
| 2026-01-31 | Added stagger animation helpers: AivoStaggeredList, StaggeredAnimationController            | Sprint 9  |
| 2026-01-31 | Created AnimationPreview widget for design system gallery                                   | Sprint 9  |
| 2026-01-31 | Aligned dark mode palette with web scholarDark tokens (colors, borders, semantic colors)    | Sprint 10 |
| 2026-01-31 | Ensured dark mode only available for Scholar theme (G9-12) matching web behavior            | Sprint 10 |
| 2026-01-31 | Updated dark theme components: cards with borders, buttons with contrast, visible inputs    | Sprint 10 |
| 2026-01-31 | Implemented system preference detection and persistence (SharedPreferences)                 | Sprint 10 |
| 2026-01-31 | Added AivoThemeTransition for smooth animated color transitions                             | Sprint 10 |
| 2026-01-31 | Created theme widgets: AivoDarkModeToggle, AivoThemeSelector, AivoThemePreviewCard          | Sprint 10 |
| 2026-01-31 | Created DarkModePreview widget for design system gallery                                    | Sprint 10 |
| 2026-01-31 | Implemented AivoAccessibilityController with state persistence (SharedPreferences)          | Sprint 11 |
| 2026-01-31 | Added high contrast mode with 2x border multiplier, grade-band colors                       | Sprint 11 |
| 2026-01-31 | Implemented dyslexia-friendly mode (Atkinson Hyperlegible, 0.05em/0.1em spacing)            | Sprint 11 |
| 2026-01-31 | Added large text mode with 1.2x scale multiplier, AivoTextScaleSlider                       | Sprint 11 |
| 2026-01-31 | Implemented reduced motion mode with system preference detection                            | Sprint 11 |
| 2026-01-31 | Added motion-safe widgets: AivoMotionSafeContainer, AivoMotionSafeFade, AivoMotionSafeScale | Sprint 11 |
| 2026-01-31 | Created accessibility settings UI: toggles, chips, quick toggles, settings panel            | Sprint 11 |
| 2026-01-31 | Implemented HighContrastUtils with WCAG contrast ratio calculation                          | Sprint 11 |
| 2026-01-31 | Added AivoAccessibilityObserver for system preference synchronization                       | Sprint 11 |
| 2026-01-31 | Created AccessibilityPreview widget for design system gallery                               | Sprint 11 |
| 2026-01-31 | Audited web icon usage: all apps use lucide-react consistently                              | Sprint 12 |
| 2026-01-31 | Added lucide_icons package for Flutter matching web lucide-react                            | Sprint 12 |
| 2026-01-31 | Implemented AivoIconSize with xs/sm/md/lg/xl/xxl/xxxl sizes and grade-band scaling          | Sprint 12 |
| 2026-01-31 | Created AivoIconVariant enum for semantic icon colors (primary, secondary, muted, etc.)     | Sprint 12 |
| 2026-01-31 | Implemented AivoIcon widget with size, variant, and grade-band support                      | Sprint 12 |
| 2026-01-31 | Added AivoIconButton variants: standard, filled, outlined with touch targets                | Sprint 12 |
| 2026-01-31 | Created AivoIconBadge for notification indicators                                           | Sprint 12 |
| 2026-01-31 | Implemented AivoIcons abstract class mapping common icons to Lucide equivalents             | Sprint 12 |
| 2026-01-31 | Created aivo_illustrations.dart with SVG and icon-based illustration support                | Sprint 12 |
| 2026-01-31 | Added AivoPresetIllustration factory for common empty states (error, offline, success)      | Sprint 12 |
| 2026-01-31 | Implemented AivoGradeBandIllustration with adaptive visual styles per grade band            | Sprint 12 |
| 2026-01-31 | Created IconPreview widget for design system gallery                                        | Sprint 12 |
