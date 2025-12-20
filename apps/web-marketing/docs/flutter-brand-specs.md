# AIVO Flutter Brand Specifications

> Extracted from Flutter mobile apps and design tokens in the aivo-platform repository.
>
> **Source Files:**
>
> - `libs/design-tokens/aivo-tokens.json` - Master design tokens
> - `libs/flutter-common/lib/theme/aivo_theme.dart` - Shared theme definitions
> - `apps/mobile-parent/lib/theme/parent_theme.dart` - Parent app theme

---

## Grade Band Theming

AIVO uses **age-appropriate theming** with three grade bands, each with adjusted colors, typography sizes, and spacing:

| Band      | Grades | Font Scale  | Space Scale | Description                             |
| --------- | ------ | ----------- | ----------- | --------------------------------------- |
| **K5**    | K-5    | 1.06x       | 1.08x       | Larger, more vibrant for young learners |
| **G6_8**  | 6-8    | 1.03x       | 1.04x       | Balanced for middle schoolers           |
| **G9_12** | 9-12   | 1.0x (base) | 1.0x (base) | Mature, professional feel               |

---

## Color Palettes

### K-5 (Elementary) Theme

| Token          | Color | Hex Code  | Usage                            |
| -------------- | ----- | --------- | -------------------------------- |
| Primary        | 🔵    | `#2D6BFF` | Main brand color, buttons, links |
| Secondary      | 🟠    | `#FF9C32` | Accent, highlights, gamification |
| Accent         | 🩷    | `#FF5E9C` | Rewards, achievements            |
| Background     | ⬜    | `#F8FBFF` | Page background                  |
| Surface        | ⬜    | `#FFFFFF` | Cards, modals                    |
| Surface Muted  | 🔵    | `#EEF5FF` | Subtle backgrounds               |
| Text Primary   | 🔵    | `#102445` | Main text                        |
| Text Secondary | 🔵    | `#3E5575` | Secondary text                   |
| Success        | 🟢    | `#1FB77A` | Positive feedback                |
| Warning        | 🟡    | `#FFB545` | Caution states                   |
| Error          | 🔴    | `#E64B58` | Error states                     |
| Info           | 🔵    | `#4BA8F5` | Informational                    |
| Border         | 🔵    | `#C8D7FF` | Borders, dividers                |
| Focus          | 🔵    | `#1D4ED8` | Focus rings                      |

### 6-8 (Middle School) Theme

| Token          | Color | Hex Code  | Usage              |
| -------------- | ----- | --------- | ------------------ |
| Primary        | 🔵    | `#2F6AE6` | Main brand color   |
| Secondary      | 🟢    | `#3FB4A5` | Teal accent        |
| Accent         | 🟠    | `#FF7A59` | Highlights         |
| Background     | ⬜    | `#F6F8FC` | Page background    |
| Surface        | ⬜    | `#FFFFFF` | Cards, modals      |
| Surface Muted  | ⬜    | `#EEF1F7` | Subtle backgrounds |
| Text Primary   | 🔵    | `#15243B` | Main text          |
| Text Secondary | 🔵    | `#42526B` | Secondary text     |
| Success        | 🟢    | `#1FA97A` | Positive feedback  |
| Warning        | 🟡    | `#F5A524` | Caution states     |
| Error          | 🔴    | `#D83A52` | Error states       |
| Info           | 🔵    | `#4098F2` | Informational      |
| Border         | ⬜    | `#CBD5E1` | Borders, dividers  |
| Focus          | 🔵    | `#1E40AF` | Focus rings        |

### 9-12 (High School) Theme

| Token          | Color | Hex Code  | Usage              |
| -------------- | ----- | --------- | ------------------ |
| Primary        | 🔵    | `#2648A6` | Main brand color   |
| Secondary      | 🟢    | `#2E7D74` | Teal accent        |
| Accent         | 🩷    | `#C8518B` | Highlights         |
| Background     | ⬜    | `#F5F6F8` | Page background    |
| Surface        | ⬜    | `#FFFFFF` | Cards, modals      |
| Surface Muted  | ⬜    | `#ECEFF3` | Subtle backgrounds |
| Text Primary   | 🔵    | `#0F172A` | Main text          |
| Text Secondary | 🔵    | `#3C4A67` | Secondary text     |
| Success        | 🟢    | `#1C9B6C` | Positive feedback  |
| Warning        | 🟡    | `#F19D38` | Caution states     |
| Error          | 🔴    | `#CC3D4A` | Error states       |
| Info           | 🔵    | `#3C87E0` | Informational      |
| Border         | ⬜    | `#C2C8D3` | Borders, dividers  |
| Focus          | 🔵    | `#1E3A8A` | Focus rings        |

