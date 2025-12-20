# AIVO Color System - Cross-Platform Mapping

This document describes the unified color system used across AIVO's web marketing site and Flutter mobile apps.

## Design System Overview

The AIVO design system is built around a cohesive color palette that creates a consistent brand experience across all platforms. The primary colors are derived from the Flutter app themes defined in:

- `libs/flutter-common/lib/theme/aivo_theme.dart` - Core theme with grade band variations
- `apps/mobile-parent/lib/theme/parent_theme.dart` - Parent app specific colors

## Flutter → Web Mapping

### Primary Brand Colors

| Flutter Token             | Hex Value | Web Class          | Usage                                        |
| ------------------------- | --------- | ------------------ | -------------------------------------------- |
| `ColorScheme.primary`     | `#2D6BFF` | `aivo-primary-500` | Primary buttons, links, brand elements       |
| `_k5Colors.secondary`     | `#FF9C32` | `aivo-orange-500`  | CTA buttons, highlights, conversion elements |
| `_ParentColors.secondary` | `#7C3AED` | `aivo-purple-700`  | Parent-focused elements, accents             |
| `_g6_8Colors.secondary`   | `#3FB4A5` | `aivo-teal-500`    | Learner accents, success states              |

### Semantic Colors

| Flutter Token           | Hex Value | Web Class          | Usage                             |
| ----------------------- | --------- | ------------------ | --------------------------------- |
| `_ParentColors.success` | `#16A34A` | `aivo-success-600` | Success states, confirmations     |
| `_ParentColors.warning` | `#D97706` | `aivo-warning-600` | Warning states, cautions          |
| `_ParentColors.error`   | `#DC2626` | `aivo-error-600`   | Error states, destructive actions |

### Surface & Background Colors

| Flutter Token                | Hex Value | Web Class              | Usage                      |
| ---------------------------- | --------- | ---------------------- | -------------------------- |
| `_ParentColors.background`   | `#F8FAFC` | `aivo-gray-50`         | Page backgrounds           |
| `_ParentColors.surface`      | `#FFFFFF` | `aivo-surface`         | Card surfaces              |
| `_ParentColors.surfaceMuted` | `#F1F5F9` | `aivo-gray-100`        | Muted card backgrounds     |
| `surfaceVariant`             | `#EEF5FF` | `aivo-surface-variant` | Subtle variant backgrounds |

### Text Colors

| Flutter Token                 | Hex Value | Web Class       | Usage                       |
| ----------------------------- | --------- | --------------- | --------------------------- |
| `_ParentColors.textPrimary`   | `#0F172A` | `aivo-gray-900` | Headings, body text         |
| `_ParentColors.textSecondary` | `#475569` | `aivo-gray-600` | Secondary text, captions    |
| `_ParentColors.textTertiary`  | `#94A3B8` | `aivo-gray-400` | Tertiary text, placeholders |

## Grade Band Color Variations

AIVO uses age-appropriate color variations across different grade bands:

### K-5 (Kindergarten - 5th Grade)

- **Primary**: `#2D6BFF` - Bright, engaging blue
- **Secondary**: `#FF9C32` - Warm, inviting orange
- **Usage**: Most marketing materials, general audience

### Grades 6-8

- **Primary**: `#2F6AE6` - Slightly deeper blue
- **Secondary**: `#3FB4A5` - Calming teal
- **Usage**: Middle school focused sections

### Grades 9-12

- **Primary**: `#2648A6` - Professional, focused blue
- **Secondary**: `#2E7D74` - Mature teal
- **Usage**: High school focused content

## Usage Examples

### Primary CTA Button (Marketing)

```html
<button
  class="bg-aivo-orange-500 hover:bg-aivo-orange-600 text-white px-8 py-4 rounded-aivo font-semibold shadow-aivo-orange transition-all hover:-translate-y-0.5"
>
  Get Started Free
</button>
```

Or use the component class:

```html
<button class="btn-cta">Get Started Free</button>
```

### Parent-Focused Section

```html
<div class="bg-aivo-purple-50 border border-aivo-purple-200 rounded-aivo-lg p-6">
  <h2 class="text-aivo-purple-700 text-headline font-bold">For Parents</h2>
  <p class="text-aivo-gray-600">Track your child's progress...</p>
</div>
```

### Learner-Focused Section

```html
<div class="bg-aivo-teal-50 border border-aivo-teal-200 rounded-aivo-lg p-6">
  <h2 class="text-aivo-teal-700 text-headline font-bold">For Students</h2>
  <p class="text-aivo-gray-600">Learn at your own pace...</p>
</div>
```

### Card with AIVO Styling

```html
<div class="card-aivo p-6">
  <div class="icon-container-lg bg-aivo-primary-100 text-aivo-primary-600 mb-4">
    <!-- Icon here -->
  </div>
  <h3 class="text-title text-aivo-gray-900 mb-2">Feature Title</h3>
  <p class="text-body text-aivo-gray-600">Feature description...</p>
</div>
```

### Badge Examples