### Parent App Theme

| Token          | Color | Hex Code  | Usage              |
| -------------- | ----- | --------- | ------------------ |
| Primary        | 🔵    | `#2563EB` | Professional blue  |
| Secondary      | 🟣    | `#7C3AED` | Purple accent      |
| Background     | ⬜    | `#F8FAFC` | Page background    |
| Surface        | ⬜    | `#FFFFFF` | Cards, modals      |
| Surface Muted  | ⬜    | `#F1F5F9` | Subtle backgrounds |
| Text Primary   | 🔵    | `#0F172A` | Main text          |
| Text Secondary | ⬜    | `#475569` | Secondary text     |
| Success        | 🟢    | `#16A34A` | Positive feedback  |
| Warning        | 🟡    | `#D97706` | Caution states     |
| Error          | 🔴    | `#DC2626` | Error states       |

---

## Neutral Color Scale

Base neutral palette used across all themes:

| Token       | Hex Code  | RGB           |
| ----------- | --------- | ------------- |
| Neutral 50  | `#F8FAFD` | 248, 250, 253 |
| Neutral 100 | `#F1F4F9` | 241, 244, 249 |
| Neutral 200 | `#E3E8F0` | 227, 232, 240 |
| Neutral 300 | `#D3DAE6` | 211, 218, 230 |
| Neutral 400 | `#A7B3C8` | 167, 179, 200 |
| Neutral 500 | `#7C8AA3` | 124, 138, 163 |
| Neutral 600 | `#5C6880` | 92, 104, 128  |
| Neutral 700 | `#3F4B60` | 63, 75, 96    |
| Neutral 800 | `#283446` | 40, 52, 70    |
| Neutral 900 | `#1A2330` | 26, 35, 48    |

---

## Typography

### Font Families

| Type                 | Font                      | Fallbacks                            |
| -------------------- | ------------------------- | ------------------------------------ |
| Default              | **Inter**                 | system-ui, -apple-system, sans-serif |
| Dyslexia-Friendly    | **Atkinson Hyperlegible** | Inter, sans-serif                    |
| Alternate (Dyslexia) | **Lexend**                | Via Google Fonts                     |

### Font Size Scale by Grade Band

| Style    | K-5  | 6-8  | 9-12 | Weight                  |
| -------- | ---- | ---- | ---- | ----------------------- |
| Display  | 36px | 34px | 32px | 700 (Bold)              |
| Headline | 30px | 28px | 26px | 700 (Bold)              |
| Title    | 24px | 22px | 20px | 700/600 (Bold/SemiBold) |
| Body     | 18px | 17px | 16px | 500 (Medium)            |
| Label    | 14px | 14px | 13px | 600 (SemiBold)          |
| Caption  | 12px | 12px | 11px | 400 (Regular)           |

### Line Heights by Grade Band

| Style    | K-5  | 6-8  | 9-12 |
| -------- | ---- | ---- | ---- |
| Display  | 44px | 42px | 40px |
| Headline | 38px | 36px | 34px |
| Title    | 30px | 30px | 28px |
| Body     | 26px | 25px | 24px |
| Label    | 18px | 18px | 18px |
| Caption  | 16px | 16px | 16px |

### Font Weights

| Weight   | Value | Usage                   |
| -------- | ----- | ----------------------- |
| Regular  | 400   | Body text, captions     |
| Medium   | 500   | Body text emphasis      |
| SemiBold | 600   | Labels, buttons, titles |
| Bold     | 700   | Headlines, display text |

---

## Spacing Scale

Base spacing unit: **4px**

| Token   | Value | Usage          |
| ------- | ----- | -------------- |
| space-0 | 0px   | None           |
| space-1 | 4px   | Minimal        |
| space-2 | 8px   | Tight          |
| space-3 | 12px  | Compact        |
| space-4 | 16px  | Default        |
| space-5 | 20px  | Comfortable    |
| space-6 | 24px  | Loose          |
| space-7 | 32px  | Section gaps   |
| space-8 | 40px  | Large sections |

---

## Border Radius

| Token       | Value | Usage                    |
| ----------- | ----- | ------------------------ |
| radius-xs   | 2px   | Subtle rounding          |
| radius-sm   | 4px   | Small elements           |
| radius-md   | 8px   | Default cards            |
| radius-lg   | 12px  | Buttons, cards (primary) |
| radius-xl   | 16px  | Large cards, modals      |
| radius-pill | 999px | Pills, tags, full round  |