```html
<span class="badge-primary">New</span>
<span class="badge-orange">Popular</span>
<span class="badge-success">Available</span>
<span class="badge-teal">Student</span>
<span class="badge-purple">Parent</span>
```

## Legacy Class Migration

The following mappings maintain backward compatibility:

| Old Class         | New Class             | Notes                                  |
| ----------------- | --------------------- | -------------------------------------- |
| `theme-primary-*` | `aivo-primary-*`      | Remapped from violet to AIVO blue      |
| `coral-*`         | `aivo-orange-*`       | Remapped from coral red to AIVO orange |
| `mint-*`          | `aivo-success-*`      | Remapped to semantic success colors    |
| `sunshine-*`      | `aivo-warning-*`      | Remapped to semantic warning colors    |
| `shadow-purple`   | `shadow-aivo-primary` | Updated shadow color                   |
| `shadow-coral`    | `shadow-aivo-orange`  | Updated shadow color                   |

## Gradients

### AIVO Gradients (New)

- `gradient-aivo-primary`: Blue gradient for brand elements
- `gradient-aivo-cta`: Orange to blue gradient for CTAs
- `gradient-aivo-purple`: Purple gradient for parent sections
- `gradient-aivo-teal`: Teal gradient for learner sections
- `gradient-aivo-hero`: Light blue to white for hero sections
- `gradient-aivo-section`: Light gray to white for sections

### Usage

```html
<div class="bg-gradient-aivo-hero">
  <section class="py-24">
    <h1 class="text-gradient-aivo">Welcome to AIVO</h1>
  </section>
</div>
```

## Shadows

| Shadow Class          | Description    | Use Case              |
| --------------------- | -------------- | --------------------- |
| `shadow-aivo-sm`      | Subtle shadow  | Buttons, small cards  |
| `shadow-aivo`         | Default shadow | Cards, containers     |
| `shadow-aivo-md`      | Medium shadow  | Elevated cards        |
| `shadow-aivo-lg`      | Large shadow   | Modals, dropdowns     |
| `shadow-aivo-xl`      | Extra large    | Hero elements         |
| `shadow-aivo-primary` | Blue glow      | Primary CTAs on hover |
| `shadow-aivo-orange`  | Orange glow    | CTA buttons on hover  |
| `shadow-aivo-purple`  | Purple glow    | Parent-focused CTAs   |

## Border Radius

Aligned with Flutter's 12px standard:

| Class              | Value | Usage                     |
| ------------------ | ----- | ------------------------- |
| `rounded-aivo`     | 12px  | Default (cards, buttons)  |
| `rounded-aivo-lg`  | 16px  | Larger cards              |
| `rounded-aivo-xl`  | 20px  | Modal dialogs             |
| `rounded-aivo-2xl` | 24px  | Hero sections             |
| `rounded-aivo-3xl` | 32px  | Large decorative elements |

## Accessibility

### High Contrast Mode

The design system includes high contrast mode support:

```css
.high-contrast {
  --aivo-primary: 30 64 175; /* Darker blue */
  --aivo-purple: 91 33 182; /* Darker purple */
  --aivo-text-primary: 0 0 0; /* Pure black */
}
```

### Focus States

All interactive elements have consistent focus ring:

```css
:focus-visible {
  outline: 2px solid #2d6bff;
  outline-offset: 2px;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Typography

Font stack aligned with Flutter:

- **Primary**: Inter (matches Flutter's bodyMedium)
- **Display**: Space Grotesk (marketing headlines)
- **Dyslexia-friendly**: Lexend (matches Flutter accessibility option)

### Type Scale

| Class           | Size | Weight | Line Height | Usage            |
| --------------- | ---- | ------ | ----------- | ---------------- |
| `text-display`  | 34px | 700    | 1.2         | Hero headlines   |
| `text-headline` | 28px | 700    | 1.3         | Section headings |
| `text-title`    | 22px | 600    | 1.4         | Card titles      |
| `text-body`     | 17px | 400    | 1.6         | Body text        |
| `text-label`    | 14px | 600    | 1.5         | Labels, badges   |

## Programmatic Access

For JavaScript/TypeScript usage, import from the design tokens:

```typescript
import {
  AivoColors,
  GradeBandColors,
  AivoTypography,
  AivoSpacing,
  AivoBorderRadius,
} from '@/lib/design-tokens';

// Access primary color
const primaryBlue = AivoColors.primary[500]; // '#2D6BFF'

// Access grade band colors
const k5Primary = GradeBandColors.k5.primary; // '#2D6BFF'
const k5Secondary = GradeBandColors.k5.secondary; // '#FF9C32'

// Access typography
const headlineSize = AivoTypography.headline.size; // 28
```

## Related Documentation

- [Flutter Brand Specs](./flutter-brand-specs.md) - Complete Flutter theme documentation
- Flutter Theme Files:
  - `libs/flutter-common/lib/theme/aivo_theme.dart`
  - `apps/mobile-parent/lib/theme/parent_theme.dart`
- Design Tokens: `libs/design-tokens/aivo-tokens.json`