---

## Shadows & Elevation

### Shadow Definitions

| Name   | X   | Y    | Blur | Spread | Color                  |
| ------ | --- | ---- | ---- | ------ | ---------------------- |
| Soft   | 0   | 8px  | 24px | 0      | rgba(26, 39, 58, 0.12) |
| Raised | 0   | 10px | 32px | 0      | rgba(26, 39, 58, 0.18) |

### Elevation Levels

| Level   | Shadow               | Usage                   |
| ------- | -------------------- | ----------------------- |
| Level 1 | Soft                 | Cards, subtle elevation |
| Level 2 | Raised               | Modals, dropdowns       |
| Overlay | Raised (92% opacity) | Full-screen overlays    |

---

## Motion & Animation

### Duration

| Token | Standard | Reduced Motion |
| ----- | -------- | -------------- |
| Fast  | 120ms    | 0ms            |
| Base  | 200ms    | 0ms            |
| Slow  | 320ms    | 120ms          |

### Easing

| Name       | Value                          | Usage                |
| ---------- | ------------------------------ | -------------------- |
| Standard   | `cubic-bezier(0.2, 0, 0, 1)`   | Default transitions  |
| Emphasized | `cubic-bezier(0.3, 0, 0.2, 1)` | Important animations |
| Reduced    | `linear`                       | Accessibility mode   |

---

## Accessibility Features

### Supported Modes

| Feature                | Support | Implementation                 |
| ---------------------- | ------- | ------------------------------ |
| High Contrast          | ✅ Yes  | Darker colors, thicker borders |
| Dyslexia-Friendly Font | ✅ Yes  | Lexend / Atkinson Hyperlegible |
| Reduced Motion         | ✅ Yes  | Shorter/disabled animations    |
| Text Scaling           | ✅ Yes  | 0.8x - 1.5x range              |

### High Contrast Adjustments

- Primary colors: Darker variants (e.g., `#2D6BFF` → `#0F3FB5`)
- Borders: Increased width (1px → 2px)
- Focus rings: More visible
- Text: Higher contrast ratios

---

## Button Specifications

| Property             | Value          |
| -------------------- | -------------- |
| Border Radius        | 12px           |
| Padding (Horizontal) | 16-20px        |
| Padding (Vertical)   | 12-14px        |
| Min Touch Target     | 48x48px        |
| Font Weight          | 600 (SemiBold) |

---

## Card Specifications

| Property             | Value                 |
| -------------------- | --------------------- |
| Border Radius        | 12px                  |
| Background           | `#FFFFFF` (surface)   |
| Elevation            | Level 1 (soft shadow) |
| High Contrast Border | 1px solid `#CBD5E1`   |

---

## Input Field Specifications

| Property      | Value                           |
| ------------- | ------------------------------- |
| Border Radius | 12px                            |
| Border Width  | 1px (2px focused/high-contrast) |
| Border Color  | `#CBD5E1`                       |
| Focus Border  | Primary color, 2px              |
| Padding       | 16px horizontal, 14px vertical  |
| Background    | Surface muted (50% opacity)     |

---

## Implementation Notes

### Flutter Usage

```dart
// Access theme via provider
final theme = ref.watch(parentThemeProvider);

// Or use grade-band theme
final theme = themeForBand(AivoGradeBand.k5);

// Access AivoColors extension
final colors = Theme.of(context).extension<AivoColors>();
```

### Web Mapping

These tokens map to Tailwind CSS classes in the web marketing site:

| Flutter Token           | Tailwind Class               |
| ----------------------- | ---------------------------- |
| primary (#2D6BFF)       | `theme-primary-500`          |
| secondary (#FF9C32)     | `coral-500` / `sunshine-500` |
| success (#1FB77A)       | `mint-500`                   |
| error (#E64B58)         | `red-500`                    |
| textPrimary (#102445)   | `gray-900`                   |
| textSecondary (#3E5575) | `gray-600`                   |

---

## Files Reference

| File             | Location                                                    | Purpose                  |
| ---------------- | ----------------------------------------------------------- | ------------------------ |
| Design Tokens    | `libs/design-tokens/aivo-tokens.json`                       | Master token definitions |
| Aivo Theme       | `libs/flutter-common/lib/theme/aivo_theme.dart`             | Shared Flutter theme     |
| Parent Theme     | `apps/mobile-parent/lib/theme/parent_theme.dart`            | Parent app specific      |
| Grade Controller | `libs/flutter-common/lib/theme/grade_theme_controller.dart` | Grade band switching     |

---

_Last Updated: December 2024_
